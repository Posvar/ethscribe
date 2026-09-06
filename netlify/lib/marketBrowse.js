const marketApi = require('./market');

// One bounded page of vault holdings, not a scan of every historical target.
// Catalogue membership is a separate browser-side join; this endpoint never
// authorizes a trade. Asset pages recheck ownership, custody and price.
async function getMarketplaceInventory({ pageKey = '' } = {}, dependencies = marketApi) {
  const { MARKET_ADDRESS, isEthscriptionId, isAddress, fetchIndexerList, getMarketStatus,
    rpcBatch, encodePotentialDepositCall, encodeListingCall, decodePotentialDeposit,
    decodeListing, artifactMarketSnapshot } = dependencies;
  if (pageKey && !isEthscriptionId(pageKey)) throw new Error('invalid_page_key');
  const [inventory, market] = await Promise.all([
    fetchIndexerList({ current_owner: MARKET_ADDRESS.toLowerCase(), include_latest_transfer: true,
      max_results: 50, sort_by: 'newest_first', ...(pageKey ? { page_key: pageKey } : {}) }),
    getMarketStatus(),
  ]);
  if (inventory.records.length > 50) throw new Error('oversized_inventory_page');
  const records = inventory.records.filter(record => isEthscriptionId(record.transaction_hash)
    && record.current_owner?.toLowerCase() === MARKET_ADDRESS.toLowerCase());
  const candidates = records.filter(record => isAddress(record.previous_owner));
  const requests = candidates.flatMap(record => [encodePotentialDepositCall, encodeListingCall].map(encode => ({
    method: 'eth_call', params: [{ to: MARKET_ADDRESS, data: encode(record.previous_owner, record.transaction_hash) }, 'latest'],
  })));
  // A missing contract read is unknown, never an invented zero-price listing.
  let responses = [];
  try { if (requests.length) responses = await rpcBatch(requests); } catch { /* retain indexed custody, mark contract reads unknown */ }
  const state = new Map(candidates.map((record, index) => {
    let deposit = null, listing = null;
    try { if (responses[index * 2]?.result) deposit = decodePotentialDeposit(responses[index * 2].result); } catch { /* unknown */ }
    try { if (responses[index * 2 + 1]?.result) listing = decodeListing(responses[index * 2 + 1].result); } catch { /* unknown */ }
    return [record.transaction_hash.toLowerCase(), { deposit, listing }];
  }));
  const next = inventory.pagination.pageKey;
  if (inventory.pagination.hasMore && (!isEthscriptionId(next) || next === pageKey)) throw new Error('invalid_inventory_continuation');
  return {
    records: records.map(record => {
      const snapshot = artifactMarketSnapshot({ record, market, ...state.get(record.transaction_hash.toLowerCase()) });
      return { ...snapshot.ethscription, seller: snapshot.seller, listing: snapshot.listing, custody: snapshot.custody };
    }),
    market, pagination: { hasMore: inventory.pagination.hasMore, pageKey: next }, checkedAt: new Date().toISOString(),
  };
}

module.exports = { getMarketplaceInventory };
