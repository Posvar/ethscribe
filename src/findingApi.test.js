import { fetchVerifiedFindings, mergeVerifiedFindings, statsForArtifacts } from './findingApi';

test('reads verified Findings from the public index', async () => {
  const records = [{ findingId: 'finding-1' }];
  const result = await fetchVerifiedFindings(async () => ({
    ok: true,
    json: async () => ({ result: records }),
  }));
  expect(result).toEqual(records);
});

test('promotes only exact verified targets into the secured manifest', () => {
  const manifest = [
    { id: 'exact-target', status: 'open', filename: 'file.xpm' },
    { id: 'lost-target', status: 'open', filename: 'lost.png' },
  ];
  const resolved = mergeVerifiedFindings(manifest, [
    {
      findingId: 'exact-finding',
      targetId: 'exact-target',
      validationMode: 'exact',
      ethscriptionId: `0x${'11'.repeat(32)}`,
      rawSha256: `0x${'22'.repeat(32)}`,
      protocolContentSha256: `0x${'33'.repeat(32)}`,
      byteLength: 42,
      authorAddress: `0x${'44'.repeat(20)}`,
      sourceUrl: 'https://example.com/source',
      contentUri: 'data:image/x-xpixmap;base64,WA==',
      verifiedAt: '2026-09-01T12:00:00.000Z',
    },
    {
      findingId: 'lost-finding',
      targetId: 'lost-target',
      validationMode: 'provenance',
      ethscriptionId: `0x${'55'.repeat(32)}`,
    },
  ]);

  expect(resolved[0]).toMatchObject({ status: 'secured', findingId: 'exact-finding', bytes: 42 });
  expect(resolved[1].status).toBe('open');
  expect(statsForArtifacts(resolved, { lost: 1 })).toMatchObject({ known: 2, secured: 1, open: 1, lost: 1 });
});
