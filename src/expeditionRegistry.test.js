import { artifactRecordHref, catalogueArtifacts, expeditionArtifactById, getExpedition } from './expeditionRegistry';

test('scopes artifact lookup and links by expedition, not merely target ID', () => {
  expect(getExpedition('youve-got-history').number).toBe('002');
  expect(expeditionArtifactById('youve-got-history', 'aol-got-mail-1993').filename).toBe('GOTMAIL.WAV');
  expect(expeditionArtifactById('lost-pixels-of-satoshi', 'aol-got-mail-1993')).toBeNull();
  expect(expeditionArtifactById('youve-got-history', 'original-bc-ico')).toBeNull();
  expect(artifactRecordHref('youve-got-history', 'aol-got-mail-1993')).toBe('/expeditions/youve-got-history?artifact=aol-got-mail-1993#record-aol-got-mail-1993');
  expect(artifactRecordHref('lost-pixels-of-satoshi', 'original-bc-ico')).toBe('/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico#record-original-bc-ico');
  expect(artifactRecordHref('../elsewhere', 'aol-got-mail-1993')).toBeNull();
  expect(artifactRecordHref('youve-got-history', '../elsewhere')).toBeNull();
});

test('recognizes all five founder AOL artifacts without needing replacement Findings', () => {
  const founders = catalogueArtifacts.filter(artifact => artifact.expeditionId === 'youve-got-history' && artifact.status === 'secured');
  expect(founders).toHaveLength(5);
  expect(founders.every(artifact => artifact.ethscriptionId && artifact.format === 'WAV')).toBe(true);
});
