import { MAINNET_CHAIN_ID, MARKET_ADDRESS } from './marketConfig';

export const MAX_STANDARD_FILE_BYTES = 90_000;
export const CANONICAL_XPM_MEDIA_TYPE = 'image/x-xpixmap';
export const XPM_MEDIA_TYPE_CANDIDATES = [
  CANONICAL_XPM_MEDIA_TYPE,
  'image/x-xpm',
  'image/xpm',
  'text/x-xpm',
];

const EXTENSION_MEDIA_TYPES = {
  gif: 'image/gif',
  html: 'text/html',
  htm: 'text/html',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  xpm: CANONICAL_XPM_MEDIA_TYPE,
};

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function utf8ToHex(value) {
  return `0x${bytesToHex(new TextEncoder().encode(value))}`;
}

export function normalizeSha(value) {
  if (!/^(0x)?[a-fA-F0-9]{64}$/.test(value || '')) return '';
  return `0x${value.replace(/^0x/i, '').toLowerCase()}`;
}

export function isMediaType(value) {
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(value || '');
}

export function mediaTypeForFile(file, artifact = null) {
  if (artifact?.format === 'XPM') return CANONICAL_XPM_MEDIA_TYPE;
  if (artifact?.format === 'PNG') return 'image/png';
  if (artifact?.format === 'ICO') return 'image/x-icon';
  const extension = file?.name?.split('.').pop()?.toLowerCase();
  return EXTENSION_MEDIA_TYPES[extension] || file?.type || 'application/octet-stream';
}

export function buildDataUri(mediaType, base64) {
  if (!isMediaType(mediaType)) throw new Error('Enter a valid media type such as image/png.');
  if (!base64) throw new Error('The selected file is empty.');
  return `data:${mediaType.toLowerCase()};base64,${base64}`;
}

export function matchesMediaSignature(bytes, mediaType) {
  const type = String(mediaType).toLowerCase();
  if (type === 'image/png') {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/x-icon') return bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0;
  if (XPM_MEDIA_TYPE_CANDIDATES.includes(type)) {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 512)).includes('XPM');
  }
  return true;
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `0x${bytesToHex(new Uint8Array(digest))}`;
}

export async function inspectFile(file, mediaType) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Choose a file to inspect.');
  if (file.size === 0) throw new Error('The selected file is empty.');
  if (file.size > MAX_STANDARD_FILE_BYTES) {
    throw new Error(`This ${file.size.toLocaleString('en-US')}-byte file exceeds the ${MAX_STANDARD_FILE_BYTES.toLocaleString('en-US')}-byte standard calldata path. A larger-file path is required.`);
  }
  if (!isMediaType(mediaType)) throw new Error('Enter a valid media type such as image/png.');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = bytesToBase64(bytes);
  const dataUri = buildDataUri(mediaType, base64);
  const [rawSha256, protocolContentSha256] = await Promise.all([
    sha256Hex(bytes),
    sha256Hex(new TextEncoder().encode(dataUri)),
  ]);

  return {
    filename: file.name,
    byteLength: bytes.length,
    mediaType: mediaType.toLowerCase(),
    base64,
    dataUri,
    dataUriPrefix: `data:${mediaType.toLowerCase()};base64,`,
    calldataBytes: new TextEncoder().encode(dataUri).length,
    rawSha256,
    protocolContentSha256,
    signatureMatchesMediaType: matchesMediaSignature(bytes, mediaType),
  };
}

export async function buildWrapperChecks(inspection, mediaTypes = [inspection.mediaType]) {
  const uniqueMediaTypes = [...new Set(mediaTypes.map((value) => value.toLowerCase()))];
  return Promise.all(uniqueMediaTypes.map(async (mediaType) => {
    const dataUri = buildDataUri(mediaType, inspection.base64);
    return {
      mediaType,
      dataUriPrefix: `data:${mediaType};base64,`,
      protocolContentSha256: await sha256Hex(new TextEncoder().encode(dataUri)),
      canonical: mediaType === inspection.mediaType,
    };
  }));
}

export async function checkProtocolExistence(checks, fetchImpl = fetch) {
  return Promise.all(checks.map(async (check) => {
    const response = await fetchImpl(`/api/ethscriptions/exists/${check.protocolContentSha256}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error('The official Ethscriptions duplicate check is unavailable. No transaction was prepared.');
    const payload = await response.json();
    return { ...check, exists: Boolean(payload.result?.exists), ethscription: payload.result?.ethscription || null };
  }));
}

export function buildCreateEthscriptionTransaction(account, dataUri) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(account || '')) throw new Error('Connect a valid Ethereum wallet.');
  if (!/^data:[^,]+,/.test(dataUri || '')) throw new Error('The generated Data URI is invalid.');
  return {
    from: account,
    to: account,
    value: '0x0',
    data: utf8ToHex(dataUri),
  };
}

export async function waitForEthscriptionRecord(ethscriptionId, expected, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const pollMs = options.pollMs ?? 6_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetchImpl(`/api/ethscriptions/${ethscriptionId}`, { headers: { accept: 'application/json' } });
    if (response.ok) {
      const payload = await response.json();
      const record = payload.result || payload;
      if (normalizeSha(record.content_sha) !== normalizeSha(expected.protocolContentSha256)) {
        throw new Error('The indexed Ethscription content hash does not match the prepared Data URI.');
      }
      if (record.current_owner?.toLowerCase() !== expected.owner.toLowerCase()) {
        throw new Error('The new Ethscription is not indexed to the connected wallet.');
      }
      return record;
    }
    if (response.status !== 404) throw new Error('The official Ethscriptions indexer is temporarily unavailable.');
    const existence = await fetchImpl(`/api/ethscriptions/exists/${normalizeSha(expected.protocolContentSha256)}`, { headers: { accept: 'application/json' } });
    if (existence.ok) {
      const payload = await existence.json();
      const competing = payload.result?.ethscription;
      if (payload.result?.exists && competing?.transaction_hash?.toLowerCase() !== ethscriptionId.toLowerCase()) {
        throw new Error(`Another transaction created this exact Data URI first (${competing.transaction_hash}). Your Ethereum transaction succeeded, but it did not create a new Ethscription.`);
      }
    }
    await wait(pollMs);
  }

  throw new Error('Ethereum confirmed the transaction, but the official indexer did not recognize a new Ethscription. An exact-content race may have occurred; do not submit the transaction again.');
}

export async function waitForVerifiedCustody(owner, ethscriptionId, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const pollMs = options.pollMs ?? 8_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetchImpl(`/api/market/wallet?owner=${owner}`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Custody reconciliation is temporarily unavailable. The confirmed transaction must not be resubmitted.');
    const payload = await response.json();
    const inventory = payload.result;
    const escrow = inventory?.escrow?.find((record) => record.transactionHash?.toLowerCase() === ethscriptionId.toLowerCase());
    if (escrow?.custody?.verified) return escrow;
    await wait(pollMs);
  }

  throw new Error('The deposit confirmed, but custody reconciliation is taking longer than expected. Check the transaction and wallet later; do not redeposit.');
}

export function buildFindingAssignment({ artifact, inspection, ethscriptionId, account, claimSummary, sourceUrl }) {
  return {
    schemaVersion: 1,
    documentType: 'finding',
    expeditionId: 'lost-pixels-of-satoshi',
    targetId: artifact.id,
    ethscriptionId: ethscriptionId.toLowerCase(),
    rawSha256: inspection.rawSha256.toLowerCase(),
    protocolContentSha256: inspection.protocolContentSha256.toLowerCase(),
    dataUriPrefix: inspection.dataUriPrefix,
    byteLength: inspection.byteLength,
    filename: inspection.filename,
    authorAddress: account.toLowerCase(),
    custodyContract: MARKET_ADDRESS.toLowerCase(),
    claimSummary: claimSummary.trim(),
    sourceReferences: [sourceUrl.trim()],
    createdAt: new Date().toISOString(),
  };
}

export function findingAssignmentMessage(assignment) {
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

export async function signFindingAssignment(provider, account, assignment) {
  if (!provider?.request) throw new Error('An Ethereum browser wallet is required.');
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (String(chainId).toLowerCase() !== MAINNET_CHAIN_ID) throw new Error('Switch the wallet to Ethereum mainnet before signing.');
  const message = findingAssignmentMessage(assignment);
  const signature = await provider.request({ method: 'personal_sign', params: [utf8ToHex(message), account] });
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature || '')) throw new Error('The wallet did not return a valid assignment signature.');
  return { message, signature };
}

export async function publishFinding(assignment, message, signature, fetchImpl = fetch) {
  const response = await fetchImpl('/api/findings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ assignment, message, signature }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The signed Finding could not be published. Your onchain custody is unaffected.');
  return payload.result;
}
