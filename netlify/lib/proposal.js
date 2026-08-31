const { createHash } = require('node:crypto');
const { verifyMessage } = require('ethers');
const { isAddress } = require('./market');

const MAX_CLOCK_AGE_MS = 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_LIST_RESULTS = 50;

class ProposalError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function proposalMessage(proposal) {
  return [
    'Ethscribe Expedition Proposal',
    `Schema: ${proposal.schemaVersion}`,
    `Title: ${proposal.title}`,
    `Target: ${proposal.target}`,
    `Why it matters: ${proposal.rationale}`,
    `Starting source: ${proposal.source}`,
    `Author: ${proposal.authorAddress}`,
    `Created at: ${proposal.createdAt}`,
  ].join('\n');
}

function assertString(value, field, maximum) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || value.length > maximum) {
    throw new ProposalError(400, 'invalid_proposal', `${field} is invalid.`);
  }
}

function validateProposal(proposal, now = Date.now()) {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw new ProposalError(400, 'invalid_proposal', 'The expedition proposal is missing.');
  }
  if (proposal.schemaVersion !== 1 || proposal.documentType !== 'expedition-proposal') {
    throw new ProposalError(400, 'invalid_proposal', 'The proposal schema is not supported.');
  }
  assertString(proposal.title, 'title', 120);
  assertString(proposal.target, 'target', 1_200);
  assertString(proposal.rationale, 'rationale', 1_200);
  assertString(proposal.source, 'source', 2_048);
  if (!isAddress(proposal.authorAddress) || proposal.authorAddress !== proposal.authorAddress.toLowerCase()) {
    throw new ProposalError(400, 'invalid_author', 'The proposal author is invalid.');
  }
  let source;
  try {
    source = new URL(proposal.source);
  } catch {
    throw new ProposalError(400, 'invalid_source', 'The starting source URL is invalid.');
  }
  if (!['https:', 'http:'].includes(source.protocol)) {
    throw new ProposalError(400, 'invalid_source', 'The starting source must use HTTP or HTTPS.');
  }
  const createdAt = Date.parse(proposal.createdAt);
  if (!Number.isFinite(createdAt) || createdAt < now - MAX_CLOCK_AGE_MS || createdAt > now + MAX_FUTURE_SKEW_MS) {
    throw new ProposalError(400, 'stale_proposal', 'The signed proposal has expired. Prepare it again.');
  }
  return proposal;
}

function storageConfig(env = process.env) {
  const account = env.AZURE_STORAGE_ACCOUNT_NAME;
  const container = env.AZURE_STORAGE_CONTAINER;
  const sas = env.AZURE_STORAGE_SAS_TOKEN;
  if (!/^[a-z0-9]{3,24}$/.test(account || '') || !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(container || '') || !sas) {
    throw new ProposalError(503, 'storage_unavailable', 'The public proposal notebook is not configured.');
  }
  return { account, container, sas: sas.replace(/^\?/, '') };
}

function encodeBlobPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function blobBaseUrl(config) {
  return `https://${config.account}.blob.core.windows.net/${config.container}`;
}

async function storeProposal(path, record, fetchImpl = fetch, env = process.env) {
  const config = storageConfig(env);
  const response = await fetchImpl(`${blobBaseUrl(config)}/${encodeBlobPath(path)}?${config.sas}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'if-none-match': '*',
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-version': '2023-11-03',
    },
    body: JSON.stringify(record, null, 2),
  });
  if ([409, 412].includes(response.status)) {
    throw new ProposalError(409, 'proposal_exists', 'This signed proposal is already in the notebook.');
  }
  if (!response.ok) throw new ProposalError(503, 'storage_unavailable', 'The proposal could not be stored.');
}

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

async function listProposals(fetchImpl = fetch, env = process.env, limit = MAX_LIST_RESULTS) {
  const config = storageConfig(env);
  const boundedLimit = Math.min(Math.max(Number(limit) || MAX_LIST_RESULTS, 1), MAX_LIST_RESULTS);
  const listUrl = `${blobBaseUrl(config)}?restype=container&comp=list&prefix=${encodeURIComponent('proposals/')}&maxresults=5000&${config.sas}`;
  const listResponse = await fetchImpl(listUrl, { headers: { 'x-ms-version': '2023-11-03' } });
  if (!listResponse.ok) {
    throw new ProposalError(503, 'storage_unavailable', 'The public proposal notebook could not be read.');
  }
  const xml = await listResponse.text();
  const names = Array.from(xml.matchAll(/<Name>([\s\S]*?)<\/Name>/g), (match) => decodeXml(match[1]))
    .filter((name) => /^proposals\/[0-9TZ.-]+--[a-f0-9]{16}\.json$/.test(name))
    .reverse()
    .slice(0, boundedLimit);

  const records = await Promise.all(names.map(async (name) => {
    const response = await fetchImpl(`${blobBaseUrl(config)}/${encodeBlobPath(name)}?${config.sas}`, {
      headers: { accept: 'application/json', 'x-ms-version': '2023-11-03' },
    });
    if (!response.ok) return null;
    const record = await response.json().catch(() => null);
    if (record?.documentType !== 'published-expedition-proposal') return null;
    return record;
  }));

  return records.filter(Boolean).sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

async function verifyAndStoreProposal(payload, dependencies = {}) {
  const { proposal, message, signature } = payload || {};
  validateProposal(proposal, dependencies.now ?? Date.now());
  const expectedMessage = proposalMessage(proposal);
  if (message !== expectedMessage) {
    throw new ProposalError(400, 'message_mismatch', 'The signed message does not match the proposal.');
  }
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature || '')) {
    throw new ProposalError(400, 'invalid_signature', 'The proposal signature is invalid.');
  }
  let recovered;
  try {
    recovered = verifyMessage(message, signature).toLowerCase();
  } catch {
    throw new ProposalError(400, 'invalid_signature', 'The proposal signature could not be recovered.');
  }
  if (recovered !== proposal.authorAddress) {
    throw new ProposalError(403, 'wrong_signer', 'The proposal was not signed by its named author.');
  }

  const digest = createHash('sha256').update(message).digest('hex');
  const proposalId = `proposal-${digest.slice(0, 16)}`;
  const submittedAt = new Date(dependencies.now ?? Date.now()).toISOString();
  const timestamp = proposal.createdAt.replaceAll(':', '-');
  const storagePath = `proposals/${timestamp}--${digest.slice(0, 16)}.json`;
  const record = {
    schemaVersion: 1,
    documentType: 'published-expedition-proposal',
    proposalId,
    ...proposal,
    message,
    signature,
    submittedAt,
    status: 'proposed',
  };
  const putProposal = dependencies.storeProposal || storeProposal;
  await putProposal(storagePath, record, dependencies.fetchImpl || fetch, dependencies.env || process.env);
  return record;
}

module.exports = {
  ProposalError,
  listProposals,
  proposalMessage,
  storeProposal,
  validateProposal,
  verifyAndStoreProposal,
};
