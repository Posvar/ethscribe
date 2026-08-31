const { timingSafeEqual } = require('node:crypto');

const EXPEDITION_ID = 'lost-pixels-of-satoshi';
const HASH_PATTERN = /^[a-f0-9]{64}$/;

const TARGET_SPECS = Object.freeze({
  'november-single-xpm': ['image/x-xpixmap', 9215],
  'november-16-xpm': ['image/x-xpixmap', 3585],
  'november-20-xpm': ['image/x-xpixmap', 4193],
  'november-32-xpm': ['image/x-xpixmap', 5249],
  'november-48-xpm': ['image/x-xpixmap', 8775],
  'const-16-xpm': ['image/x-xpixmap', 3591],
  'const-20-xpm': ['image/x-xpixmap', 4199],
  'const-32-xpm': ['image/x-xpixmap', 5255],
  'const-48-xpm': ['image/x-xpixmap', 8781],
  'full-size-png': ['image/png', 165329],
  'june-16-xpm': ['image/x-xpixmap', 3847],
  'june-20-xpm': ['image/x-xpixmap', 3143],
  'june-32-xpm': ['image/x-xpixmap', 5399],
  'june-48-xpm': ['image/x-xpixmap', 8487],
  'june-80-xpm': ['image/x-xpixmap', 16535],
  'lost-bc-png': ['image/png', null],
});

class TargetCommitmentError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeHash(value) {
  const normalized = String(value || '').replace(/^0x/i, '').toLowerCase();
  return HASH_PATTERN.test(normalized) ? normalized : '';
}

function readCommitments(env = process.env) {
  let parsed;
  try {
    parsed = JSON.parse(env.EXPEDITION_001_TARGET_HASHES || '');
  } catch {
    throw new TargetCommitmentError(503, 'target_validation_unavailable', 'The sealed target validator is not configured. No transaction was prepared.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TargetCommitmentError(503, 'target_validation_unavailable', 'The sealed target validator is not configured. No transaction was prepared.');
  }
  return parsed;
}

function targetSpec(targetId) {
  const spec = TARGET_SPECS[targetId];
  if (!spec) throw new TargetCommitmentError(400, 'invalid_target', 'This expedition target is not open for submissions.');
  return { mediaType: spec[0], byteLength: spec[1], validationMode: targetId === 'lost-bc-png' ? 'provenance' : 'exact' };
}

function verifyTargetCandidate(candidate, env = process.env) {
  const spec = targetSpec(candidate?.targetId);
  const rawSha256 = normalizeHash(candidate?.rawSha256);
  if (!rawSha256 || !Number.isSafeInteger(candidate?.byteLength) || candidate.byteLength <= 0) {
    throw new TargetCommitmentError(400, 'invalid_candidate', 'The candidate hash or byte length is invalid.');
  }
  const expectedPrefix = `data:${spec.mediaType};base64,`;
  if (candidate.dataUriPrefix !== expectedPrefix) {
    return { eligible: false, validation: 'mismatch' };
  }
  if (spec.validationMode === 'provenance') {
    return { eligible: true, validation: 'provenance-required' };
  }

  const expectedHash = normalizeHash(readCommitments(env)[candidate.targetId]);
  if (!expectedHash) {
    throw new TargetCommitmentError(503, 'target_validation_unavailable', 'This sealed target commitment is unavailable. No transaction was prepared.');
  }
  const hashMatches = timingSafeEqual(Buffer.from(rawSha256, 'hex'), Buffer.from(expectedHash, 'hex'));
  return {
    eligible: hashMatches && candidate.byteLength === spec.byteLength,
    validation: hashMatches && candidate.byteLength === spec.byteLength ? 'exact' : 'mismatch',
  };
}

module.exports = {
  EXPEDITION_ID,
  TARGET_SPECS,
  TargetCommitmentError,
  normalizeHash,
  readCommitments,
  targetSpec,
  verifyTargetCandidate,
};
