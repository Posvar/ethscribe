import { artifacts, huntStats, lostArtifact } from './huntData';

test('the Satoshi corpus has the researched completion totals', () => {
  expect(artifacts).toHaveLength(22);
  expect(huntStats).toEqual({ known: 22, secured: 7, open: 15, lost: 1, components: 14 });
  expect(lostArtifact.filename).toBe('bitcoin20x20.png');
});

test('every known artifact has a unique raw SHA-256 identity', () => {
  const hashes = artifacts.map((artifact) => artifact.sha256);
  expect(new Set(hashes).size).toBe(hashes.length);
});
