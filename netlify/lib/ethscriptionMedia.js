const MAX_PREVIEW_BYTES = 2_000_000;
const DEFAULT_API_URL = 'https://api.ethscriptions.com/v2';

function isEthscriptionId(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value || '');
}

function parseDataUri(contentUri) {
  if (typeof contentUri !== 'string' || !contentUri.startsWith('data:')) {
    throw new Error('invalid_content_uri');
  }
  const comma = contentUri.indexOf(',');
  if (comma < 0) throw new Error('invalid_content_uri');
  const metadata = contentUri.slice(5, comma);
  const parts = metadata.split(';');
  const contentType = (parts.shift() || '').toLowerCase();
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType)) {
    throw new Error('invalid_content_type');
  }

  const payload = contentUri.slice(comma + 1);
  let body;
  if (parts.some((part) => part.toLowerCase() === 'base64')) {
    if (!/^[a-z0-9+/]*={0,2}$/i.test(payload) || payload.length % 4 !== 0) throw new Error('invalid_base64');
    body = Buffer.from(payload, 'base64');
  } else {
    try {
      body = Buffer.from(decodeURIComponent(payload), 'utf8');
    } catch {
      throw new Error('invalid_percent_encoding');
    }
  }
  if (body.length === 0 || body.length > MAX_PREVIEW_BYTES) throw new Error('unsupported_preview_size');
  return { body, contentType };
}

function previewContentSecurityPolicy(contentType) {
  return ['text/html', 'application/xhtml+xml'].includes(contentType)
    ? "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'"
    : "default-src 'none'; sandbox";
}

async function loadEthscriptionMedia(ethscriptionId, fetchImpl = fetch) {
  if (!isEthscriptionId(ethscriptionId)) throw new Error('invalid_ethscription_id');
  const baseUrl = (process.env.ETHSCRIPTIONS_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
  const response = await fetchImpl(`${baseUrl}/ethscriptions/${ethscriptionId}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(response.status === 404 ? 'ethscription_not_found' : 'indexer_unavailable');
  const payload = await response.json();
  const record = payload.result || payload;
  if (record.transaction_hash?.toLowerCase() !== ethscriptionId.toLowerCase()) throw new Error('record_mismatch');
  return parseDataUri(record.content_uri);
}

module.exports = { loadEthscriptionMedia, parseDataUri, previewContentSecurityPolicy };
