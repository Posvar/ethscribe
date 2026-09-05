const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const { artifacts, collection } = manifest;
assert.equal(artifacts.length, 216);
assert.equal(collection.count, 216);
const indices = new Set();
const ids = new Set();
const rawHashes = new Set();
for (const artifact of artifacts) {
  const prefix = 'data:image/png;base64,';
  assert.ok(artifact.contentUri.startsWith(prefix));
  const encoded = artifact.contentUri.slice(prefix.length);
  const bytes = Buffer.from(encoded, 'base64');
  assert.equal(bytes.toString('base64'), encoded);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), 16);
  assert.equal(bytes.readUInt32BE(20), 16);
  assert.equal(artifact.width, 16);
  assert.equal(artifact.height, 16);
  assert.equal(bytes.length, artifact.byteLength);
  assert.equal(sha(bytes), artifact.rawSha256);
  assert.equal(sha(artifact.contentUri), artifact.canonicalProtocolSha256);
  assert.equal(artifact.id, 'eburp-' + String(artifact.index).padStart(4, '0'));
  assert.match(artifact.ethscriptionId, /^0x[a-fA-F0-9]{64}$/);
  assert.equal(artifact.collectionGroup, artifact.index < 92 ? 'core' : 'archive');
  if (artifact.collectionGroup === 'core') {
    assert.equal(artifact.verifiedSourceMatch, true);
    assert.equal(artifact.sourceVerification.rawSha256, artifact.rawSha256);
    assert.equal(artifact.sourceVerification.byteLength, artifact.byteLength);
    assert.ok(artifact.sourceUrl.includes(collection.sourceCommit));
    assert.equal(artifact.firstCommitVerification.status, 'git-blob-match');
    const gitBlobHash = crypto.createHash('sha1')
      .update(Buffer.from('blob ' + bytes.length + '\0'))
      .update(bytes).digest('hex');
    assert.equal(gitBlobHash, artifact.firstCommitVerification.gitBlobSha1);
  } else {
    assert.equal(artifact.sourcePath, null);
    assert.equal(artifact.filename, null);
    assert.equal(artifact.sourceUrl, null);
    assert.equal(artifact.verifiedSourceMatch, false);
  }
  if (artifact.verifiedEthscription) {
    assert.equal(artifact.protocolVerification.status, 'verified-official-record');
    for (const key of ['recordIdMatch', 'dataUriMatch', 'rawBytesMatch', 'contentHashMatch']) {
      assert.equal(artifact.protocolVerification[key], true);
    }
  } else {
    assert.equal(artifact.protocolVerification.status, 'not-checked');
  }
  assert.equal('currentOwner' in artifact, false);
  if (artifact.currentOwnerSnapshot) {
    assert.ok(Number.isFinite(Date.parse(artifact.currentOwnerSnapshot.checkedAt)));
  }
  assert.ok(!indices.has(artifact.index));
  assert.ok(!ids.has(artifact.ethscriptionId.toLowerCase()));
  assert.ok(!rawHashes.has(artifact.rawSha256));
  indices.add(artifact.index);
  ids.add(artifact.ethscriptionId.toLowerCase());
  rawHashes.add(artifact.rawSha256);
}
for (let index = 0; index < 216; index++) assert.ok(indices.has(index));
assert.equal(artifacts.filter(a => a.collectionGroup === 'core').length, 92);
assert.equal(artifacts.filter(a => a.collectionGroup === 'archive').length, 124);
assert.equal(artifacts.filter(a => a.verifiedEthscription).length, 62);
assert.equal(collection.verification.sourceMatchedCount, 92);
assert.equal(collection.verification.officialRecordVerifiedCount, 62);
assert.equal(collection.verification.officialRecordNotRecheckedCount, 154);
console.log('216 EBURP records verified locally: native PNGs, raw/protocol hashes, unique IDs, groups and evidence counts.');
