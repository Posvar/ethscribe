import {
  buildExpeditionProposal,
  expeditionProposalMessage,
  fetchExpeditionProposals,
  publishExpeditionProposal,
  signExpeditionProposal,
} from './proposalApi';

const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';

test('builds and signs a stable expedition proposal', async () => {
  const proposal = buildExpeditionProposal({
    title: '  Browser Wars  ',
    target: ' Recover exact icons. ',
    rationale: ' They shaped the web. ',
    source: ' https://example.com/archive ',
    authorAddress: account,
  });
  const provider = { request: jest.fn().mockResolvedValue(`0x${'12'.repeat(65)}`) };
  const signed = await signExpeditionProposal(provider, account, proposal);

  expect(proposal).toMatchObject({
    title: 'Browser Wars',
    target: 'Recover exact icons.',
    rationale: 'They shaped the web.',
    source: 'https://example.com/archive',
    authorAddress: account.toLowerCase(),
  });
  expect(expeditionProposalMessage(proposal)).toContain('Ethscribe Expedition Proposal');
  expect(signed.message).toContain('Title: Browser Wars');
  expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'personal_sign' }));
});

test('loads and publishes proposals through the public API', async () => {
  const proposal = buildExpeditionProposal({
    title: 'The First PNG',
    target: 'Find the exact file.',
    rationale: 'A web milestone.',
    source: 'https://example.com',
    authorAddress: account,
  });
  const listFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [{ proposalId: 'p1' }] }) });
  await expect(fetchExpeditionProposals(listFetch)).resolves.toEqual([{ proposalId: 'p1' }]);

  const postFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { proposalId: 'p2', ...proposal } }) });
  await expect(publishExpeditionProposal(proposal, 'message', `0x${'34'.repeat(65)}`, postFetch)).resolves.toMatchObject({ proposalId: 'p2' });
  expect(postFetch).toHaveBeenCalledWith('/api/proposals', expect.objectContaining({ method: 'POST' }));
});
