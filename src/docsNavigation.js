export const docsSections = [
  {
    title: 'Start here',
    items: [
      { title: 'Welcome to Ethscribe', slug: '', file: 'README.md' },
      { title: 'Your first Finding', slug: 'product/first-finding', file: 'product/first-finding.md' },
    ],
  },
  {
    title: 'Overview',
    items: [
      { title: 'Why Ethscribe exists', slug: 'overview/why-ethscribe', file: 'overview/why-ethscribe.md' },
      { title: 'The core thesis', slug: 'overview/core-thesis', file: 'overview/core-thesis.md' },
      { title: 'Principles and vocabulary', slug: 'overview/principles-and-vocabulary', file: 'overview/principles-and-vocabulary.md' },
    ],
  },
  {
    title: 'Foundations',
    items: [
      { title: 'Ethscriptions primer', slug: 'foundations/ethscriptions', file: 'foundations/ethscriptions.md' },
      { title: 'Byte-perfect identity', slug: 'foundations/byte-perfect-identity', file: 'foundations/byte-perfect-identity.md' },
      { title: 'Claims, evidence, and limits', slug: 'foundations/claims-evidence-and-limits', file: 'foundations/claims-evidence-and-limits.md' },
    ],
  },
  {
    title: 'Product',
    items: [
      { title: 'Expeditions', slug: 'product/expeditions', file: 'product/expeditions.md' },
      { title: 'Findings and dossiers', slug: 'product/findings-and-dossiers', file: 'product/findings-and-dossiers.md' },
      { title: 'Curation and trust', slug: 'product/curation-and-trust', file: 'product/curation-and-trust.md' },
      { title: 'Ethscribe, deposit, and assign', slug: 'product/artifact-intake', file: 'product/artifact-intake.md' },
      { title: 'Ownership and marketplace', slug: 'product/ownership-and-marketplace', file: 'product/ownership-and-marketplace.md' },
      { title: 'Economics and flywheel', slug: 'product/economics-and-flywheel', file: 'product/economics-and-flywheel.md' },
    ],
  },
  {
    title: 'Expedition 001',
    items: [
      { title: 'The Lost Pixels of Satoshi', slug: 'expedition-001/the-lost-pixels-of-satoshi', file: 'expedition-001/the-lost-pixels-of-satoshi.md' },
    ],
  },
  {
    title: 'Expedition 002',
    items: [
      { title: "You've Got History", slug: 'expedition-002/youve-got-history', file: 'expedition-002/youve-got-history.md' },
    ],
  },
  {
    title: 'Roadmap',
    items: [
      { title: 'Phased development', slug: 'roadmap/phased-development', file: 'roadmap/phased-development.md' },
      { title: 'Path to autonomy', slug: 'roadmap/path-to-autonomy', file: 'roadmap/path-to-autonomy.md' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { title: 'Mainnet deployment', slug: 'reference/mainnet-deployment', file: 'reference/mainnet-deployment.md' },
      { title: 'First custody test: historical record', slug: 'reference/custody-pilot', file: 'reference/custody-pilot.md' },
      { title: 'Frequently asked questions', slug: 'reference/faq', file: 'reference/faq.md' },
      { title: 'Sources and further reading', slug: 'reference/sources', file: 'reference/sources.md' },
    ],
  },
];

export const docsPages = docsSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title })),
);

export function docsHref(slug) {
  return slug ? `/docs/${slug}` : '/docs';
}
