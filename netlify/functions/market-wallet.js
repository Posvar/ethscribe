const { getWalletInventory, isAddress, isEthscriptionId, jsonResponse } = require('../lib/market');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });

  const owner = event.queryStringParameters?.owner || '';
  const directPageKey = event.queryStringParameters?.direct_page_key || '';
  const escrowPageKey = event.queryStringParameters?.escrow_page_key || '';
  if (!isAddress(owner)) return jsonResponse(400, { error: 'invalid_owner' });
  if ((directPageKey && !isEthscriptionId(directPageKey)) || (escrowPageKey && !isEthscriptionId(escrowPageKey))) {
    return jsonResponse(400, { error: 'invalid_page_key' });
  }

  try {
    const inventory = await getWalletInventory(owner, { directPageKey, escrowPageKey });
    return jsonResponse(200, { result: inventory }, 'private, max-age=0');
  } catch (error) {
    console.error('market-wallet failed', error);
    return jsonResponse(503, { error: 'wallet_inventory_unavailable' });
  }
};
