import { artifacts, huntStats, lostArtifact } from './huntData';

test('the Satoshi corpus has the researched completion totals', () => {
  expect(artifacts).toHaveLength(22);
  expect(huntStats).toEqual({ known: 22, secured: 7, open: 15, lost: 1, components: 14 });
  expect(lostArtifact.filename).toBe('bitcoin20x20.png');
});

test('open exact-byte targets do not disclose answer-bearing data in the public bundle', () => {
  const open = artifacts.filter((artifact) => artifact.status === 'open');
  expect(open).toHaveLength(15);
  open.forEach((artifact) => {
    expect(artifact.validationMode).toBe('exact');
    expect(artifact.sha256).toBeUndefined();
    expect(artifact.sourceUrl).toBeUndefined();
    expect(artifact.previewUrl).toBeUndefined();
  });
});

test('secured artifacts retain complete public provenance records', () => {
  const secured = artifacts.filter((artifact) => artifact.status === 'secured');
  expect(secured).toHaveLength(7);
  secured.forEach((artifact) => {
    expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.sourceUrl).toMatch(/^https:/);
    expect(artifact.previewUrl).toMatch(/^https:/);
  });
});
