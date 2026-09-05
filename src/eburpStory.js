// Research narrative for the local-only Expedition 000 preview. Import this
// through the DEV-gated expedition module, not the public expedition registry.
const firstGameUrl = 'https://web.archive.org/web/20101113223953/http:/larvalabs.com/blog/larvalabs/our-first-mobile-game';
const firstCommitUrl = 'https://github.com/pents90/eburp/commit/dca3cf9a56c955ad87063253d8a34eaa38fcc002';
const readmeUrl = 'https://github.com/pents90/eburp/blob/dca3cf9a56c955ad87063253d8a34eaa38fcc002/README.md';
const collectorEssayUrl = 'https://medium.com/@Posvar/the-eburp-collection-bridging-larvalabs-pixel-past-to-blockchain-present-d9e20f00bd01';

export const eburpStory = {
  intro: 'Before CryptoPunks, there were little adventurers on little screens. This is an earlier chapter in the work of Matt Hall and John Watkinson: the Gurk games, the EBURP source release, and a collector’s effort to preserve that pixel history without losing its context.',
  chapters: [
    {
      id: 'a-world-in-your-pocket',
      date: '2005',
      title: 'A world in your pocket.',
      paragraphs: [
        'Gurk began as Matt Hall and John Watkinson’s first mobile game: a role-playing adventure for Java-enabled phones. Hall’s later account dates it to 2005—the year the pair also formalized their partnership as Larva Labs.',
        'The original sales sheet promises six lands, 29 dungeon levels and 23 monsters inside a 63K download. It names Nokia, Sony and Motorola handsets and a minimum 128 × 128 screen. These characters belonged to a playable world, built around the constraints of the device in your pocket.',
      ],
      sources: [
        { title: 'Matt Hall’s account of the first Gurk game', url: firstGameUrl },
        { title: 'The original Gurk sales sheet', url: 'https://www.larvalabs.com/public/images/blog/sidekickdev/gurkinfosheet.pdf' },
        { title: 'Larva Labs: Matt Hall and John Watkinson', url: 'https://www.larvalabs.com/about' },
      ],
    },
    {
      id: 'one-copy',
      date: '11 NOV 2010',
      title: 'One copy. A beginning, not an ending.',
      paragraphs: [
        'Looking back, Hall described a game squeezed into 63.4K beneath a 63.7K over-the-air limit. John’s procedural maps and visibility calculations helped make room for an adventure. They took sales sheets to JavaOne in 2005; the game eventually sold one $3.99 copy, for which they never received payment.',
        'That retrospective makes the story human: a tiny commercial result, inventive engineering, and the beginning of a much longer creative partnership.',
      ],
      sources: [{ title: 'Our first mobile game sold 1 copy — Matt Hall', url: firstGameUrl }],
    },
    {
      id: 'source-release',
      date: '01 NOV 2013',
      title: 'The pixels enter the source record.',
      paragraphs: [
        'John Watkinson published EBURP—Eight-Bit Universal Role Playing—with a first repository commit dated 1 November 2013. Its source tree gives the collection an inspectable reference: named files, revision history and original PNG payloads.',
        'The README says this engine was written for Gurk III, using CoffeeScript and HTML5. That distinction matters. These are files preserved in the 2013 release, not a claim that every PNG is an unchanged file from the first handset game. The project invites reuse of included material while drawing a boundary around assets from the wider Gurk series.',
      ],
      sources: [
        { title: 'John Watkinson’s first EBURP commit', url: firstCommitUrl },
        { title: 'The original engine README and reuse wording', url: readmeUrl },
      ],
    },
    {
      id: 'before-cryptopunks',
      date: 'JUN 2017',
      title: 'Before the Punks.',
      paragraphs: [
        'Larva Labs later launched CryptoPunks: 10,000 algorithmically generated, 24 × 24 characters and an experiment in digital ownership. Gurk’s earlier game artwork offers a different view of the same creators’ practice—small pictures doing a surprising amount of work.',
        'The connection here is documented creative lineage. The EBURP sprites are not CryptoPunks, and this collection is not a new Larva Labs release or an endorsement by its founders.',
      ],
      sources: [
        { title: 'Larva Labs’ account of CryptoPunks', url: 'https://www.larvalabs.com/cryptopunks' },
        { title: 'The creators’ own studio history', url: 'https://www.larvalabs.com/about' },
      ],
    },
    {
      id: 'collectors-archive',
      date: '2023',
      title: 'Preservation comes with responsibility.',
      paragraphs: [
        {
          segments: [
            { text: 'In his October 2023 essay, collector ' },
            { text: '@posvar', url: 'https://x.com/posvar' },
            { text: ' described preserving 216 Gurk characters as Ethscriptions. He identified a 92-character core from the opensource public EBURP repository: nine heroes, 65 enemies and 18 non-player characters.' },
          ],
        },
        'Posvar records that the other 124 characters, outside the opensource released subset, were preserved as ethscriptions and subsequently transferred to the Ethereum burn address. They belong to the collection’s archival story, not its tradable core.',
      ],
      sources: [{ title: 'Jeremy Posvar’s collection history, 12 October 2023', url: collectorEssayUrl }],
    },
  ],
  rightsNote: 'Independent collector-led research; not an official Larva Labs collection. EBURP’s README permits use of included project material, reserves the Gurk name and excludes unreleased graphics and music. No standard license file was found. Owning an Ethscription does not itself establish copyright ownership or wider commercial permissions.',
};
