import { MARKET_ADDRESS } from './marketConfig';
import { defaultControls, fileType, filterMarketplace, formatPrice, joinMarketplace, listed, loadMarketplace, readControls, recognizedCatalogue } from './marketplaceData';

const catalogue = recognizedCatalogue();
const seed = catalogue.find(item => item.expeditionId === 'lost-pixels-of-satoshi');
const record = (artifact = seed, extra = {}) => ({ transactionHash: artifact.ethscriptionId, contentSha: artifact.recordProtocolSha256,
  currentOwner: MARKET_ADDRESS, mimetype: 'image/png', ...extra });
const result = data => ({ ok: true, json: async () => ({ result: data }) });
const browse = (records, hasMore = false, pageKey = null) => ({ records, pagination: { hasMore, pageKey }, checkedAt: '2026-09-06T12:00:00Z' });

test('joins only recognized, byte-bound artifacts held by the current vault', () => {
  const core = catalogue.find(item => item.expeditionId === 'eburp');
  const records = [record(), record(), record(core), record(seed, { transactionHash: `0x${'fa'.repeat(32)}` }),
    record(core, { contentSha: '0'.repeat(64) }), record(core, { currentOwner: '0x' + '1'.repeat(40) })];
  const joined = joinMarketplace(records, catalogue);
  expect(joined).toHaveLength(2);
  expect(joined[0].href).toContain(`?artifact=${seed.id}#record-${seed.id}`);
  expect(joined[1].expedition.number).toBe('000');
  expect(catalogue.filter(item => item.expeditionId === 'eburp')).toHaveLength(92);
});

test('exact Findings join the same catalogue, recovery candidates do not', () => {
  const finding = { expeditionId: 'lost-pixels-of-satoshi', validationMode: 'exact', targetId: 'november-20-xpm', ethscriptionId: '0x' + 'ab'.repeat(32), protocolContentSha256: 'cd'.repeat(32), verifiedAt: '2026-09-06' };
  const entries = recognizedCatalogue([finding]);
  expect(entries.find(item => item.id === finding.targetId)).toMatchObject({ ethscriptionId: finding.ethscriptionId, recordProtocolSha256: finding.protocolContentSha256 });
  expect(recognizedCatalogue([{ ...finding, validationMode: 'recovery' }]).some(item => item.ethscriptionId === finding.ethscriptionId)).toBe(false);
});

test.each([
  ['data:image/x-xpixmap;base64,', 'xpm', 'Unix pixmap (XPM)'], ['text/x-xpm', 'xpm', 'Unix pixmap (XPM)'],
  ['audio/x-wav; charset=utf8', 'wav', 'WAV audio'], ['IMAGE/PNG', 'png', 'PNG image'],
  ['image/vnd.microsoft.icon', 'ico', 'Windows icon (ICO)'], ['text/plain;utf8', 'text', 'Plain text'],
])('provides friendly wrapper-independent names for %s', (mime, id, label) => expect(fileType(mime)).toEqual({ id, label }));

test('sorts exact wei prices across every item; unlisted and unknown always follow prices', () => {
  const base = joinMarketplace([record()], catalogue)[0];
  const items = ['1000000000000000001', '1000000000000000000', null].map((price, index) => ({ ...base, transactionHash: String(index), listing: price ? { active: true, priceWei: price } : null }));
  expect(filterMarketplace(items, defaultControls).map(item => item.transactionHash)).toEqual(['1', '0', '2']);
  expect(filterMarketplace(items, { ...defaultControls, sort: 'price-high' }).map(item => item.transactionHash)).toEqual(['0', '1', '2']);
  expect(formatPrice('1000000000000000001')).toBe('1.000000000000000001');
  expect(formatPrice('1')).toBe('0.000000000000000001');
});

test('expired, inactive, malformed and zero-price records are not listed', () => {
  for (const listing of [null, { active: false, priceWei: '1' }, { active: true, priceWei: '0' }, { active: true, priceWei: 'oops' }, { active: true, priceWei: '1', expiry: 10 }]) {
    expect(listed({ listing }, 11000)).toBe(false);
  }
  expect(listed({ listing: { active: true, priceWei: '5', expiry: 12 } }, 11000)).toBe(true);
});

test('combines search, listed, expedition and friendly type filters', () => {
  const base = joinMarketplace([record()], catalogue)[0];
  const item = { ...base, listing: { active: true, priceWei: '1' } };
  expect(filterMarketplace([item], { ...defaultControls, q: 'BITCOIN', status: 'listed', expedition: 'lost-pixels-of-satoshi', type: 'png' })).toHaveLength(1);
  expect(filterMarketplace([item], { ...defaultControls, type: 'wav' })).toHaveLength(0);
  expect(readControls('?sort=malicious&expedition=browser-wars&status=no&view=bad&type=bogus')).toEqual(defaultControls);
});

test('loads every vault page before sorting and excludes unrecognized deposits', async () => {
  const core = catalogue.find(item => item.expeditionId === 'eburp');
  const pageKey = '0x' + 'ff'.repeat(32);
  const fetchImpl = vi.fn(async url => url.startsWith('/api/findings') ? result([])
    : result(url.includes('page_key=') ? browse([record(core)]) : browse([record()], true, pageKey)));
  const snapshot = await loadMarketplace({ fetchImpl });
  expect(snapshot.items).toHaveLength(2);
  expect(snapshot.complete).toBe(true);
  expect(snapshot.missingFeeds).toBe(false);
  expect(fetchImpl).toHaveBeenCalledWith(`/api/market/browse?page_key=${pageKey}`, expect.any(Object));
});

test('a failed Finding feed yields an explicitly partial collection, not invented zero findings', async () => {
  const fetchImpl = vi.fn(async url => {
    if (url.startsWith('/api/findings')) throw new Error('offline');
    return result(browse([record()]));
  });
  expect(await loadMarketplace({ fetchImpl })).toMatchObject({ complete: true, missingFeeds: true });
});

test('invalid or repeated continuation rejects the partial inventory', async () => {
  const fetchImpl = vi.fn(async url => result(url.startsWith('/api/findings') ? [] : browse([record()], true, '0x' + 'ff'.repeat(32))));
  await expect(loadMarketplace({ fetchImpl })).rejects.toThrow(/repeated or invalid/);
});
