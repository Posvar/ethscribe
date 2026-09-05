const { createHash } = require('node:crypto');
const { verifyMessage } = require('ethers');
const { fetchBoundedJson, fetchBoundedText } = require('./boundedFetch');
const { getArtifactMarket, isAddress, isEthscriptionId, MARKET_ADDRESS } = require('./market');
const {
  EXPEDITION_ID,
  TargetCommitmentError,
  targetSpec,
  verifyTargetCandidate,
} = require('./targetCommitments');

const MAX_CLOCK_AGE_MS = 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_LIST_RESULTS = 50;
const FINDING_READ_CONCURRENCY = 6;
const MAX_FINDING_BYTES = 500_000;
const MAX_RECORD_RESPONSE_BYTES = 1_000_000;
const MAX_LIST_PAGE_BYTES = 8_000_000;
const HASH_PATTERN = /^0x[a-f0-9]{64}$/;
// A local upload name is not signed. Display names belong to the target record,
// so renaming an upload cannot change the public identity of a verified file.
const TARGET_FILENAMES = Object.freeze({
  'november-single-xpm': 'bitcoin.xpm',
  'november-16-xpm': 'bitcoin16.xpm',
  'november-20-xpm': 'bitcoin20.xpm',
  'november-32-xpm': 'bitcoin32.xpm',
  'november-48-xpm': 'bitcoin48.xpm',
  'const-16-xpm': 'bitcoin16.xpm',
  'const-20-xpm': 'bitcoin20.xpm',
  'const-32-xpm': 'bitcoin32.xpm',
  'const-48-xpm': 'bitcoin48.xpm',
  'full-size-png': 'bitcoin530.png',
  'june-16-xpm': 'bitcoin16.xpm',
  'june-20-xpm': 'bitcoin20.xpm',
  'june-32-xpm': 'bitcoin32.xpm',
  'june-48-xpm': 'bitcoin48.xpm',
  'june-80-xpm': 'bitcoin80.xpm',
  'lost-bc-png': 'bitcoin20x20.png',
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

function validateAssignment(assignment, now = Date.now(), env = process.env) {
  if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) {
    throw new FindingError(400, 'invalid_assignment', 'The Finding assignment is missing.');
  }
  if (assignment.schemaVersion !== 1 || assignment.documentType !== 'finding') {
    throw new FindingError(400, 'invalid_assignment', 'The Finding schema is not supported.');
  }
  if (assignment.expeditionId !== EXPEDITION_ID) {
    throw new FindingError(400, 'invalid_target', 'The expedition target is not open for submissions.');
  }
  let spec;
  try {
    spec = targetSpec(assignment.targetId);
  } catch (error) {
    if (error instanceof TargetCommitmentError) {
      throw new FindingError(error.statusCode, error.code, error.message);
    }
    throw error;
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
  if (!Number.isSafeInteger(assignment.byteLength) || assignment.byteLength <= 0 || assignment.byteLength > MAX_FINDING_BYTES) {
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

  const { mediaType } = spec;
  const expectedPrefix = `data:${mediaType};base64,`;
  if (assignment.dataUriPrefix !== expectedPrefix) {
    throw new FindingError(400, 'wrong_wrapper', `This target requires the exact ${expectedPrefix} wrapper.`);
  }
  try {
    const result = verifyTargetCandidate(assignment, env);
    if (!result.eligible) {
      throw new FindingError(400, 'target_mismatch', 'The decoded bytes do not match the sealed target commitment.');
    }
  } catch (error) {
    if (error instanceof FindingError) throw error;
    if (error instanceof TargetCommitmentError) {
      throw new FindingError(error.statusCode, error.code, error.message);
    }
    throw error;
  }

  return { mediaType, expectedPrefix };
}

function decodeVerifiedContentUri(contentUri, expectedPrefix) {
  if (typeof contentUri !== 'string' || !contentUri.startsWith(expectedPrefix)) {
    throw new FindingError(409, 'indexer_mismatch', 'The indexed Ethscription does not use the frozen target wrapper.');
  }
  const encoded = contentUri.slice(expectedPrefix.length);
  if (encoded.length > 4 * Math.ceil(MAX_FINDING_BYTES / 3)) {
    throw new FindingError(409, 'invalid_size', 'The indexed Finding exceeds the supported byte limit.');
  }
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
  try {
    const payload = await fetchBoundedJson(`${indexerUrl()}/ethscriptions/${ethscriptionId}`, {
      headers: { accept: 'application/json' },
      maxBytes: MAX_RECORD_RESPONSE_BYTES,
    }, fetchImpl);
    return payload.result || payload;
  } catch {
    throw new FindingError(503, 'indexer_unavailable', 'The official Ethscriptions record could not be verified.');
  }
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

function blobBaseUrl(config) {
  return `https://${config.account}.blob.core.windows.net/${config.container}`;
}

async function storeFinding(path, record, fetchImpl = fetch, env = process.env) {
  const config = storageConfig(env);
  const url = `${blobBaseUrl(config)}/${encodeBlobPath(path)}?${config.sas}`;
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

function decodeXml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function publicFinding(record) {
  const assignment = record?.assignment;
  if (record?.documentType !== 'verified-finding' || assignment?.expeditionId !== EXPEDITION_ID) return null;
  if (!Object.hasOwn(TARGET_FILENAMES, assignment.targetId)) return null;
  try {
    const spec = targetSpec(assignment.targetId);
    return {
      findingId: record.findingId,
      expeditionId: assignment.expeditionId,
      targetId: assignment.targetId,
      validationMode: spec.validationMode,
      ethscriptionId: assignment.ethscriptionId,
      rawSha256: assignment.rawSha256,
      protocolContentSha256: assignment.protocolContentSha256,
      filename: TARGET_FILENAMES[assignment.targetId],
      byteLength: assignment.byteLength,
      authorAddress: assignment.authorAddress,
      ethscriptionCreator: record.verification?.ethscriptionCreator || null,
      ethscriptionTimestamp: record.verification?.ethscriptionTimestamp || null,
      ethscriptionNumber: record.verification?.ethscriptionNumber ?? null,
      sourceUrl: assignment.sourceReferences?.[0] || '',
      claimSummary: assignment.claimSummary,
      contentUri: record.verification?.indexedContentUri || '',
      verifiedAt: record.verifiedAt,
    };
  } catch {
    return null;
  }
}

async function listFindings(fetchImpl = fetch, env = process.env, limit = MAX_LIST_RESULTS) {
  const config = storageConfig(env);
  const boundedLimit = Math.min(Math.max(Math.floor(Number(limit)) || MAX_LIST_RESULTS, 1), MAX_LIST_RESULTS);
  const prefix = `hunts/${EXPEDITION_ID}/findings/`;
  const exactEntries = new Map();
  let candidateEntries = [];
  let marker = '';
  const seenMarkers = new Set();

  // Azure returns blob names in lexical order, not submission order. Walk every
  // metadata page before limiting candidates; otherwise an active recovery hunt
  // can displace permanent exact matches, including those on later pages.
  do {
    const continuation = marker ? `&marker=${encodeURIComponent(marker)}` : '';
    const listUrl = `${blobBaseUrl(config)}?restype=container&comp=list&prefix=${encodeURIComponent(prefix)}&maxresults=5000${continuation}&${config.sas}`;
    let xml;
    try {
      xml = await fetchBoundedText(listUrl, {
        headers: { 'x-ms-version': '2023-11-03' },
        maxBytes: MAX_LIST_PAGE_BYTES,
      }, fetchImpl);
    } catch {
      throw new FindingError(503, 'storage_unavailable', 'The verified Finding index could not be read.');
    }
    for (const [, blob] of xml.matchAll(/<Blob>([\s\S]*?)<\/Blob>/g)) {
      const name = decodeXml(blob.match(/<Name>([\s\S]*?)<\/Name>/)?.[1] || '');
      const match = name.match(/^hunts\/lost-pixels-of-satoshi\/findings\/([a-z0-9-]+)--([a-f0-9]{64})\/finding\.json$/);
      if (!match || !Object.hasOwn(TARGET_FILENAMES, match[1])) continue;
      const spec = targetSpec(match[1]);
      const modifiedAt = Date.parse(decodeXml(blob.match(/<Last-Modified>([\s\S]*?)<\/Last-Modified>/)?.[1] || ''));
      const entry = { name, targetId: match[1], ethscriptionId: `0x${match[2]}`, validationMode: spec.validationMode, modifiedAt: Number.isFinite(modifiedAt) ? modifiedAt : 0 };
      if (spec.validationMode === 'exact') exactEntries.set(name, entry);
      else candidateEntries.push(entry);
    }
    candidateEntries = [...new Map(candidateEntries.map((entry) => [entry.name, entry])).values()]
      .sort((left, right) => right.modifiedAt - left.modifiedAt || right.name.localeCompare(left.name))
      .slice(0, boundedLimit);

    marker = decodeXml(xml.match(/<NextMarker>([\s\S]*?)<\/NextMarker>/)?.[1] || '');
    if (marker && seenMarkers.has(marker)) {
      throw new FindingError(503, 'storage_unavailable', 'The Finding index returned a repeated continuation marker.');
    }
    if (marker) seenMarkers.add(marker);
  } while (marker);

  const entries = [...exactEntries.values(), ...candidateEntries];
  const records = [];
  for (let offset = 0; offset < entries.length; offset += FINDING_READ_CONCURRENCY) {
    const page = await Promise.all(entries.slice(offset, offset + FINDING_READ_CONCURRENCY).map(async (entry) => {
      let record = null;
      try {
        const stored = await fetchBoundedJson(`${blobBaseUrl(config)}/${encodeBlobPath(entry.name)}?${config.sas}`, {
          headers: { accept: 'application/json', 'x-ms-version': '2023-11-03' },
          maxBytes: MAX_RECORD_RESPONSE_BYTES,
        }, fetchImpl);
        record = publicFinding(stored);
      } catch {
        // Recovery candidates may be skipped; accepted records fail the index
        // below so incomplete upstream responses cannot erase an accession.
      }
      const valid = record?.targetId === entry.targetId && record?.ethscriptionId === entry.ethscriptionId
        && Number.isFinite(Date.parse(record?.verifiedAt));
      if (!valid && entry.validationMode === 'exact') {
        // An incomplete read must not masquerade as a target becoming unfound.
        throw new FindingError(503, 'storage_unavailable', 'An accepted Finding could not be read. Please retry the index.');
      }
      if (!valid) return null;
      // Recovery candidates are an assignment feed, not accepted previews. Keep
      // their full bytes in stored evidence and the media-by-ID endpoint; 50
      // embedded base64 payloads could otherwise exceed the response budget.
      return entry.validationMode === 'exact' ? record : { ...record, contentUri: '' };
    }));
    records.push(...page.filter(Boolean));
  }

  return records.sort((left, right) => right.verifiedAt.localeCompare(left.verifiedAt));
}

async function verifyAndStoreFinding(payload, dependencies = {}) {
  const { assignment, message, signature } = payload || {};
  const env = dependencies.env || process.env;
  const { expectedPrefix, mediaType } = validateAssignment(assignment, dependencies.now ?? Date.now(), env);
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
  const getMarketRecord = dependencies.getArtifactMarket || getArtifactMarket;
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

  const marketRecord = await getMarketRecord(assignment.ethscriptionId);
  if (marketRecord?.ethscription?.transactionHash?.toLowerCase() !== assignment.ethscriptionId
    || marketRecord.seller?.toLowerCase() !== assignment.authorAddress
    || !marketRecord.custody?.verified) {
    const detail = marketRecord?.custody?.reason;
    throw new FindingError(
      409,
      'custody_unverified',
      detail
        ? `Vault custody is still reconciling: ${detail}`
        : 'The official indexer has not exposed this direct vault creation consistently yet. No new transaction is needed.',
    );
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
      indexedContentUri: record.content_uri,
      ethscriptionCreator: record.creator || null,
      ethscriptionTimestamp: record.block_timestamp || null,
      ethscriptionNumber: record.ethscription_number ?? null,
    },
  };
  const putFinding = dependencies.storeFinding || storeFinding;
  await putFinding(storagePath, storedRecord, fetchImpl, env);
  return { ...publicFinding(storedRecord), storagePath };
}

module.exports = {
  EXPEDITION_ID,
  FindingError,
  assignmentMessage,
  decodeVerifiedContentUri,
  fetchEthscription,
  listFindings,
  publicFinding,
  storeFinding,
  hasExpectedFileSignature,
  validateAssignment,
  verifyAndStoreFinding,
};
