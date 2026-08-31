const { getMarketStatus, jsonResponse } = require('../lib/market');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });

  try {
    const status = await getMarketStatus();
    return jsonResponse(200, { result: status }, 'public, max-age=0, s-maxage=15, stale-while-revalidate=15');
  } catch (error) {
    console.error('market-status failed', error);
    return jsonResponse(503, { error: 'market_status_unavailable' });
  }
};
