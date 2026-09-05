// Published completed-collection adapter. Existing Ethscriptions retain their
// identities; this archive does not accept new hunt submissions.
import manifest from '../research/expedition-000/manifest.json';
export { eburpStory } from './eburpStory';

const artifacts = manifest.artifacts.map(artifact => {
  const protocol = artifact.protocolVerification || {};
  const verified = artifact.verifiedEthscription === true && protocol.status === 'verified-official-record'
    && protocol.recordIdMatch && protocol.dataUriMatch && protocol.rawBytesMatch && protocol.contentHashMatch;
  // Research ownership observations must never become the page's live state.
  const { currentOwnerSnapshot, ...record } = artifact;
  return {
    ...record,
    recordProtocolSha256: artifact.canonicalProtocolSha256,
    protocolVerification: { ...protocol, verified: Boolean(verified) },
    ethscribedAt: verified ? artifact.ethscribedAt : undefined,
    creator: verified ? artifact.creator : undefined,
    provenanceNote: artifact.collectionGroup === 'core'
      ? `This complete PNG matches its source path in EBURP’s first repository commit, dated 1 November 2013 (${manifest.collection.firstSourceCommit}), and the independently checked later revision. Its color profile, compression, metadata and original bytes are retained. This dates the surviving file in the repository, not the original creation of the artwork.`
      : 'Preserved from the existing EBURP collection catalogue. This character belongs to the separate archival group; no original source filename or public repository file is established for it here. The curator’s 2023 essay records the group’s transfer to a burn address.',
  };
});

export const eburpExpedition = {
  id: 'eburp', number: '000', slug: 'eburp', path: '/expeditions/eburp',
  title: 'EBURP: Before the Punks',
  subtitle: 'Little characters. A much bigger history.',
  cardDescription: 'A compact on-chain record of the pixel RPG artwork Larva Labs released before CryptoPunks. EBURP preserves the 2013 open-source sprite set as Ethereum calldata, connecting early browser-game art to present-day Ethscriptions ownership.',
  intro: 'Before Cryptopunks, Matt Hall and John Watkinson were building pocket-sized worlds. This completed collection gathers 216 Gurk character sprites, including the open-sourced 92-sprite tradeable core and 124-character preservation archive sent to the Ethereum burn address. Discover the art, the original source, and the decision that drew a line between collecting and preserving.',
  era: 'LARVA LABS · GURK → ETHSCRIPTIONS',
  status: 'complete', submissionsOpen: false, localOnly: false,
  completionNote: 'Complete means this existing collection has been catalogued—not that every asset is for sale, has been freshly rechecked, or is held by the Ethscribe marketplace. No replacement Ethscriptions are needed.',
  coreNote: 'All 92 original PNGs match files in EBURP’s first public repository commit, from November 2013. These are the complete files—not re-exported versions of their pixels.',
  archiveNote: 'These 124 characters sit outside the open-source released subset. They were preserved as Ethscriptions and subsequently sent to the Ethereum burn address. They remain part of the collection’s history, not its tradeable core.',
  archiveBurnVerified: false,
  artifacts,
  counts: {
    total: artifacts.length,
    core: artifacts.filter(artifact => artifact.collectionGroup === 'core').length,
    archive: artifacts.filter(artifact => artifact.collectionGroup === 'archive').length,
  },
  verification: manifest.collection.verification,
  sources: [
    { title: 'EBURP’s original source repository', url: manifest.collection.sourceRepository },
    { title: 'The first source commit · 1 November 2013', url: `${manifest.collection.sourceRepository}/commit/${manifest.collection.firstSourceCommit}` },
    { title: 'Pinned source revision and reuse terms', url: manifest.collection.sourceReadmeUrl },
  ],
};
