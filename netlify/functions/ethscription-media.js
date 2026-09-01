const { loadEthscriptionMedia } = require('../lib/ethscriptionMedia');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };
  const id = event.queryStringParameters?.id || '';

  try {
    const media = await loadEthscriptionMedia(id);
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'content-type': media.contentType,
        'cache-control': 'public, max-age=31536000, immutable',
        'content-security-policy': "default-src 'none'; sandbox",
        'cross-origin-resource-policy': 'same-origin',
        'x-content-type-options': 'nosniff',
      },
      body: media.body.toString('base64'),
    };
  } catch (error) {
    const statusCode = ['invalid_ethscription_id', 'ethscription_not_found'].includes(error.message) ? 404 : 502;
    return {
      statusCode,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
        'x-content-type-options': 'nosniff',
      },
      body: 'Preview unavailable',
    };
  }
};
