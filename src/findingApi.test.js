import { fetchVerifiedFindings, mergeVerifiedFindings, reconcileFindingSnapshot, retainPublishedFinding, statsForArtifacts } from './findingApi';

test('retains a confirmed publication across stale scoped snapshots only until the feed acknowledges it', () => {
  const pending = new Map();
  const sound = { findingId: 'same-id', expeditionId: 'youve-got-history', targetId: 'message' };
  const satoshi = { findingId: 'same-id', targetId: 'icon' };
  retainPublishedFinding(pending, sound, 1_000);
  retainPublishedFinding(pending, satoshi, 1_000);
  expect(reconcileFindingSnapshot([], pending, 'youve-got-history', 2_000)).toEqual([sound]);
  expect(reconcileFindingSnapshot([], pending, 'lost-pixels-of-satoshi', 2_000)).toEqual([satoshi]);
  const refreshedSound = { ...sound, verifiedAt: '2026-09-05T12:00:00.000Z' };
  expect(reconcileFindingSnapshot([refreshedSound], pending, 'youve-got-history', 3_000)).toEqual([refreshedSound]);
  expect(pending.size).toBe(1);
  expect(reconcileFindingSnapshot([], pending, 'youve-got-history', 4_000)).toEqual([]);
  expect(reconcileFindingSnapshot([], pending, 'lost-pixels-of-satoshi', 4_000)).toEqual([satoshi]);
});

test('does not retain a locally confirmed publication indefinitely when the feed never acknowledges it', () => {
  const pending = new Map();
  retainPublishedFinding(pending, { findingId: 'missing-forever', expeditionId: 'youve-got-history' }, 1_000);
  expect(reconcileFindingSnapshot([], pending, 'youve-got-history', 181_000)).toEqual([]);
  expect(pending.size).toBe(0);
});

test('reads verified Findings from the public index', async () => {
  const records = [{ findingId: 'finding-1' }];
  const fetchImpl = jest.fn(async () => ({
    ok: true,
    json: async () => ({ result: records }),
  }));
  const result = await fetchVerifiedFindings(fetchImpl);
  expect(result).toEqual(records);
  expect(fetchImpl).toHaveBeenCalledWith('/api/findings?expedition=lost-pixels-of-satoshi', expect.any(Object));
  await fetchVerifiedFindings(fetchImpl, 'youve-got-history');
  expect(fetchImpl).toHaveBeenLastCalledWith('/api/findings?expedition=youve-got-history', expect.any(Object));
});

test('isolates identical target IDs across expeditions and preserves a sound target’s file metadata', () => {
  const manifest = [
    { id: 'shared-id', status: 'open', filename: 'file.ico' },
    { id: 'shared-id', expeditionId: 'youve-got-history', status: 'open', filename: 'message.wav', format: 'WAV', durationSeconds: 0.5, sourceUrl: 'https://example.com/package', sourceLabel: 'Original installer', sourcePath: 'Message.wav', provenanceNote: 'Compared against the shipping file.' },
    { id: 'legacy-only', expeditionId: 'youve-got-history', status: 'open' },
  ];
  const findings = [
    { targetId: 'shared-id', validationMode: 'exact', ethscriptionId: `0x${'11'.repeat(32)}`, findingId: 'legacy-001' },
    { targetId: 'legacy-only', validationMode: 'exact', ethscriptionId: `0x${'22'.repeat(32)}` },
    { targetId: 'shared-id', expeditionId: 'youve-got-history', validationMode: 'exact', ethscriptionId: `0x${'33'.repeat(32)}`, findingId: 'sound-002', contentUri: 'data:audio/wav;base64,UklGRg==', byteLength: 48, sourceUrl: 'https://example.com/finder-claim' },
  ];
  const resolved = mergeVerifiedFindings(manifest, findings);
  expect(resolved[0]).toMatchObject({ status: 'secured', findingId: 'legacy-001' });
  expect(resolved[1]).toMatchObject({
    status: 'secured', findingId: 'sound-002', format: 'WAV', filename: 'message.wav',
    sourceUrl: 'https://example.com/package', previewUrl: 'data:audio/wav;base64,UklGRg==', durationSeconds: 0.5,
    findingSourceUrl: 'https://example.com/finder-claim', sourceLabel: 'Original installer', sourcePath: 'Message.wav', provenanceNote: 'Compared against the shipping file.',
  });
  expect(resolved[2].status).toBe('open');
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
  expect(resolved[0].creator).toBe('');
  expect(resolved[0].ethscribedAt).toBeNull();
  expect(resolved[0].findingAuthor).toBe(`0x${'44'.repeat(20)}`);
  expect(resolved[0].findingVerifiedAt).toBe('2026-09-01T12:00:00.000Z');
  expect(resolved[1].status).toBe('open');
  expect(statsForArtifacts(resolved, { lost: 1 })).toMatchObject({ known: 2, secured: 1, open: 1, lost: 1 });
});
