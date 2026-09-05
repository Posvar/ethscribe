import { createHash } from 'node:crypto';
import manifest from '../research/expedition-000/manifest.json';
import { eburpExpedition } from './eburpExpedition';

const digest = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex');
const { artifacts } = eburpExpedition;

test('publishes a completed 216-record archive without reopening submissions', () => {
  expect(eburpExpedition).toMatchObject({ number: '000', path: '/expeditions/eburp', status: 'complete', submissionsOpen: false, localOnly: false, archiveBurnVerified: false });
  expect(eburpExpedition.counts).toEqual({ total: 216, core: 92, archive: 124 });
  expect(artifacts.map(record => record.index)).toEqual(Array.from({ length: 216 }, (_, index) => index));
  for (const field of ['id', 'ethscriptionId', 'rawSha256']) expect(new Set(artifacts.map(record => record[field])).size).toBe(216);
});

test('every preview retains the complete native PNG and both exact identity hashes', () => {
  for (const artifact of artifacts) {
    expect(artifact.contentUri).toMatch(/^data:image\/png;base64,/);
    const bytes = Buffer.from(artifact.contentUri.split(',')[1], 'base64');
    expect(bytes.length).toBe(artifact.byteLength);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.readUInt32BE(16)).toBe(16);
    expect(bytes.readUInt32BE(20)).toBe(16);
    expect(bytes.subarray(-12).toString('hex')).toBe('0000000049454e44ae426082');
    expect(digest('sha256', bytes)).toBe(artifact.rawSha256);
    expect(digest('sha256', artifact.contentUri)).toBe(artifact.canonicalProtocolSha256);
    expect(artifact.ethscriptionId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(artifact.contentUri).toBe(manifest.artifacts[artifact.index].contentUri);
  }
});

test('core source proofs match raw hashes and the first-commit Git blob identities', () => {
  const core = artifacts.filter(record => record.collectionGroup === 'core');
  expect(core).toHaveLength(92);
  for (const artifact of core) {
    const bytes = Buffer.from(artifact.contentUri.split(',')[1], 'base64');
    const blob = Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]);
    expect(artifact.verifiedSourceMatch).toBe(true);
    expect(artifact.sourceVerification).toMatchObject({ status: 'exact-byte-match', byteLength: bytes.length, rawSha256: artifact.rawSha256 });
    expect(artifact.sourceUrl).toContain(manifest.collection.sourceCommit);
    expect(artifact.firstCommitVerification).toMatchObject({ status: 'git-blob-match', sourceCommit: manifest.collection.firstSourceCommit, gitBlobSha1: digest('sha1', blob) });
    expect(artifact.firstCommitVerification.matchingPngPaths).toContain(artifact.sourcePath);
  }
});

test('archive records preserve metadata without inventing filenames, source proofs or burn verification', () => {
  const archive = artifacts.filter(record => record.collectionGroup === 'archive');
  expect(archive).toHaveLength(124);
  for (const artifact of archive) {
    expect(artifact.sourceUrl).toBeNull();
    expect(artifact.sourcePath).toBeNull();
    expect(artifact.filename).toBeNull();
    expect(artifact.verifiedSourceMatch).toBe(false);
    expect(artifact.firstCommitVerification.status).toBe('no-matching-png-blob');
    expect(artifact.firstCommitVerification.matchingPngPaths).toEqual([]);
    for (const field of ['name', 'description', 'type', 'heroClass']) expect(artifact[field]).toBe(manifest.artifacts[artifact.index][field]);
  }
  expect(artifacts[176].heroClass).toBe('Wario');
});

test('API audit coverage is explicit and dated ownership is never promoted to live custody', () => {
  const verified = artifacts.filter(record => record.protocolVerification.verified);
  const unchecked = artifacts.filter(record => !record.protocolVerification.verified);
  expect(verified).toHaveLength(62);
  expect(unchecked).toHaveLength(154);
  expect(eburpExpedition.verification.officialRecordVerifiedCount).toBe(verified.length);
  expect(eburpExpedition.verification.officialRecordNotRecheckedCount).toBe(unchecked.length);
  for (const record of verified) {
    expect(record.protocolVerification).toMatchObject({ status: 'verified-official-record', recordIdMatch: true, dataUriMatch: true, rawBytesMatch: true, contentHashMatch: true });
    expect(record.creator).toMatch(/^0x[a-f0-9]{40}$/i);
    expect(record.ethscribedAt).toBeTruthy();
  }
  for (const record of unchecked) {
    expect(record.protocolVerification.status).toBe('not-checked');
    expect(record.creator).toBeUndefined();
    expect(record.ethscribedAt).toBeUndefined();
  }
  for (const record of artifacts) {
    for (const field of ['currentOwnerSnapshot', 'currentOwner', 'seller', 'listing', 'custodyVerified', 'burnVerified']) expect(record).not.toHaveProperty(field);
  }
});
