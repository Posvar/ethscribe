import { eburpStory } from './eburpStory';

const chapter = id => eburpStory.chapters.find(item => item.id === id);
const paragraphCopy = paragraph => typeof paragraph === 'string'
  ? paragraph
  : paragraph.segments.map(segment => segment.text).join('');
const copyOf = item => [item.title, ...item.paragraphs.map(paragraphCopy)].join(' ');
const allCopy = [
  eburpStory.intro,
  eburpStory.rightsNote,
  ...eburpStory.chapters.map(item => `${item.date} ${copyOf(item)}`),
].join(' ');

test('provides stable, uniquely identified chapters and HTTPS evidence links', () => {
  expect(eburpStory.intro).toEqual(expect.any(String));
  expect(eburpStory.chapters).toHaveLength(5);
  expect(new Set(eburpStory.chapters.map(item => item.id)).size).toBe(5);
  for (const item of eburpStory.chapters) {
    expect(item.id).toMatch(/^[a-z0-9-]+$/);
    expect(item.date).toEqual(expect.any(String));
    expect(item.title).toEqual(expect.any(String));
    expect(item.paragraphs.length).toBeGreaterThan(0);
    for (const paragraph of item.paragraphs) {
      if (typeof paragraph === 'string') continue;
      expect(paragraph.segments.length).toBeGreaterThan(0);
      for (const segment of paragraph.segments) {
        expect(segment.text).toEqual(expect.any(String));
        expect(Object.keys(segment).every(key => key === 'text' || key === 'url')).toBe(true);
        if (segment.url) {
          const url = new URL(segment.url);
          expect(url.protocol).toBe('https:');
          expect(url.username).toBe('');
          expect(url.password).toBe('');
        }
      }
    }
    expect(item.sources.length).toBeGreaterThan(0);
    for (const source of item.sources) {
      expect(source.title).toEqual(expect.any(String));
      expect(new URL(source.url).protocol).toBe('https:');
      expect(new URL(source.url).username).toBe('');
      expect(new URL(source.url).password).toBe('');
    }
  }
});

test('dates the original Gurk lineage to 2005, not the unsupported 2004 or 1992', () => {
  expect(chapter('a-world-in-your-pocket').date).toBe('2005');
  expect(allCopy).not.toMatch(/\b(?:2004|1992)\b/);
  expect(copyOf(chapter('a-world-in-your-pocket'))).toMatch(/Matt Hall and John Watkinson/);
  expect(chapter('a-world-in-your-pocket').sources).toContainEqual(expect.objectContaining({
    url: expect.stringContaining('web.archive.org/web/20101113223953/'),
  }));
});

test('keeps the dated 2010 retrospective without the redundant date disclaimer', () => {
  expect(chapter('one-copy').date).toBe('11 NOV 2010');
  expect(copyOf(chapter('one-copy'))).toMatch(/Looking back, Hall described/);
  expect(copyOf(chapter('one-copy'))).not.toMatch(/publication date is not the game.s release date/i);
});

test('attributes the 2013 source release to John and separates Gurk III file identity', () => {
  const source = chapter('source-release');
  expect(source.date).toBe('01 NOV 2013');
  expect(copyOf(source)).toMatch(/John Watkinson published EBURP/);
  expect(copyOf(source)).toMatch(/Gurk III/);
  expect(copyOf(source)).toMatch(/files preserved in the 2013 release/i);
  expect(copyOf(source)).toMatch(/not a claim that every PNG is an unchanged file from the first handset game/i);
  for (const reference of source.sources) {
    expect(reference.url).toContain('dca3cf9a56c955ad87063253d8a34eaa38fcc002');
  }
});

test('credits the linked collector and clearly separates the core from the burned archive', () => {
  const archive = chapter('collectors-archive');
  const copy = copyOf(archive);
  expect(archive.date).toBe('2023');
  expect(copy).toMatch(/In his October 2023 essay, collector @posvar described preserving/i);
  expect(archive.paragraphs[0].segments).toContainEqual({
    text: '@posvar', url: 'https://x.com/posvar',
  });
  expect(copy).toMatch(/216 Gurk characters/);
  expect(copy).toMatch(/92-character core/);
  expect(copy).toMatch(/nine heroes, 65 enemies and 18 non-player characters/);
  expect(copy).toMatch(/other 124 characters, outside the opensource released subset/);
  expect(copy).toMatch(/preserved as ethscriptions and subsequently transferred to the Ethereum burn address/);
  expect(copy).not.toMatch(/Watkinson.s request|curator.s attribution|account of the request/);
  expect(copy).toMatch(/not its tradable core/);
  expect(archive.sources).toContainEqual(expect.objectContaining({
    url: expect.stringContaining('medium.com/@Posvar/'),
  }));
});

test('does not turn creative lineage into an official Larva Labs collection', () => {
  const punks = chapter('before-cryptopunks');
  expect(punks.date).toBe('JUN 2017');
  expect(copyOf(punks)).toMatch(/sprites are not CryptoPunks/);
  expect(copyOf(punks)).toMatch(/not a new Larva Labs release or an endorsement/);
  expect(eburpStory.rightsNote).toMatch(/not an official Larva Labs collection/i);
});

test('preserves the limited README permission without inventing a standard license', () => {
  expect(eburpStory.rightsNote).toMatch(/included project material/);
  expect(eburpStory.rightsNote).toMatch(/reserves the Gurk name/);
  expect(eburpStory.rightsNote).toMatch(/excludes unreleased graphics and music/);
  expect(eburpStory.rightsNote).toMatch(/No standard license file was found/);
  expect(eburpStory.rightsNote).toMatch(/does not itself establish copyright ownership/);
  expect(eburpStory.rightsNote).not.toMatch(/\b(?:MIT|GPL|CC0)\b|public domain/i);
});

test('removes the entire artifact-versus-redraw chapter and makes no value guarantees', () => {
  expect(chapter('the-artifact-not-a-redraw')).toBeUndefined();
  expect(allCopy).not.toContain('The artifact, not a redraw.');
  expect(allCopy).not.toMatch(/guaranteed (?:returns?|value)|Ethereum accepts .*only once/i);
});

test('keeps historical narrative separate from live ownership and transaction data', () => {
  const forbiddenKeys = new Set([
    'ethscriptionId', 'creationTimestamp', 'currentOwner', 'custody',
    'custodyVerified', 'verified', 'listing', 'price', 'writeContract',
    'sendTransaction', 'provider', 'wallet',
  ]);
  function inspect(value) {
    if (value == null || typeof value !== 'object') return;
    for (const [key, nested] of Object.entries(value)) {
      expect(forbiddenKeys.has(key)).toBe(false);
      expect(typeof nested).not.toBe('function');
      inspect(nested);
    }
  }
  inspect(eburpStory);
});
