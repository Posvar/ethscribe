// Expedition 002: release-defined, byte-perfect sound files.
// Reference audio and historical installers are deliberately not bundled.
import aol from '../research/expedition-002/aol.json';
import windows from '../research/expedition-002/windows.json';
import messaging from '../research/expedition-002/messaging.json';
import availability from '../research/expedition-002/availability.json';
import commitments from '../shared/soundTargets.json';

const checkedById = new Map(availability.targets.map(target => [target.id, target]));
const commitmentsById = new Map(commitments.targets.map(target => [target.id, target]));
const windowsSource = 'https://winworldpc.com/download/41574932-18c3-9a11-c3a4-e284a2c3a570';
const windowsTitles = { 'TADA.WAV': 'The desktop wakes up', 'CHIMES.WAV': 'Windows signs off', 'CHORD.WAV': 'Something needs attention', 'DING.WAV': 'The familiar ding' };
const messagingReleases = {
  'icq-1.02-beta': { label: 'ICQ 1.02 Beta', year: '1996', note: 'The native Message.wav recovered from a preserved ICQ 1.02 Beta installer; its internal script and executable identify the version. The whole WAV matches a separately preserved ICQ 99b installer. Neither package has a verified publisher signature. The 1996 label is version/build context, not proof of the first recording or an exact public release day.' },
  'msn-1.0.0863': { label: 'MSN Messenger 1.0.0863', year: '1999', note: 'Extracted without running the launch-version installer. Windows verifies Microsoft’s signature on the untouched package; its own msmsgs.inf maps this WAV to the corresponding event. The same file also survives unchanged in signed build 1.0.0893. Microsoft announced download availability for July 22, 1999.' },
  'aim-4.1.2010': { label: 'AOL Instant Messenger 4.1.2010', year: '2000', note: 'Extracted without running the preserved installer, whose AOL signature Windows verifies. The included installation script records this original sound path; the program identifies itself as version 4.1.2010. These are verified 2000-release bytes, not a claim that they have been proven identical to the 1997 launch version.' },
};

const sourceTargets = [
  ...windows.targets.map(target => ({
    ...target, fileName: target.filename, title: windowsTitles[target.filename.toUpperCase()] || target.title,
    release: 'Windows 3.1 · the desktop prologue', year: '1992', bytes: target.byteLength,
    sourceLabel: 'Windows 3.1 retail 3.10.103 · preserved disks', sourceUrl: windowsSource,
    sourcePath: `${target.filename.toUpperCase() === 'DING.WAV' ? 'Disk05' : 'Disk03'}.img / ${target.filename.replace(/wav$/i, 'WA_')} → ${target.filename}`,
    provenanceNote: 'Losslessly expanded from the original compressed disk member. The same release’s SETUP.INF lists this file and maps it to a Windows sound event. The archive checksum and every extracted file hash are recorded. These are third-party-preserved, unsigned disk images, not a publisher-signed chain of custody. Microsoft dates Windows 3.1’s release to April 6, 1992.',
  })),
  ...aol.targets.map(target => ({
    ...target, fileName: target.filename, release: 'America Online 1.0 for Windows', year: '1993', bytes: target.byteLength,
    sourceLabel: 'AOL 1.0 Windows · preserved floppy', sourceUrl: aol.sources[0].catalogUrl,
    sourcePath: `AOL_1.0.img / ${target.compressedMember} → ${target.filename}`,
    provenanceNote: `One of the five sounds listed in AOL 1.0’s own installation manifest. Lossless expansion preserves the complete WAV, including its original headers and padding. All five compressed members also match the preserved 1.1 disk. Both images come from the same archive; they are not publisher-signed. ${target.knownEthscriptionId ? 'The founder’s June 2023 Ethscription matches this complete file exactly. ' : ''}The Windows general-availability announcement is dated January 20, 1993; the 1992 disk timestamps do not independently establish release priority.`,
  })),
  ...messaging.targets.map(target => {
    const release = messagingReleases[target.packageId];
    const source = messaging.packages.find(pkg => pkg.id === target.packageId);
    return {
      ...target, title: target.title.replace(/^.*? — /, ''), fileName: target.historicalPath.split('/').pop(),
      release: release.label, year: release.year, bytes: target.size,
      sourceLabel: source.product, sourceUrl: source.sourcePage,
      sourcePath: target.historicalPath, provenanceNote: release.note,
      canonicalProtocolSha256: target.protocolSha256,
    };
  }),
];

export const soundTargets = sourceTargets.map(target => {
  const commitment = commitmentsById.get(target.id);
  const check = checkedById.get(target.id);
  const canonical = check?.wrappers[0];
  const existing = canonical?.status === 'found' && canonical.ethscription.id === commitment.ethscriptionId ? canonical.ethscription : null;
  return {
    id: target.id, expeditionId: commitments.expeditionId, expeditionNumber: '002',
    title: target.title, fileName: commitment.filename, filename: commitment.filename,
    release: target.release, year: target.year, date: target.year, format: 'WAV',
    bytes: commitment.byteLength, byteLength: commitment.byteLength,
    sha256: commitment.rawSha256, rawSha256: commitment.rawSha256,
    canonicalProtocolSha256: commitment.protocolContentSha256,
    protocolContentSha256: `0x${commitment.protocolContentSha256}`, contentSha: `0x${commitment.protocolContentSha256}`,
    mediaType: commitment.mediaType, canonicalPrefix: commitment.canonicalPrefix, dataUriPrefix: commitment.canonicalPrefix,
    validationMode: 'exact', status: commitment.ethscriptionId ? 'secured' : 'open',
    sampleRate: target.sampleRate, channels: target.channels, bitsPerSample: target.bitsPerSample, durationSeconds: target.durationSeconds,
    sourceLabel: target.sourceLabel, sourceUrl: target.sourceUrl, sourcePath: target.sourcePath, provenanceNote: target.provenanceNote,
    note: target.provenanceNote,
    ethscriptionId: commitment.ethscriptionId,
    ethscriptionNumber: existing?.number ?? null, creator: existing?.creator || '',
    ethscribedAt: existing?.createdAt ? `${new Date(existing.createdAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }).toUpperCase()} UTC` : null,
    previewUrl: commitment.ethscriptionId ? `/api/ethscriptions/media/${commitment.ethscriptionId}` : '',
    canonicalStatus: canonical?.status || 'unavailable', checkedAt: check?.checkedAt || null,
  };
});

export const soundExpedition = {
  id: '002', slug: 'youve-got-history', title: 'You’ve Got History',
  status: 'active', path: '/expeditions/youve-got-history',
  subtitle: 'The sounds of going online, 1992–2000.',
  intro: 'Before the feed, there was a sound: the desktop waking up, a voice announcing mail, a door opening when a friend arrived. Recover the tiny original files that made the information superhighway feel human—not new recordings of them.',
  scopeNote: '17 exact-file targets across five release-defined families. Keep every original byte—including headers and metadata. A byte match establishes equality with the documented source, not copyright ownership or proof of the earliest recording.',
  availabilityNote: `The reference scan found five canonical Ethscriptions and 12 unmatched canonical payloads. Snapshot: ${availability.completedAt.slice(0, 10)} UTC. Alternate wrappers and later submissions can change the picture; every submission checks again.`,
  targets: soundTargets,
  sources: [
    { title: 'Microsoft’s Windows 3.1 release history', url: 'https://learn.microsoft.com/en-us/shows/history/history-of-microsoft-1992', note: 'April 6, 1992. The disk’s SETUP.INF supplies the event-to-file mappings; preserved package and member hashes are in the local research manifest.' },
    { title: 'AOL announces its Windows service', url: aol.historicalSourceUrl, note: 'The January 20, 1993 AOL/PRNewswire announcement, preserved as a republication. The 1989 voice-recording story does not independently date a particular WAV file.' },
    { title: 'Microsoft launches MSN Messenger', url: 'https://news.microsoft.com/source/1999/07/21/microsoft-launches-msn-messenger-service/', note: 'A first-party announcement establishing July 22, 1999 download availability. Original signed installer bytes establish the selected files.' },
  ],
};

export default soundExpedition;
