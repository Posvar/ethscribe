// Optional local integration check. Requires ignored research binaries.
// Every upstream response and storage write is mocked; this script never sends
// a transaction, queries a live service, or writes a real Azure blob.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Wallet } from 'ethers';
import { loadReferences, safeScratchPath } from './check-sound-availability.mjs';
import { sha256 } from './sound-research.mjs';

const require = createRequire(import.meta.url);
const { assignmentMessage, FindingError, validateAssignment, verifyAndStoreFinding } = require('../netlify/lib/finding');
const { MARKET_ADDRESS } = require('../netlify/lib/market');
const commitments = require('../shared/soundTargets.json');
const targets = new Map(commitments.targets.map(target => [target.id, target]));
const now = Date.now();
const signer = Wallet.createRandom();
globalThis.fetch = async () => { throw new Error('Unexpected network request: all network access is forbidden in this check.'); };
let accepted = 0, rejected = 0;

for (const [index, reference] of (await loadReferences()).entries()) {
  const target = targets.get(reference.id);
  assert.ok(target, `Missing shared commitment: ${reference.id}`);
  const bytes = await readFile(safeScratchPath(reference.scratchPath));
  const contentUri = target.canonicalPrefix + bytes.toString('base64');
  assert.equal(sha256(bytes), target.rawSha256);
  assert.equal(sha256(Buffer.from(contentUri)), target.protocolContentSha256);
  const ethscriptionId = `0x${(index + 1).toString(16).padStart(64, '0')}`;
  const assignment = {
    schemaVersion: 1, documentType: 'finding', expeditionId: commitments.expeditionId,
    targetId: target.id, ethscriptionId, rawSha256: `0x${target.rawSha256}`,
    protocolContentSha256: `0x${target.protocolContentSha256}`, dataUriPrefix: target.canonicalPrefix,
    byteLength: bytes.length, filename: target.filename, authorAddress: signer.address.toLowerCase(),
    custodyContract: MARKET_ADDRESS.toLowerCase(), claimSummary: 'Local deterministic file integration test.',
    sourceReferences: ['https://example.invalid/local-research-fixture'], createdAt: new Date(now).toISOString(),
  };
  const message = assignmentMessage(assignment), signature = await signer.signMessage(message);
  const upstream = {
    transaction_hash: ethscriptionId, content_sha: assignment.protocolContentSha256, content_uri: contentUri,
    current_owner: MARKET_ADDRESS, previous_owner: signer.address, creator: signer.address,
    block_timestamp: 1700000000, ethscription_number: index + 1,
  };
  const writes = [];
  const dependencies = {
    now, env: {}, fetchImpl: async () => Response.json({ result: upstream }),
    getArtifactMarket: async id => ({ ethscription: { transactionHash: id }, seller: signer.address, custody: { verified: true } }),
    storeFinding: async (path, record) => { writes.push({ path, record }); },
  };
  const result = await verifyAndStoreFinding({ assignment, message, signature }, dependencies);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, `hunts/${commitments.expeditionId}/findings/${target.id}--${ethscriptionId.slice(2)}/finding.json`);
  assert.equal(result.expeditionId, commitments.expeditionId);
  assert.equal(result.filename, target.filename);
  assert.equal(result.contentUri, contentUri);
  accepted += 1;

  // One altered byte cannot reuse the original reference commitment, nor can
  // an indexer response with changed bytes hide behind the claimed old hash.
  const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1;
  assert.throws(() => validateAssignment({ ...assignment, rawSha256: `0x${sha256(changed)}` }, now, {}),
    error => error instanceof FindingError && error.code === 'target_mismatch');
  await assert.rejects(verifyAndStoreFinding({ assignment, message, signature }, {
    ...dependencies,
    fetchImpl: async () => Response.json({ result: { ...upstream, content_uri: target.canonicalPrefix + changed.toString('base64') } }),
  }), error => error instanceof FindingError && error.code === 'indexer_mismatch');
  assert.equal(writes.length, 1, 'Rejected bytes must not create an additional stored Finding.');
  rejected += 2;

  await assert.rejects(verifyAndStoreFinding({ assignment, message, signature }, {
    ...dependencies, getArtifactMarket: async id => ({ ethscription: { transactionHash: id }, seller: signer.address, custody: { verified: false } }),
  }), error => error instanceof FindingError && error.code === 'custody_unverified');
  assert.equal(writes.length, 1, 'Unverified custody must not create an additional stored Finding.');
  rejected += 1;
  console.log(`${target.id}: full signed publication accepted in memory; altered bytes and unverified custody rejected.`);
}

assert.equal(accepted, commitments.targets.length);
console.log(`PASS: ${accepted} real reference files accepted; ${rejected} tampering/custody cases rejected. Zero live reads, writes or transactions.`);
