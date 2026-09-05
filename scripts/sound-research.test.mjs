import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectWave, sha256 } from './sound-research.mjs';
import { verifyMatch, safeScratchPath, prefixes } from './check-sound-availability.mjs';

function wave(data = Buffer.from([1, 2, 3, 4])) {
  const file = Buffer.alloc(44 + data.length + data.length % 2);
  file.write('RIFF'); file.writeUInt32LE(file.length - 8, 4); file.write('WAVE', 8);
  file.write('fmt ', 12); file.writeUInt32LE(16, 16); file.writeUInt16LE(1, 20);
  file.writeUInt16LE(1, 22); file.writeUInt32LE(11000, 24); file.writeUInt32LE(11000, 28);
  file.writeUInt16LE(1, 32); file.writeUInt16LE(8, 34);
  file.write('data', 36); file.writeUInt32LE(data.length, 40); data.copy(file, 44);
  return file;
}

test('hashes complete original WAV, not just audible samples', () => {
  const original = wave(), changed = Buffer.from(original);
  changed.writeUInt32LE(11025, 24);
  assert.notEqual(inspectWave(original).sha256, inspectWave(changed).sha256);
  assert.equal(inspectWave(original).chunks[1].sha256, inspectWave(changed).chunks[1].sha256);
});

test('preserves odd data padding and unusual original 11000 Hz sample rate', () => {
  const file = wave(Buffer.from([1, 2, 3]));
  const result = inspectWave(file);
  assert.equal(result.bytes, 48);
  assert.equal(result.sampleRate, 11000);
  assert.equal(result.dataBytes, 3);
  assert.equal(result.durationSeconds, 3 / 11000);
  assert.equal(result.trailingBytes, 0);
});

test('rejects non-WAV files and truncated chunk data', () => {
  assert.throws(() => inspectWave(Buffer.from('not-a-wav-file')), /Not a RIFF/);
  assert.throws(() => inspectWave(wave().subarray(0, 45)), /Truncated RIFF/);
  const malformed = wave(); malformed.writeUInt32LE(9999, 40);
  assert.throws(() => inspectWave(malformed), /Truncated data/);
});

test('retains and hashes bytes outside the RIFF container', () => {
  const original = wave(), withTrailer = Buffer.concat([original, Buffer.from('trailer')]);
  assert.equal(inspectWave(withTrailer).trailingBytes, 7);
  assert.notEqual(inspectWave(original).sha256, inspectWave(withTrailer).sha256);
});

test('accepts an official match only after checking both identities', () => {
  const file = wave(), content_uri = prefixes[0] + file.toString('base64');
  const record = { transaction_hash: `0x${'1'.repeat(64)}`, content_uri, block_timestamp: '1688074379', block_number: '17587656', transaction_index: '147' };
  const result = verifyMatch(record, sha256(file), sha256(Buffer.from(content_uri)));
  assert.equal(result.rawBytesVerified, true);
  assert.equal(result.blockNumber, 17587656);
  assert.throws(() => verifyMatch(record, '0'.repeat(64), sha256(Buffer.from(content_uri))), /original file/);
  assert.throws(() => verifyMatch(record, sha256(file), '0'.repeat(64)), /protocol hash/);
  assert.throws(() => verifyMatch({ ...record, transaction_hash: 'bad' }, sha256(file), sha256(Buffer.from(content_uri))), /Ethscription ID/);
});

test('research scans cannot read secrets or binaries outside the designated scratch root', () => {
  assert.ok(safeScratchPath('.tools/research/sounds/aol/aol10/gotmail.wav'));
  assert.throws(() => safeScratchPath('.secrets/deploy.env'), /Only ignored/);
  assert.throws(() => safeScratchPath('.tools/research/sounds/../../outside'), /Only ignored/);
  assert.throws(() => safeScratchPath('.tools/research/sounds-backup/other.wav'), /Only ignored/);
});
