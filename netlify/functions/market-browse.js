const { getMarketplaceInventory } = require('../lib/marketBrowse');
const { isEthscriptionId, jsonResponse } = require('../lib/market');

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });
  const pageKey = event.queryStringParameters?.page_key || '';
  if (pageKey && !isEthscriptionId(pageKey)) return jsonResponse(400, { error: 'invalid_page_key' });
  try { return jsonResponse(200, { result: await getMarketplaceInventory({ pageKey }) }); }
  catch { return jsonResponse(503, { error: 'marketplace_inventory_unavailable' }); }
};
