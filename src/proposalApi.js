function utf8ToHex(value) {
  return `0x${Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function buildExpeditionProposal({ title, target, rationale, source, authorAddress }) {
  return {
    schemaVersion: 1,
    documentType: 'expedition-proposal',
    title: title.trim(),
    target: target.trim(),
    rationale: rationale.trim(),
    source: source.trim(),
    authorAddress: authorAddress.toLowerCase(),
    createdAt: new Date().toISOString(),
  };
}

export function expeditionProposalMessage(proposal) {
  return [
    'Ethscribe Expedition Proposal',
    `Schema: ${proposal.schemaVersion}`,
    `Title: ${proposal.title}`,
    `Target: ${proposal.target}`,
    `Why it matters: ${proposal.rationale}`,
    `Starting source: ${proposal.source}`,
    `Author: ${proposal.authorAddress}`,
    `Created at: ${proposal.createdAt}`,
  ].join('\n');
}

export async function signExpeditionProposal(provider, account, proposal) {
  if (!provider?.request) throw new Error('An Ethereum browser wallet is required.');
  const message = expeditionProposalMessage(proposal);
  const signature = await provider.request({
    method: 'personal_sign',
    params: [utf8ToHex(message), account],
  });
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature || '')) {
    throw new Error('The wallet did not return a valid proposal signature.');
  }
  return { message, signature };
}

export async function fetchExpeditionProposals(fetchImpl = fetch) {
  const response = await fetchImpl('/api/proposals', { headers: { accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The public proposal notebook is temporarily unavailable.');
  return Array.isArray(payload.result) ? payload.result : [];
}

export async function publishExpeditionProposal(proposal, message, signature, fetchImpl = fetch) {
  const response = await fetchImpl('/api/proposals', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ proposal, message, signature }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The proposal could not be published.');
  return payload.result;
}
