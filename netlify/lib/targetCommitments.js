const { timingSafeEqual } = require('node:crypto');
const soundTargets = require('../../shared/soundTargets.json');

const EXPEDITION_ID = 'lost-pixels-of-satoshi';
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SOUND_EXPEDITION_ID = 'youve-got-history';
if (soundTargets.expeditionId !== SOUND_EXPEDITION_ID || !Array.isArray(soundTargets.targets)) {
  throw new Error('The sound expedition commitment manifest is invalid.');
}
const SOUND_TARGETS = Object.freeze(Object.fromEntries(soundTargets.targets.map((target) => {
  if (!/^[a-z0-9-]+$/.test(target.id) || !HASH_PATTERN.test(target.rawSha256)
    || !HASH_PATTERN.test(target.protocolContentSha256) || !Number.isSafeInteger(target.byteLength)
    || target.byteLength <= 0 || target.mediaType !== 'audio/wav' || target.canonicalPrefix !== 'data:audio/wav;base64,') {
    throw new Error('A sound expedition commitment is invalid.');
  }
  return [target.id, Object.freeze({ ...target })];
})));
if (Object.keys(SOUND_TARGETS).length !== soundTargets.targets.length) throw new Error('Duplicate sound target ID.');

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
  const configured = env.EXPEDITION_001_TARGET_HASHES || '';
  const candidates = [configured];
  if (/^[a-zA-Z0-9+/]+={0,2}$/.test(configured)) {
    candidates.push(Buffer.from(configured, 'base64').toString('utf8'));
  }
  let parsed = null;
  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      // Continue to the base64-decoded representation when configured that way.
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TargetCommitmentError(503, 'target_validation_unavailable', 'The sealed target validator is not configured. No transaction was prepared.');
  }
  return parsed;
}

function resolveExpeditionId(expeditionId = EXPEDITION_ID) {
  if (expeditionId !== EXPEDITION_ID && expeditionId !== SOUND_EXPEDITION_ID) {
    throw new TargetCommitmentError(400, 'invalid_expedition', 'This expedition is not open for submissions.');
  }
  return expeditionId;
}

function targetSpec(targetId, expeditionId = EXPEDITION_ID) {
  const scopedExpedition = resolveExpeditionId(expeditionId);
  if (scopedExpedition === SOUND_EXPEDITION_ID) {
    const spec = Object.hasOwn(SOUND_TARGETS, targetId) ? SOUND_TARGETS[targetId] : null;
    if (!spec) throw new TargetCommitmentError(400, 'invalid_target', 'This expedition target is not open for submissions.');
    return { mediaType: spec.mediaType, byteLength: spec.byteLength, validationMode: 'exact', filename: spec.filename,
      rawSha256: spec.rawSha256, protocolContentSha256: spec.protocolContentSha256, canonicalPrefix: spec.canonicalPrefix };
  }
  const spec = Object.hasOwn(TARGET_SPECS, targetId) ? TARGET_SPECS[targetId] : null;
  if (!spec) throw new TargetCommitmentError(400, 'invalid_target', 'This expedition target is not open for submissions.');
  return { mediaType: spec[0], byteLength: spec[1], validationMode: targetId === 'lost-bc-png' ? 'provenance' : 'exact' };
}

function verifyTargetCandidate(candidate, env = process.env) {
  const spec = targetSpec(candidate?.targetId, candidate?.expeditionId);
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

  const expectedHash = spec.rawSha256 || normalizeHash(readCommitments(env)[candidate.targetId]);
  if (!expectedHash) {
    throw new TargetCommitmentError(503, 'target_validation_unavailable', 'This sealed target commitment is unavailable. No transaction was prepared.');
  }
  const hashMatches = timingSafeEqual(Buffer.from(rawSha256, 'hex'), Buffer.from(expectedHash, 'hex'));
  const protocolMatches = !spec.protocolContentSha256 || candidate.protocolContentSha256 === undefined
    || normalizeHash(candidate.protocolContentSha256) === spec.protocolContentSha256;
  const eligible = hashMatches && candidate.byteLength === spec.byteLength && protocolMatches;
  return {
    eligible,
    validation: eligible ? 'exact' : 'mismatch',
  };
}

module.exports = {
  EXPEDITION_ID,
  SOUND_EXPEDITION_ID,
  TARGET_SPECS,
  TargetCommitmentError,
  normalizeHash,
  readCommitments,
  resolveExpeditionId,
  targetSpec,
  verifyTargetCandidate,
};
