import { artifacts as satoshiArtifacts } from './huntData';
import { soundTargets } from './soundExpedition';

export const expeditions = [
  { id: 'lost-pixels-of-satoshi', number: '001', title: 'The Lost Pixels of Satoshi', path: '/expeditions/lost-pixels-of-satoshi' },
  { id: 'youve-got-history', number: '002', title: 'You’ve Got History', path: '/expeditions/youve-got-history' },
];

export const catalogueArtifacts = [
  ...satoshiArtifacts.map(artifact => ({ ...artifact, expeditionId: 'lost-pixels-of-satoshi', expeditionNumber: '001' })),
  ...soundTargets,
];

export function getExpedition(expeditionId) {
  return expeditions.find(expedition => expedition.id === expeditionId) || null;
}

export function expeditionArtifactById(expeditionId, targetId) {
  return catalogueArtifacts.find(artifact => artifact.expeditionId === expeditionId && artifact.id === targetId) || null;
}

export function artifactRecordHref(expeditionId, targetId) {
  const expedition = getExpedition(expeditionId);
  if (!expedition || !expeditionArtifactById(expeditionId, targetId)) return null;
  return `${expedition.path}?artifact=${encodeURIComponent(targetId)}#record-${encodeURIComponent(targetId)}`;
}
