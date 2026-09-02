const { jsonResponse } = require('../lib/market');
const { listProposals, ProposalError, verifyAndStoreProposal } = require('../lib/proposal');

exports.handler = async (event) => {
  try {
    if (process.env.PUBLIC_PROPOSALS_ENABLED !== 'true') {
      return jsonResponse(404, { error: 'proposal_intake_closed', message: 'Public expedition proposals are not open.' });
    }
    if (event.httpMethod === 'GET') {
      return jsonResponse(200, { result: await listProposals() }, 'public, max-age=0, s-maxage=30, stale-while-revalidate=30');
    }
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });
    if (!event.body || event.body.length > 20_000) return jsonResponse(413, { error: 'payload_too_large' });

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return jsonResponse(400, { error: 'invalid_json', message: 'The proposal payload is not valid JSON.' });
    }
    return jsonResponse(201, { result: await verifyAndStoreProposal(payload) });
  } catch (error) {
    if (error instanceof ProposalError) {
      return jsonResponse(error.statusCode, { error: error.code, message: error.message });
    }
    console.error('proposals failed', error);
    return jsonResponse(503, { error: 'proposal_unavailable', message: 'The proposal notebook is temporarily unavailable.' });
  }
};
