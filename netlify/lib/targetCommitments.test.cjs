const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TargetCommitmentError,
  verifyTargetCandidate,
} = require('./targetCommitments');

const expectedHash = '12'.repeat(32);
const env = {
  EXPEDITION_001_TARGET_HASHES: JSON.stringify({ 'november-20-xpm': expectedHash }),
};

test('returns exact eligibility without returning the expected commitment', () => {
  const result = verifyTargetCandidate({
    targetId: 'november-20-xpm',
    rawSha256: `0x${expectedHash}`,
    byteLength: 4193,
    dataUriPrefix: 'data:image/x-xpixmap;base64,',
  }, env);
  assert.deepEqual(result, { eligible: true, validation: 'exact' });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(expectedHash));
});

test('fails closed for a wrong hash, byte length, or wrapper', () => {
  const base = {
    targetId: 'november-20-xpm',
    rawSha256: `0x${expectedHash}`,
    byteLength: 4193,
    dataUriPrefix: 'data:image/x-xpixmap;base64,',
  };
  assert.deepEqual(verifyTargetCandidate({ ...base, rawSha256: `0x${'34'.repeat(32)}` }, env), { eligible: false, validation: 'mismatch' });
  assert.deepEqual(verifyTargetCandidate({ ...base, byteLength: 4194 }, env), { eligible: false, validation: 'mismatch' });
  assert.deepEqual(verifyTargetCandidate({ ...base, dataUriPrefix: 'data:image/x-xpm;base64,' }, env), { eligible: false, validation: 'mismatch' });
});

test('accepts a lost-file candidate for provenance review without inventing a hash', () => {
  assert.deepEqual(verifyTargetCandidate({
    targetId: 'lost-bc-png',
    rawSha256: `0x${'56'.repeat(32)}`,
    byteLength: 120,
    dataUriPrefix: 'data:image/png;base64,',
  }, {}), { eligible: true, validation: 'provenance-required' });
});

test('fails closed when an exact target commitment is not configured', () => {
  assert.throws(() => verifyTargetCandidate({
    targetId: 'november-20-xpm',
    rawSha256: `0x${expectedHash}`,
    byteLength: 4193,
    dataUriPrefix: 'data:image/x-xpixmap;base64,',
  }, {}), (error) => error instanceof TargetCommitmentError && error.code === 'target_validation_unavailable');
});
