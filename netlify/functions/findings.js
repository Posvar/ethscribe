const { FindingError, listFindings, verifyAndStoreFinding } = require('../lib/finding');
const { jsonResponse } = require('../lib/market');

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    try {
      return jsonResponse(200, { result: await listFindings() }, 'public, max-age=0, s-maxage=15, stale-while-revalidate=30');
    } catch (error) {
      if (error instanceof FindingError) {
        return jsonResponse(error.statusCode, { error: error.code, message: error.message });
      }
      console.error('finding index failed', error);
      return jsonResponse(503, { error: 'finding_unavailable', message: 'The verified Finding index is temporarily unavailable.' });
    }
  }
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });
  if (!event.body || event.body.length > 20_000) return jsonResponse(413, { error: 'payload_too_large' });

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return jsonResponse(400, { error: 'invalid_json', message: 'The Finding payload is not valid JSON.' });
  }

  try {
    const result = await verifyAndStoreFinding(payload);
    return jsonResponse(201, { result });
  } catch (error) {
    if (error instanceof FindingError) {
      return jsonResponse(error.statusCode, { error: error.code, message: error.message });
    }
    console.error('findings failed', error);
    return jsonResponse(503, { error: 'finding_unavailable', message: 'The Finding could not be verified or stored.' });
  }
};
