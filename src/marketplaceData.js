import { artifacts } from './huntData';
import { soundTargets } from './soundExpedition';
import core from './eburpWalletCatalogue.json';
import { mergeVerifiedFindings, fetchVerifiedFindings } from './findingApi';
import { MARKET_ADDRESS } from './marketConfig';
import { matchesArtifactRecord } from './artifactIdentity';

export const marketplaceExpeditions = [
  { id: 'youve-got-history', number: '002', title: 'You’ve Got History' },
  { id: 'lost-pixels-of-satoshi', number: '001', title: 'The Lost Pixels of Satoshi' },
  { id: 'eburp', number: '000', title: 'EBURP: Before the Punks' },
];
const types = {
  'image/png': ['png', 'PNG image'], 'image/jpeg': ['jpeg', 'JPEG image'], 'image/jpg': ['jpeg', 'JPEG image'],
  'image/gif': ['gif', 'GIF image'], 'image/svg+xml': ['svg', 'Vector image (SVG)'],
  'image/x-icon': ['ico', 'Windows icon (ICO)'], 'image/vnd.microsoft.icon': ['ico', 'Windows icon (ICO)'],
  'image/x-xpixmap': ['xpm', 'Unix pixmap (XPM)'], 'image/x-xpm': ['xpm', 'Unix pixmap (XPM)'],
  'image/xpm': ['xpm', 'Unix pixmap (XPM)'], 'text/x-xpm': ['xpm', 'Unix pixmap (XPM)'],
  'audio/wav': ['wav', 'WAV audio'], 'audio/x-wav': ['wav', 'WAV audio'], 'audio/wave': ['wav', 'WAV audio'],
  'audio/mpeg': ['mp3', 'MP3 audio'], 'text/plain': ['text', 'Plain text'],
  'text/html': ['html', 'HTML document'], 'application/xhtml+xml': ['html', 'HTML document'],
};
export function fileType(mime) {
  const normalized = String(mime || '').toLowerCase().replace(/^data:/, '').split(/[;,]/)[0].trim();
  const [id, label] = types[normalized] || (normalized.startsWith('audio/') ? ['audio', 'Other audio']
    : normalized.startsWith('video/') ? ['video', 'Video'] : normalized.startsWith('image/') ? ['image', 'Other image'] : ['other', 'Other file']);
  return { id, label };
}
export function recognizedCatalogue(satoshi = [], sounds = []) {
  return [
    ...mergeVerifiedFindings(artifacts, satoshi).map(item => ({ ...item, expeditionId: 'lost-pixels-of-satoshi' })),
    ...mergeVerifiedFindings(soundTargets, sounds),
    ...core.artifacts.map(item => ({ ...item, contentSha: item.protocolContentSha256 })),
  ].filter(item => item.ethscriptionId).map(item => ({ ...item,
    recordProtocolSha256: item.contentSha || item.recordProtocolSha256,
  }));
}
export function joinMarketplace(records, catalogue) {
  const known = new Map(catalogue.map(item => [item.ethscriptionId.toLowerCase(), item]));
  const seen = new Set();
  return records.flatMap(record => {
    const id = record.transactionHash?.toLowerCase();
    const artifact = known.get(id);
    if (!artifact || seen.has(id) || record.currentOwner?.toLowerCase() !== MARKET_ADDRESS.toLowerCase()
      || !matchesArtifactRecord(record, artifact)) return [];
    const expedition = marketplaceExpeditions.find(item => item.id === artifact.expeditionId);
    if (!expedition) return [];
    seen.add(id);
    return [{ ...record, artifact, expedition, type: fileType(record.mimetype),
      name: artifact.name || artifact.filename || artifact.fileName || artifact.title || 'Digital artifact',
      href: `/expeditions/${expedition.id}?artifact=${encodeURIComponent(artifact.id)}#record-${encodeURIComponent(artifact.id)}`,
    }];
  });
}
export function listed(record, now = Date.now()) {
  const listing = record.listing;
  return Boolean(listing?.active && !listing.expired && /^\d+$/.test(listing.priceWei)
    && BigInt(listing.priceWei) > 0n && (!listing.expiry || listing.expiry * 1000 > now));
}
export function formatPrice(value) {
  if (!/^\d+$/.test(String(value))) return '—';
  const price = BigInt(value), unit = 10n ** 18n;
  const fraction = (price % unit).toString().padStart(18, '0').replace(/0+$/, '');
  return `${price / unit}${fraction ? `.${fraction}` : ''}`;
}
export const defaultControls = { q: '', status: 'all', expedition: 'all', type: 'all', sort: 'price-low', view: 'grid' };
export function readControls(search) {
  const params = new URLSearchParams(search);
  return { q: (params.get('q') || '').slice(0, 200), status: params.get('status') === 'listed' ? 'listed' : 'all',
    expedition: marketplaceExpeditions.some(item => item.id === params.get('expedition')) ? params.get('expedition') : 'all',
    type: /^(png|jpeg|gif|svg|ico|xpm|wav|mp3|text|html|audio|video|image|other)$/.test(params.get('type')) ? params.get('type') : 'all',
    sort: ['price-low', 'price-high', 'newest', 'name'].includes(params.get('sort')) ? params.get('sort') : 'price-low',
    view: params.get('view') === 'list' ? 'list' : 'grid' };
}
export function filterMarketplace(items, controls, now = Date.now()) {
  const query = controls.q.trim().toLowerCase();
  return items.filter(item => (controls.status !== 'listed' || listed(item, now))
    && (controls.expedition === 'all' || item.expedition.id === controls.expedition)
    && (controls.type === 'all' || item.type.id === controls.type)
    && (!query || [item.name, item.artifact.title, item.artifact.release, item.expedition.title, item.transactionHash, item.ethscriptionNumber, item.type.label].join(' ').toLowerCase().includes(query)))
    .sort((left, right) => {
      if (controls.sort.startsWith('price-')) {
        const aListed = listed(left, now), bListed = listed(right, now);
        if (aListed !== bListed) return aListed ? -1 : 1;
        if (aListed) {
          const a = BigInt(left.listing.priceWei), b = BigInt(right.listing.priceWei);
          if (a !== b) return (a < b ? -1 : 1) * (controls.sort === 'price-high' ? -1 : 1);
        }
      }
      if (controls.sort === 'newest') {
        const difference = (Number(right.blockNumber) || 0) - (Number(left.blockNumber) || 0);
        if (difference) return difference;
      }
      return left.name.localeCompare(right.name) || left.transactionHash.localeCompare(right.transactionHash);
    });
}

export async function loadMarketplace({ signal, fetchImpl = fetch } = {}) {
  const findingReads = Promise.allSettled(marketplaceExpeditions.filter(item => item.id !== 'eburp')
    .map(item => fetchVerifiedFindings((url, options) => fetchImpl(url, { ...options, signal }), item.id)));
  const records = [], seenPages = new Set();
  let pageKey = '', market, checkedAt, complete = false;
  // Safety bound is explicit in the UI; never silently claim a truncated scan is complete.
  for (let page = 0; page < 20; page += 1) {
    const response = await fetchImpl(`/api/market/browse${pageKey ? `?page_key=${encodeURIComponent(pageKey)}` : ''}`, { signal });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload?.result?.records) || !payload.result.pagination) throw new Error('The marketplace inventory could not be refreshed.');
    const result = payload.result;
    records.push(...result.records); market = result.market; checkedAt = result.checkedAt;
    if (!result.pagination.hasMore) { complete = true; break; }
    pageKey = result.pagination.pageKey;
    if (!/^0x[a-f0-9]{64}$/i.test(pageKey || '') || seenPages.has(pageKey)) throw new Error('The inventory returned a repeated or invalid page.');
    seenPages.add(pageKey);
  }
  const findings = await findingReads;
  // Requests above are [002,001]. A missing feed is visible, not interpreted as zero Findings.
  const missingFeeds = findings.some(item => item.status === 'rejected');
  const catalogue = recognizedCatalogue(findings[1].status === 'fulfilled' ? findings[1].value : [], findings[0].status === 'fulfilled' ? findings[0].value : []);
  return { items: joinMarketplace(records, catalogue), checkedAt, market, complete, missingFeeds };
}
