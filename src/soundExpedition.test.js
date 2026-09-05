import { soundExpedition, soundTargets } from './soundExpedition';
import { MAX_STANDARD_FILE_BYTES } from './ethscriptionCreation';
import commitments from '../shared/soundTargets.json';

test('defines a finite release-boundary corpus of 17 distinct exact original files', () => {
  expect(soundExpedition.id).toBe('002');
  expect(soundTargets).toHaveLength(17);
  expect(new Set(soundTargets.map(t => t.id)).size).toBe(17);
  expect(new Set(soundTargets.map(t => t.sha256)).size).toBe(17);
  expect(new Set(soundTargets.map(t => t.release)).size).toBe(5);
  for (const target of soundTargets) {
    expect(target.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(target.canonicalProtocolSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(target.bytes).toBeGreaterThan(0);
    expect(target.bytes).toBeLessThanOrEqual(MAX_STANDARD_FILE_BYTES);
    expect(target.sampleRate).toBeGreaterThan(0);
    expect(target.durationSeconds).toBeGreaterThan(0);
    expect(target.fileName).toMatch(/\.wav$/i);
    expect(target.sourceUrl).toMatch(/^https:\/\//);
    expect(target.sourceUrl).not.toMatch(/\.(wav|exe|7z|zip)$/i);
    const commitment = commitments.targets.find(item => item.id === target.id);
    expect(target.expeditionId).toBe(commitments.expeditionId);
    expect(target.filename).toBe(commitment.filename);
    expect(target.sha256).toBe(commitment.rawSha256);
    expect(target.bytes).toBe(commitment.byteLength);
    expect(target.canonicalPrefix).toBe('data:audio/wav;base64,');
    expect(target.canonicalProtocolSha256).toBe(commitment.protocolContentSha256);
    expect(target.status).toBe(commitment.ethscriptionId ? 'secured' : 'open');
  }
});

test('keeps the founder’s complete WAV identity and unusual sample rate intact', () => {
  const target = soundTargets.find(t => t.id === 'aol-got-mail-1993');
  expect(target.sha256).toBe('de26a6726130fedd92a220dce0246b8f0d1ab3b1b040ec56800f99903259a679');
  expect(target.ethscriptionId).toBe('0x7802ddffee8b4a11a14f60c824135f9aa119a82e021246d022eec8eff8ddb357');
  expect(target.bytes).toBe(9946);
  expect(target.sampleRate).toBe(11000);
});

test('keeps AIM version limits and incomplete global wrapper coverage explicit', () => {
  for (const target of soundTargets.filter(t => t.id.startsWith('aim-'))) {
    expect(target.release).toContain('4.1.2010');
    expect(target.year).toBe('2000');
    expect(target.provenanceNote).toContain('not a claim');
  }
  expect(soundExpedition.availabilityNote).toContain('Snapshot');
  expect(soundExpedition.availabilityNote).toContain('Alternate wrappers');
});
