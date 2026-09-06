const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('./market');
const { getMarketplaceInventory } = require('./marketBrowse');
const id = '0x' + 'ab'.repeat(32), seller = '0x' + '12'.repeat(20);
const word = value => BigInt(value).toString(16).padStart(64, '0');
const record = { transaction_hash: id, current_owner: api.MARKET_ADDRESS, previous_owner: seller, initial_owner: seller };
const market = { blockNumber: 200, indexer: { healthy: true, available: true } };
function deps(overrides = {}) { return { ...api, getMarketStatus: async () => market,
  fetchIndexerList: async () => ({ records: [record], pagination: { hasMore: false, pageKey: null } }),
  rpcBatch: async () => [{ result: '0x' + word(100) + word(1) + word(1) }, { result: '0x' + [10, 1, 1, 0, 0, 0, 0].map(word).join('') }], ...overrides }; }
test('reads vault-wide holdings and real listing tuples without requiring a wallet', async () => {
  let params, requests;
  const d = deps({ fetchIndexerList: async p => { params = p; return { records: [record], pagination: { hasMore: false } }; },
    rpcBatch: async r => { requests = r; return deps().rpcBatch(); } });
  const result = await getMarketplaceInventory({}, d);
  assert.equal(params.current_owner, api.MARKET_ADDRESS.toLowerCase());
  assert.equal(params.previous_owner, undefined);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.method === 'eth_call'));
  assert.equal(result.records[0].listing.priceWei, '10');
  assert.equal(result.records[0].custody.verified, true);
});
test('contract failure preserves unknown listing state, not a false unlisted price', async () => {
  const result = await getMarketplaceInventory({}, deps({ rpcBatch: async () => { throw new Error('offline'); } }));
  assert.equal(result.records[0].listing, null);
  assert.equal(result.records[0].custody.verified, false);
});
test('filters foreign ownership and malformed IDs before RPC encoding', async () => {
  let called = false;
  const result = await getMarketplaceInventory({}, deps({
    fetchIndexerList: async () => ({ records: [{ ...record, current_owner: seller }, { ...record, transaction_hash: 'bad' }], pagination: { hasMore: false } }),
    rpcBatch: async () => { called = true; return []; },
  }));
  assert.equal(result.records.length, 0); assert.equal(called, false);
});
test('bounds page sizes, validates cursors and rejects looping continuation', async () => {
  await assert.rejects(getMarketplaceInventory({ pageKey: 'bad' }, deps()), /invalid_page_key/);
  await assert.rejects(getMarketplaceInventory({}, deps({ fetchIndexerList: async () => ({ records: Array(51).fill(record), pagination: {} }) })), /oversized/);
  await assert.rejects(getMarketplaceInventory({ pageKey: id }, deps({ fetchIndexerList: async () => ({ records: [], pagination: { hasMore: true, pageKey: id } }) })), /continuation/);
});
test('browse handler rejects writes and invalid cursors without network calls', async () => {
  const { handler } = require('../functions/market-browse');
  assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 405);
  assert.equal((await handler({ httpMethod: 'GET', queryStringParameters: { page_key: 'bad' } })).statusCode, 400);
});
