const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TargetCommitmentError,
  targetSpec,
  verifyTargetCandidate,
} = require('./targetCommitments');
const sounds = require('../../shared/soundTargets.json');

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

test('reads a base64-encoded commitment map for shell-safe deployment configuration', () => {
  const encodedEnv = {
    EXPEDITION_001_TARGET_HASHES: Buffer.from(JSON.stringify({ 'november-20-xpm': expectedHash })).toString('base64'),
  };
  assert.deepEqual(verifyTargetCandidate({
    targetId: 'november-20-xpm',
    rawSha256: `0x${expectedHash}`,
    byteLength: 4193,
    dataUriPrefix: 'data:image/x-xpixmap;base64,',
  }, encodedEnv), { eligible: true, validation: 'exact' });
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

function soundCandidate(target = sounds.targets[0], overrides = {}) {
  return {
    expeditionId: sounds.expeditionId,
    targetId: target.id,
    rawSha256: `0x${target.rawSha256}`,
    protocolContentSha256: `0x${target.protocolContentSha256}`,
    byteLength: target.byteLength,
    dataUriPrefix: target.canonicalPrefix,
    ...overrides,
  };
}

test('every published sound target has deterministic eligibility without sealed-001 configuration', () => {
  assert.equal(sounds.targets.length, 17);
  for (const target of sounds.targets) {
    assert.deepEqual(verifyTargetCandidate(soundCandidate(target), {}), { eligible: true, validation: 'exact' });
    assert.equal(targetSpec(target.id, sounds.expeditionId).filename, target.filename);
  }
});

test('sound target checks reject changed hashes, byte counts, alternate wrappers and protocol identities', () => {
  const target = sounds.targets[0];
  for (const overrides of [
    { rawSha256: `0x${'00'.repeat(32)}` },
    { byteLength: target.byteLength + 1 },
    { dataUriPrefix: 'data:audio/x-wav;base64,' },
    { dataUriPrefix: 'data:audio/wav;charset=utf-8;base64,' },
    { protocolContentSha256: `0x${'00'.repeat(32)}` },
  ]) {
    assert.deepEqual(verifyTargetCandidate(soundCandidate(target, overrides), {}), { eligible: false, validation: 'mismatch' });
  }
});

test('target IDs cannot cross expedition boundaries or inherit object prototype keys', () => {
  for (const [id, expeditionId] of [
    ['november-20-xpm', sounds.expeditionId],
    [sounds.targets[0].id, 'lost-pixels-of-satoshi'],
    ['constructor', sounds.expeditionId],
    ['toString', 'lost-pixels-of-satoshi'],
  ]) {
    assert.throws(() => targetSpec(id, expeditionId), error => error instanceof TargetCommitmentError && error.code === 'invalid_target');
  }
  for (const expeditionId of ['', null, '../youve-got-history', 'hello-macintosh']) {
    assert.throws(() => verifyTargetCandidate(soundCandidate(undefined, { expeditionId })),
      error => error instanceof TargetCommitmentError && error.code === 'invalid_expedition');
  }
});

test('target-check endpoint echoes the validated expedition and rejects cross-expedition targets', async () => {
  const { handler } = require('../functions/target-check');
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify(soundCandidate()) });
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).result.expeditionId, sounds.expeditionId);
  const rejected = await handler({ httpMethod: 'POST', body: JSON.stringify(soundCandidate(undefined, { targetId: 'lost-bc-png' })) });
  assert.equal(rejected.statusCode, 400);
});
