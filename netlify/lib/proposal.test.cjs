const test = require('node:test');
const assert = require('node:assert/strict');
const { Wallet } = require('ethers');
const {
  listProposals,
  proposalMessage,
  storeProposal,
  validateProposal,
  verifyAndStoreProposal,
} = require('./proposal');

const now = Date.parse('2026-08-31T18:00:00.000Z');
const wallet = new Wallet(`0x${'23'.repeat(32)}`);
const env = {
  AZURE_STORAGE_ACCOUNT_NAME: 'ethscribe',
  AZURE_STORAGE_CONTAINER: 'ethscribe-assets',
  AZURE_STORAGE_SAS_TOKEN: '?sv=secret',
};

function proposal(overrides = {}) {
  return {
    schemaVersion: 1,
    documentType: 'expedition-proposal',
    title: 'Browser Wars',
    target: 'Recover exact icons and interface fragments from early browsers.',
    rationale: 'They document how the public first learned to navigate the web.',
    source: 'https://example.com/archive',
    authorAddress: wallet.address.toLowerCase(),
    createdAt: new Date(now).toISOString(),
    ...overrides,
  };
}

test('validates and verifies a wallet-authored proposal before immutable storage', async () => {
  const value = proposal();
  const message = proposalMessage(value);
  const signature = await wallet.signMessage(message);
  let stored;
  const result = await verifyAndStoreProposal({ proposal: value, message, signature }, {
    now,
    storeProposal: async (path, record) => { stored = { path, record }; },
  });

  assert.match(result.proposalId, /^proposal-[a-f0-9]{16}$/);
  assert.match(stored.path, /^proposals\//);
  assert.equal(stored.record.authorAddress, wallet.address.toLowerCase());
  assert.equal(stored.record.status, 'proposed');
});

test('rejects stale, malformed, and wrongly signed proposals', async () => {
  assert.throws(() => validateProposal(proposal({ title: ' padded ' }), now), /title/i);
  assert.throws(() => validateProposal(proposal({ source: 'javascript:alert(1)' }), now), /HTTP/i);

  const value = proposal();
  const message = proposalMessage(value);
  const signature = await Wallet.createRandom().signMessage(message);
  await assert.rejects(verifyAndStoreProposal({ proposal: value, message, signature }, { now }), /named author/i);
});

test('stores immutable proposal blobs and reads the newest rows', async () => {
  let putRequest;
  await storeProposal('proposals/2026-08-31T18-00-00.000Z--aaaaaaaaaaaaaaaa.json', { safe: true }, async (url, options) => {
    putRequest = { url, options };
    return { ok: true, status: 201 };
  }, env);
  assert.equal(putRequest.options.headers['if-none-match'], '*');
  assert.doesNotMatch(putRequest.options.body, /secret/);

  const first = {
    documentType: 'published-expedition-proposal',
    proposalId: 'proposal-a',
    submittedAt: '2026-08-31T17:00:00.000Z',
  };
  const second = {
    documentType: 'published-expedition-proposal',
    proposalId: 'proposal-b',
    submittedAt: '2026-08-31T18:00:00.000Z',
  };
  const xml = '<EnumerationResults><Blobs>'
    + '<Blob><Name>proposals/2026-08-31T17-00-00.000Z--aaaaaaaaaaaaaaaa.json</Name></Blob>'
    + '<Blob><Name>proposals/2026-08-31T18-00-00.000Z--bbbbbbbbbbbbbbbb.json</Name></Blob>'
    + '</Blobs></EnumerationResults>';
  const fetchImpl = async (url) => {
    if (url.includes('comp=list')) return { ok: true, text: async () => xml };
    if (url.includes('bbbbbbbbbbbbbbbb')) return { ok: true, json: async () => second };
    return { ok: true, json: async () => first };
  };
  const records = await listProposals(fetchImpl, env);
  assert.deepEqual(records.map(({ proposalId }) => proposalId), ['proposal-b', 'proposal-a']);
});
