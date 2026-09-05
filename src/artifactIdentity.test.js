import { matchesArtifactRecord } from './artifactIdentity';

const artifact = { ethscriptionId: `0x${'1'.repeat(64)}`, recordProtocolSha256: 'a'.repeat(64) };
const record = { transactionHash: artifact.ethscriptionId, contentSha: artifact.recordProtocolSha256 };

test('binds imported catalogue IDs to their known complete payload identity', () => {
  expect(matchesArtifactRecord(record, artifact)).toBe(true);
  expect(matchesArtifactRecord({ ...record, contentSha: `0x${'A'.repeat(64)}` }, artifact)).toBe(true);
});

test.each([
  null,
  { ...record, transactionHash: `0x${'2'.repeat(64)}` },
  { ...record, contentSha: undefined },
  { ...record, contentSha: 'b'.repeat(64) },
])('rejects missing, mismatched or unproven records %#', candidate => {
  expect(matchesArtifactRecord(candidate, artifact)).toBe(false);
});

test('keeps recognized existing targets compatible without weakening explicitly pinned hashes', () => {
  expect(matchesArtifactRecord(record, { ethscriptionId: artifact.ethscriptionId })).toBe(true);
  expect(matchesArtifactRecord(record, { ...artifact, recordProtocolSha256: '' })).toBe(false);
  expect(matchesArtifactRecord({}, {})).toBe(false);
});

test('does not confuse a hunt’s preferred new-creation wrapper with a recognized ID’s actual wrapper', () => {
  expect(matchesArtifactRecord(record, { ethscriptionId: artifact.ethscriptionId, canonicalProtocolSha256: 'b'.repeat(64) })).toBe(true);
});
