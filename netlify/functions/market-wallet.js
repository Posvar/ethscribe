const { getWalletInventory, isAddress, jsonResponse } = require('../lib/market');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });

  const owner = event.queryStringParameters?.owner || '';
  if (!isAddress(owner)) return jsonResponse(400, { error: 'invalid_owner' });

  try {
    const inventory = await getWalletInventory(owner);
    return jsonResponse(200, { result: inventory }, 'private, max-age=0');
  } catch (error) {
    console.error('market-wallet failed', error);
    return jsonResponse(503, { error: 'wallet_inventory_unavailable' });
  }
};
