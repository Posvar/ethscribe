const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Wallet } = require('ethers');
const { MARKET_ADDRESS } = require('./market');
const {
  FindingError,
  assignmentMessage,
  storeFinding,
  validateAssignment,
  verifyAndStoreFinding,
} = require('./finding');

function hash(value) {
  return `0x${createHash('sha256').update(value).digest('hex')}`;
}

const now = Date.parse('2026-08-31T18:00:00.000Z');
const wallet = new Wallet(`0x${'12'.repeat(32)}`);
const raw = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('lost pixels candidate'),
]);
const contentUri = `data:image/png;base64,${raw.toString('base64')}`;
const ethscriptionId = `0x${'ab'.repeat(32)}`;

function assignment(overrides = {}) {
  return {
    schemaVersion: 1,
    documentType: 'finding',
    expeditionId: 'lost-pixels-of-satoshi',
    targetId: 'lost-bc-png',
    ethscriptionId,
    rawSha256: hash(raw),
    protocolContentSha256: hash(Buffer.from(contentUri, 'utf8')),
    dataUriPrefix: 'data:image/png;base64,',
    byteLength: raw.length,
    filename: 'bitcoin20x20.png',
    authorAddress: wallet.address.toLowerCase(),
    custodyContract: MARKET_ADDRESS.toLowerCase(),
    claimSummary: 'Recovered from a reproducible primary-source archive.',
    sourceReferences: ['https://example.com/archive'],
    createdAt: new Date(now).toISOString(),
    ...overrides,
  };
}

test('verifies signature, exact indexed bytes, frozen wrapper, and reconciled custody before storage', async () => {
  const value = assignment();
  const message = assignmentMessage(value);
  const signature = await wallet.signMessage(message);
  let stored;
  const result = await verifyAndStoreFinding({ assignment: value, message, signature }, {
    now,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ result: {
        transaction_hash: ethscriptionId,
        content_sha: value.protocolContentSha256,
        content_uri: contentUri,
        current_owner: MARKET_ADDRESS,
        previous_owner: wallet.address,
      } }),
    }),
    getWalletInventory: async () => ({
      escrow: [{ transactionHash: ethscriptionId, custody: { verified: true } }],
    }),
    storeFinding: async (path, record) => { stored = { path, record }; },
  });

  assert.match(result.findingId, /^lost-bc-png--/);
  assert.equal(stored.path, result.storagePath);
  assert.equal(stored.record.verification.marketCustody, 'verified');
  assert.equal(stored.record.verification.frozenTargetWrapper, 'data:image/png;base64,');
});

test('rejects non-frozen wrappers and known-target hash mismatches', () => {
  assert.throws(
    () => validateAssignment(assignment({ dataUriPrefix: 'data:image/x-png;base64,' }), now),
    (error) => error instanceof FindingError && error.code === 'wrong_wrapper',
  );
  assert.throws(
    () => validateAssignment(assignment({
      targetId: 'november-single-xpm',
      dataUriPrefix: 'data:image/x-xpixmap;base64,',
    }), now, {
      EXPEDITION_001_TARGET_HASHES: JSON.stringify({ 'november-single-xpm': '11'.repeat(32) }),
    }),
    (error) => error instanceof FindingError && error.code === 'target_mismatch',
  );
});

test('rejects a valid signature from the wrong wallet', async () => {
  const value = assignment();
  const message = assignmentMessage(value);
  const impostor = Wallet.createRandom();
  const signature = await impostor.signMessage(message);
  await assert.rejects(
    verifyAndStoreFinding({ assignment: value, message, signature }, { now }),
    (error) => error instanceof FindingError && error.code === 'wrong_signer',
  );
});

test('writes immutable Azure blobs without exposing credentials in the record', async () => {
  let request;
  await storeFinding('hunts/test/findings/id/finding.json', { safe: true }, async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201 };
  }, {
    AZURE_STORAGE_ACCOUNT_NAME: 'ethscribe',
    AZURE_STORAGE_CONTAINER: 'ethscribe-assets',
    AZURE_STORAGE_SAS_TOKEN: '?sv=secret',
  });
  assert.equal(request.options.headers['if-none-match'], '*');
  assert.equal(request.options.headers['x-ms-blob-type'], 'BlockBlob');
  assert.match(request.url, /^https:\/\/ethscribe\.blob\.core\.windows\.net\/ethscribe-assets\/hunts\/test/);
  assert.doesNotMatch(request.options.body, /secret/);
});
