const { createHash } = require('node:crypto');
const { verifyMessage } = require('ethers');
const { getWalletInventory, isAddress, isEthscriptionId, MARKET_ADDRESS } = require('./market');

const EXPEDITION_ID = 'lost-pixels-of-satoshi';
const MAX_CLOCK_AGE_MS = 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const HASH_PATTERN = /^0x[a-f0-9]{64}$/;

const TARGETS = Object.freeze({
  'november-single-xpm': ['image/x-xpixmap', 'bfc746462cabcd70c1f9fa909065bdd1b2fb4e73f5904de38c7c8c8326bb34b4', 9215],
  'november-16-xpm': ['image/x-xpixmap', '6c51c501f1edeb6d4003af3feead10532b21a1a3aa8f82916eb03f969377eb84', 3585],
  'november-20-xpm': ['image/x-xpixmap', '0e3a022e6539a78827bdbe8fb5eb575cc2c96a1d97f0f8a57d2a2bd6ac18e097', 4193],
  'november-32-xpm': ['image/x-xpixmap', 'a5d5772caa050fc704c959296be88c0f50dc8b2aef8bf806fee742d567bf7f6d', 5249],
  'november-48-xpm': ['image/x-xpixmap', '534d52cb11f11d21ac0ba08a91d0c3e39ab8a9265c9eccb27b0ab016e8f73a3e', 8775],
  'const-16-xpm': ['image/x-xpixmap', 'cc2099df026dba0eea686cda331bbc3e67198d1c318e486be1e6242802deb812', 3591],
  'const-20-xpm': ['image/x-xpixmap', '6655ce1739c8d24c180285676075cff2a31c8baa78c14dbd131a562b29c89069', 4199],
  'const-32-xpm': ['image/x-xpixmap', '594dd453e105d602e0cac7071d9bf7d301f4f70b6d18e806ef47a5712559831a', 5255],
  'const-48-xpm': ['image/x-xpixmap', '46434c6da627f9f9fd65a08ade4831fad72b77b71471101b2dde6fba4391d852', 8781],
  'full-size-png': ['image/png', 'ce271869e6f41179a5db12e4f978dae4bd98c9d88a5d4434511a35ff6bdf6413', 165329],
  'june-16-xpm': ['image/x-xpixmap', '2425da94f97723bf54a7692783bf06d19c6ac17165de3370266f032943cc3f52', 3847],
  'june-20-xpm': ['image/x-xpixmap', '8b484f3cfcdbf06b4393bb62ded498765955354821708a8252a86934ac21f0dc', 3143],
  'june-32-xpm': ['image/x-xpixmap', 'b746bbbf5ae0e315f678364dfe982c57eeb0a1307ab8bf147e964645c79f8f23', 5399],
  'june-48-xpm': ['image/x-xpixmap', 'fad7e0aedf90288bab0e4b68a674207cd763d5d64f1c59687fe355b84d09e7ea', 8487],
  'june-80-xpm': ['image/x-xpixmap', '61277aa49c281f05048cfa8c15f46ed02fa2ea8704eb54a4455c83951c151838', 16535],
  'lost-bc-png': ['image/png', null, null],
});

class FindingError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function sha256(value) {
  return `0x${createHash('sha256').update(value).digest('hex')}`;
}

function assignmentMessage(assignment) {
  return [
    'Ethscribe Finding Assignment',
    `Schema: ${assignment.schemaVersion}`,
    `Expedition: ${assignment.expeditionId}`,
    `Target: ${assignment.targetId}`,
    `Ethscription: ${assignment.ethscriptionId}`,
    `Raw SHA-256: ${assignment.rawSha256}`,
    `Protocol SHA-256: ${assignment.protocolContentSha256}`,
    `Byte length: ${assignment.byteLength}`,
    `Data URI prefix: ${assignment.dataUriPrefix}`,
    `Author: ${assignment.authorAddress}`,
    `Custody contract: ${assignment.custodyContract}`,
    `Created at: ${assignment.createdAt}`,
    `Claim: ${assignment.claimSummary}`,
    `Source: ${assignment.sourceReferences[0]}`,
  ].join('\n');
}

function assertString(value, field, maximum) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new FindingError(400, 'invalid_assignment', `${field} is invalid.`);
  }
}

function validateAssignment(assignment, now = Date.now()) {
  if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) {
    throw new FindingError(400, 'invalid_assignment', 'The Finding assignment is missing.');
  }
  if (assignment.schemaVersion !== 1 || assignment.documentType !== 'finding') {
    throw new FindingError(400, 'invalid_assignment', 'The Finding schema is not supported.');
  }
  if (assignment.expeditionId !== EXPEDITION_ID || !TARGETS[assignment.targetId]) {
    throw new FindingError(400, 'invalid_target', 'The expedition target is not open for submissions.');
  }
  if (!isEthscriptionId(assignment.ethscriptionId) || assignment.ethscriptionId !== assignment.ethscriptionId.toLowerCase()) {
    throw new FindingError(400, 'invalid_ethscription', 'The Ethscription ID is invalid.');
  }
  if (!isAddress(assignment.authorAddress) || assignment.authorAddress !== assignment.authorAddress.toLowerCase()) {
    throw new FindingError(400, 'invalid_author', 'The author address is invalid.');
  }
  if (assignment.custodyContract !== MARKET_ADDRESS.toLowerCase()) {
    throw new FindingError(400, 'invalid_custody', 'The Finding does not name the Ethscribe market.');
  }
  if (!HASH_PATTERN.test(assignment.rawSha256) || !HASH_PATTERN.test(assignment.protocolContentSha256)) {
    throw new FindingError(400, 'invalid_hash', 'The Finding hashes are invalid.');
  }
  if (!Number.isSafeInteger(assignment.byteLength) || assignment.byteLength <= 0 || assignment.byteLength > 500_000) {
    throw new FindingError(400, 'invalid_size', 'The Finding byte length is invalid.');
  }
  assertString(assignment.filename, 'filename', 255);
  assertString(assignment.claimSummary, 'claimSummary', 500);
  if (!Array.isArray(assignment.sourceReferences) || assignment.sourceReferences.length !== 1) {
    throw new FindingError(400, 'invalid_source', 'Exactly one primary source is required.');
  }
  assertString(assignment.sourceReferences[0], 'sourceReferences', 2048);
  let source;
  try {
    source = new URL(assignment.sourceReferences[0]);
  } catch {
    throw new FindingError(400, 'invalid_source', 'The primary source URL is invalid.');
  }
  if (!['https:', 'http:'].includes(source.protocol)) {
    throw new FindingError(400, 'invalid_source', 'The primary source must use HTTP or HTTPS.');
  }

  const createdAt = Date.parse(assignment.createdAt);
  if (!Number.isFinite(createdAt) || createdAt < now - MAX_CLOCK_AGE_MS || createdAt > now + MAX_FUTURE_SKEW_MS) {
    throw new FindingError(400, 'stale_assignment', 'The signed Finding has expired. Prepare a new assignment.');
  }

  const [mediaType, expectedRawHash, expectedByteLength] = TARGETS[assignment.targetId];
  const expectedPrefix = `data:${mediaType};base64,`;
  if (assignment.dataUriPrefix !== expectedPrefix) {
    throw new FindingError(400, 'wrong_wrapper', `This target requires the exact ${expectedPrefix} wrapper.`);
  }
  if (expectedRawHash && assignment.rawSha256 !== `0x${expectedRawHash}`) {
    throw new FindingError(400, 'target_mismatch', 'The decoded bytes do not match the frozen target hash.');
  }
  if (expectedByteLength && assignment.byteLength !== expectedByteLength) {
    throw new FindingError(400, 'target_mismatch', 'The decoded byte length does not match the frozen target.');
  }

  return { mediaType, expectedPrefix };
}

function decodeVerifiedContentUri(contentUri, expectedPrefix) {
  if (typeof contentUri !== 'string' || !contentUri.startsWith(expectedPrefix)) {
    throw new FindingError(409, 'indexer_mismatch', 'The indexed Ethscription does not use the frozen target wrapper.');
  }
  const encoded = contentUri.slice(expectedPrefix.length);
  if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw new FindingError(409, 'indexer_mismatch', 'The indexed Ethscription payload is not canonical base64.');
  }
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length === 0 || decoded.toString('base64') !== encoded) {
    throw new FindingError(409, 'indexer_mismatch', 'The indexed Ethscription payload could not be decoded exactly.');
  }
  return decoded;
}

function hasExpectedFileSignature(bytes, mediaType) {
  if (mediaType === 'image/png') {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return bytes.length >= png.length && bytes.subarray(0, png.length).equals(png);
  }
  if (mediaType === 'image/x-xpixmap') return bytes.subarray(0, 512).toString('utf8').includes('XPM');
  return true;
}

function indexerUrl() {
  return (process.env.ETHSCRIPTIONS_API_URL || 'https://api.ethscriptions.com/v2').replace(/\/$/, '');
}

async function fetchEthscription(ethscriptionId, fetchImpl = fetch) {
  const response = await fetchImpl(`${indexerUrl()}/ethscriptions/${ethscriptionId}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new FindingError(503, 'indexer_unavailable', 'The official Ethscriptions record could not be verified.');
  const payload = await response.json();
  return payload.result || payload;
}

function storageConfig(env = process.env) {
  const account = env.AZURE_STORAGE_ACCOUNT_NAME;
  const container = env.AZURE_STORAGE_CONTAINER;
  const sas = env.AZURE_STORAGE_SAS_TOKEN;
  if (!/^[a-z0-9]{3,24}$/.test(account || '') || !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(container || '') || !sas) {
    throw new FindingError(503, 'storage_unavailable', 'Finding storage is not configured.');
  }
  return { account, container, sas: sas.replace(/^\?/, '') };
}

function encodeBlobPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function storeFinding(path, record, fetchImpl = fetch, env = process.env) {
  const { account, container, sas } = storageConfig(env);
  const url = `https://${account}.blob.core.windows.net/${container}/${encodeBlobPath(path)}?${sas}`;
  const response = await fetchImpl(url, {
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
    throw new FindingError(409, 'finding_exists', 'This Ethscription is already assigned to this target.');
  }
  if (!response.ok) throw new FindingError(503, 'storage_unavailable', 'The verified Finding could not be stored.');
}

async function verifyAndStoreFinding(payload, dependencies = {}) {
  const { assignment, message, signature } = payload || {};
  const { expectedPrefix, mediaType } = validateAssignment(assignment, dependencies.now ?? Date.now());
  const expectedMessage = assignmentMessage(assignment);
  if (message !== expectedMessage) {
    throw new FindingError(400, 'message_mismatch', 'The signed message does not match the Finding assignment.');
  }
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature || '')) {
    throw new FindingError(400, 'invalid_signature', 'The Finding signature is invalid.');
  }

  let recovered;
  try {
    recovered = verifyMessage(message, signature).toLowerCase();
  } catch {
    throw new FindingError(400, 'invalid_signature', 'The Finding signature could not be recovered.');
  }
  if (recovered !== assignment.authorAddress) {
    throw new FindingError(403, 'wrong_signer', 'The Finding was not signed by its named author.');
  }

  const fetchImpl = dependencies.fetchImpl || fetch;
  const getInventory = dependencies.getWalletInventory || getWalletInventory;
  const record = await fetchEthscription(assignment.ethscriptionId, fetchImpl);
  if (record.transaction_hash?.toLowerCase() !== assignment.ethscriptionId
    || record.content_sha?.toLowerCase() !== assignment.protocolContentSha256
    || record.current_owner?.toLowerCase() !== MARKET_ADDRESS.toLowerCase()
    || record.previous_owner?.toLowerCase() !== assignment.authorAddress) {
    throw new FindingError(409, 'indexer_mismatch', 'The official Ethscription record does not match the signed Finding and market custody.');
  }
  if (typeof record.content_uri !== 'string') {
    throw new FindingError(409, 'indexer_mismatch', 'The official Ethscription record does not expose its complete content URI.');
  }
  if (sha256(Buffer.from(record.content_uri, 'utf8')) !== assignment.protocolContentSha256) {
    throw new FindingError(409, 'indexer_mismatch', 'The indexed protocol content hash could not be reproduced.');
  }
  const rawBytes = decodeVerifiedContentUri(record.content_uri, expectedPrefix);
  if (!hasExpectedFileSignature(rawBytes, mediaType)) {
    throw new FindingError(409, 'file_signature_mismatch', `The decoded bytes do not have a valid ${mediaType} file signature.`);
  }
  if (rawBytes.length !== assignment.byteLength || sha256(rawBytes) !== assignment.rawSha256) {
    throw new FindingError(409, 'raw_hash_mismatch', 'The decoded onchain bytes do not match the signed Finding.');
  }

  const inventory = await getInventory(assignment.authorAddress);
  const escrow = inventory.escrow?.find((item) => item.transactionHash?.toLowerCase() === assignment.ethscriptionId);
  if (!escrow?.custody?.verified) {
    throw new FindingError(409, 'custody_unverified', 'Contract and indexer custody are not yet reconciled.');
  }

  const findingId = `${assignment.targetId}--${assignment.ethscriptionId.slice(2)}`;
  const storagePath = `hunts/${assignment.expeditionId}/findings/${findingId}/finding.json`;
  const storedRecord = {
    schemaVersion: 1,
    documentType: 'verified-finding',
    findingId,
    assignment,
    message,
    signature,
    verifiedAt: new Date(dependencies.now ?? Date.now()).toISOString(),
    verification: {
      signature: 'verified',
      officialEthscriptionRecord: 'verified',
      frozenTargetWrapper: expectedPrefix,
      decodedRawSha256: assignment.rawSha256,
      marketCustody: 'verified',
    },
  };
  const putFinding = dependencies.storeFinding || storeFinding;
  await putFinding(storagePath, storedRecord, fetchImpl, dependencies.env || process.env);
  return { findingId, storagePath, verifiedAt: storedRecord.verifiedAt };
}

module.exports = {
  EXPEDITION_ID,
  FindingError,
  TARGETS,
  assignmentMessage,
  decodeVerifiedContentUri,
  fetchEthscription,
  storeFinding,
  hasExpectedFileSignature,
  validateAssignment,
  verifyAndStoreFinding,
};
