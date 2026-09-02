const { getArtifactMarket, isEthscriptionId, jsonResponse } = require('../lib/market');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });
  const ethscriptionId = event.queryStringParameters?.id || '';
  if (!isEthscriptionId(ethscriptionId)) return jsonResponse(400, { error: 'invalid_ethscription_id' });

  try {
    return jsonResponse(200, { result: await getArtifactMarket(ethscriptionId) });
  } catch (error) {
    console.error('market-artifact failed', error);
    return jsonResponse(503, { error: 'artifact_market_unavailable' });
  }
};
