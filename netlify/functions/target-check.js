const { jsonResponse } = require('../lib/market');
const {
  EXPEDITION_ID,
  TargetCommitmentError,
  verifyTargetCandidate,
} = require('../lib/targetCommitments');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });
  if (!event.body || event.body.length > 2_000) return jsonResponse(413, { error: 'payload_too_large' });

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return jsonResponse(400, { error: 'invalid_json', message: 'The target-check payload is not valid JSON.' });
  }
  try {
    const result = verifyTargetCandidate(payload);
    return jsonResponse(200, {
      result: {
        targetId: payload.targetId,
        expeditionId: payload.expeditionId ?? EXPEDITION_ID,
        eligible: result.eligible,
        validation: result.validation,
      },
    });
  } catch (error) {
    if (error instanceof TargetCommitmentError) {
      return jsonResponse(error.statusCode, { error: error.code, message: error.message });
    }
    console.error('target check failed', error);
    return jsonResponse(503, { error: 'target_validation_unavailable', message: 'The sealed target validator is unavailable. No transaction was prepared.' });
  }
};
