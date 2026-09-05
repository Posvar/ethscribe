import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { useEffect } from 'react';
import EburpExpeditionPage, { EburpExpeditionCard } from './EburpExpeditionPage';
import { MARKET_ADDRESS } from './marketConfig';

const png = 'data:image/png;base64,iVBORw0KGgo=';
const creator = `0x${'b'.repeat(40)}`;
const artifacts = Array.from({ length: 56 }, (_, index) => ({
  id: `eburp-${String(index).padStart(4, '0')}`, index, name: `Character ${index}`, description: `The recorded story of character ${index}.`,
  type: index % 3 === 0 ? 'Hero' : index % 3 === 1 ? 'Enemy' : 'NPC', heroClass: index === 0 ? 'Wario' : '',
  sourcePath: `source/character-${index}.png`, sourceUrl: 'https://example.org/source', contentUri: png,
  rawSha256: 'a'.repeat(64), byteLength: 168, width: 16, height: 16,
  ethscriptionId: `0x${index.toString(16).padStart(64, '0')}`, ethscribedAt: '2023-06-22T12:00:00Z', creator,
  collectionGroup: index < 52 ? 'core' : 'archive', provenanceNote: `Preserved source evidence for character ${index}.`,
  verifiedSourceMatch: index < 52, protocolVerification: index === 0 ? { verified: true } : undefined,
}));
const expedition = { id: 'eburp', number: '000', slug: 'eburp', path: '/expeditions/eburp', title: 'EBURP: Before the Punks', subtitle: 'Tiny characters with a bigger history.', intro: 'A completed archive of the original collection.', artifacts };
const story = { intro: 'Follow the surviving evidence.', rightsNote: 'Artwork rights remain with their respective creators.', chapters: [{ date: 'A documented date', title: 'The first chapter', paragraphs: ['A sourced historical paragraph.', 'Another documented part of the story.'], sources: [{ title: 'Primary record', url: 'https://example.org/history' }] }] };

function RecordReader({ record, onRecord }) {
  useEffect(() => { onRecord(record); }, [record, onRecord]);
  return <p>Current record reader</p>;
}

beforeEach(() => window.history.replaceState({}, '', '/expeditions/eburp'));
afterEach(() => { vi.unstubAllEnvs(); window.history.replaceState({}, '', '/'); });

test('presents a completed archive with core selected and counts derived from actual records', () => {
  render(<EburpExpeditionPage expedition={expedition} story={story} header={<header>Site header</header>} footer={<footer>Site footer</footer>} />);
  expect(screen.getByRole('heading', { name: expedition.title })).toBeInTheDocument();
  expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  expect(screen.getByText('LOCAL PREVIEW · TRANSACTIONS DISABLED')).toBeInTheDocument();
  expect(screen.getByText(/not a claim of current marketplace custody/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tradeable Core 52' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Burned Archive 4' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('banner')).toHaveTextContent('Site header');
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Site footer');
});

test('production never displays the local-only notice even when a caller passes localPreview', () => {
  vi.stubEnv('DEV', false);
  render(<EburpExpeditionPage expedition={expedition} localPreview />);
  expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  expect(screen.queryByText(/LOCAL PREVIEW|NOT PUBLISHED/)).not.toBeInTheDocument();
});

test('shows every core character as an image-only tile without pagination', () => {
  const { container } = render(<EburpExpeditionPage expedition={expedition} />);
  expect(screen.getAllByRole('button', { name: /^Open Character / })).toHaveLength(52);
  expect(screen.getByRole('button', { name: 'Open Character 48, EBURP 0048' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Collection pagination' })).not.toBeInTheDocument();
  expect(container.querySelectorAll('.eburp-artifact-card img')).toHaveLength(52);
  expect([...container.querySelectorAll('.eburp-artifact-card')].every(card => card.textContent === '')).toBe(true);
});

test('switches archives, filters character types, and searches names or original classes', () => {
  render(<EburpExpeditionPage expedition={expedition} />);
  fireEvent.change(screen.getByLabelText('Search the collection'), { target: { value: 'Wario' } });
  expect(screen.getAllByRole('button', { name: /^Open Character / })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Open Character 0, EBURP 0000' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Burned Archive 4' }));
  expect(screen.getByLabelText('Search the collection')).toHaveValue('');
  expect(screen.getAllByRole('button', { name: /^Open Character / })).toHaveLength(4);
  fireEvent.change(screen.getByLabelText('Character type'), { target: { value: 'NPC' } });
  expect(screen.getAllByRole('button', { name: /^Open Character / })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Open Character 53, EBURP 0053' })).toBeInTheDocument();
});

test('opens an inline exact-file record and restores keyboard focus when closed', () => {
  render(<EburpExpeditionPage expedition={expedition} story={story} />);
  const button = screen.getByRole('button', { name: 'Open Character 0, EBURP 0000' });
  fireEvent.click(button);
  const record = screen.getByRole('region', { name: 'Character 0' });
  expect(record).toHaveAttribute('id', 'record-eburp-0000');
  expect(window.location.search).toBe('?artifact=eburp-0000');
  expect(within(record).getByText('a'.repeat(64))).toBeInTheDocument();
  expect(within(record).getByText('168 bytes')).toBeInTheDocument();
  expect(within(record).getByText('source/character-0.png')).toBeInTheDocument();
  expect(within(record).getByText('Jun 22, 2023 · UTC')).toBeInTheDocument();
  expect(within(record).getByText(creator)).toBeInTheDocument();
  expect(within(record).getByRole('heading', { name: 'Character 0' })).toHaveFocus();
  fireEvent.keyDown(within(record).getByRole('heading', { name: 'Character 0' }), { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Character 0' })).not.toBeInTheDocument();
  expect(button).toHaveFocus();
});

test('does not present unverified CSV date or creator fields as verified transaction data', () => {
  render(<EburpExpeditionPage expedition={expedition} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 1, EBURP 0001' }));
  const record = screen.getByRole('region', { name: 'Character 1' });
  expect(within(record).queryByText(creator)).not.toBeInTheDocument();
  expect(within(record).queryByText('Jun 22, 2023 · UTC')).not.toBeInTheDocument();
  expect(within(record).getByText(/Catalogue record · not freshly rechecked/)).toBeInTheDocument();
  expect(within(record).getByRole('link', { name: /View the existing Ethscription/ })).toHaveAttribute('href', `https://ethscriptions.com/ethscriptions/${artifacts[1].ethscriptionId}`);
});

test('keeps compact Ethscription metadata in ID/date and creator/owner row order', () => {
  const owner = `0x${'c'.repeat(40)}`;
  const fresh = { transactionHash: artifacts[1].ethscriptionId, currentOwner: owner, creator, blockTimestamp: 1704067200 };
  render(<EburpExpeditionPage expedition={expedition} renderMarket={({ onRecord }) => <RecordReader record={fresh} onRecord={onRecord} />} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 1, EBURP 0001' }));
  const section = screen.getByRole('region', { name: '02 Ethscription' });
  const rows = [...section.querySelectorAll('.artifact-record-grid > .record-fact')];
  expect(rows.map(row => row.querySelector('dt').textContent)).toEqual(['ID / CREATION TX', 'ETHSCRIBED', 'ETHSCRIBING WALLET', 'OWNER WALLET']);
  expect(rows.every(row => !row.classList.contains('record-fact-wide'))).toBe(true);
  const id = artifacts[1].ethscriptionId;
  const shortId = `${id.slice(0, 6)}...${id.slice(-4)}`;
  const transactionLink = within(section).getByRole('link', { name: shortId, exact: true });
  expect(transactionLink).toHaveAttribute('href', `https://etherscan.io/tx/${id}`);
  expect(transactionLink).toHaveAttribute('title', id);
  expect(transactionLink).toHaveTextContent(shortId);
  expect(within(section).getByRole('link', { name: /View the existing Ethscription/ })).toHaveAttribute('href', `https://ethscriptions.com/ethscriptions/${id}`);
  expect(within(section).getByRole('link', { name: creator, exact: true })).toHaveAttribute('href', `https://etherscan.io/address/${creator}`);
  expect(within(section).getByRole('link', { name: owner, exact: true })).toHaveAttribute('href', `https://etherscan.io/address/${owner}`);
});

test('direct archive and late-collection links select the matching group and inline record', () => {
  window.history.replaceState({}, '', '/expeditions/eburp?artifact=eburp-0053#record-eburp-0053');
  const { unmount } = render(<EburpExpeditionPage expedition={expedition} />);
  expect(screen.getByRole('button', { name: 'Burned Archive 4' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('region', { name: 'Character 53' })).toBeInTheDocument();
  unmount();
  window.history.replaceState({}, '', '/expeditions/eburp?artifact=eburp-0049#record-eburp-0049');
  render(<EburpExpeditionPage expedition={expedition} />);
  expect(screen.getByRole('region', { name: 'Character 49' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Open Character / })).toHaveLength(52);
});

test('hero contact-sheet buttons open the corresponding original instead of a recreated image', () => {
  const { container } = render(<EburpExpeditionPage expedition={expedition} />);
  expect(container.querySelectorAll('.eburp-hero-grid button')).toHaveLength(24);
  const button = screen.getByRole('button', { name: 'Explore Character 0, EBURP 0000' });
  expect(button.querySelector('img')).toHaveAttribute('src', png);
  fireEvent.click(button);
  expect(screen.getByRole('region', { name: 'Character 0' })).toBeInTheDocument();
});

test('renders the complete supplied story with nearby primary-source links', () => {
  render(<EburpExpeditionPage expedition={expedition} story={story} />);
  expect(screen.getByRole('heading', { name: 'The first chapter' })).toBeInTheDocument();
  expect(screen.getByText('A sourced historical paragraph.')).toBeInTheDocument();
  expect(screen.getByText('Another documented part of the story.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Primary record' })).toHaveAttribute('href', 'https://example.org/history');
  expect(screen.getByRole('link', { name: 'Read its story' })).toHaveAttribute('href', '#eburp-story');
});

test('requested collection labels do not fabricate fresh burn or owner verification', () => {
  render(<EburpExpeditionPage expedition={{ ...expedition, archiveBurnVerified: false }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Burned Archive 4' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 53, EBURP 0053' }));
  expect(screen.getByText('Current owner not verified')).toBeInTheDocument();
});

test('empty filters offer recovery without losing the collection', () => {
  render(<EburpExpeditionPage expedition={expedition} />);
  fireEvent.change(screen.getByLabelText('Search the collection'), { target: { value: 'not a character' } });
  expect(screen.getByText('No characters match those filters.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getAllByRole('button', { name: /^Open Character / })).toHaveLength(52);
});

test('has no transaction, upload, marketplace, or indexer calls', () => {
  const spy = vi.spyOn(global, 'fetch');
  try {
    const { container } = render(<EburpExpeditionPage expedition={expedition} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Character 0, EBURP 0000' }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^(?:deposit|submit|ethscribe|buy|sell|list|transfer)\b/i })).not.toBeInTheDocument();
    expect(container.querySelector('input[type=file], iframe')).not.toBeInTheDocument();
  } finally { spy.mockRestore(); }
});

test('completed directory card uses the shared layout without implying an open hunt', () => {
  render(<EburpExpeditionCard expedition={{ ...expedition, cardDescription: 'The original core and its separate preservation archive.' }} />);
  expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  expect(screen.getByText('COMPLETED COLLECTION / EXPEDITION 000')).toBeInTheDocument();
  expect(screen.queryByText('KNOWN-BYTE GAPS')).not.toBeInTheDocument();
  expect(screen.getByText('The original core and its separate preservation archive.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'VIEW COMPLETED COLLECTION' })).toHaveAttribute('href', '/expeditions/eburp');
});

test('keeps supplied completion context and a limited verification audit separate from collection counts', () => {
  render(<EburpExpeditionPage expedition={{ ...expedition, completionNote: 'Completed catalogue, not a fresh ownership check.', verification: { sourceMatchedCount: 52, officialRecordVerifiedCount: 1, officialRecordNotRecheckedCount: 55 } }} />);
  expect(screen.getByText('Completed catalogue, not a fresh ownership check.')).toBeInTheDocument();
  expect(screen.getByText(/52 core files match the preserved source/)).toBeInTheDocument();
  expect(screen.getByText(/remaining 55 were not rechecked/)).toBeInTheDocument();
});

test('opens only the selected core market and uses its fresh owner, creator and creation date', () => {
  const owner = `0x${'c'.repeat(40)}`;
  const freshCreator = `0x${'d'.repeat(40)}`;
  const record = { transactionHash: artifacts[1].ethscriptionId, currentOwner: owner, creator: freshCreator, blockTimestamp: 1704067200 };
  const renderMarket = vi.fn(({ onRecord }) => <RecordReader record={record} onRecord={onRecord} />);
  render(<EburpExpeditionPage expedition={expedition} renderMarket={renderMarket} />);
  expect(renderMarket).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 1, EBURP 0001' }));
  const region = screen.getByRole('region', { name: 'Character 1' });
  expect(within(region).getByRole('link', { name: owner })).toHaveAttribute('href', `https://etherscan.io/address/${owner}`);
  expect(within(region).getByRole('link', { name: freshCreator })).toHaveAttribute('href', `https://etherscan.io/address/${freshCreator}`);
  expect(within(region).getByText('Jan 01, 2024 · UTC')).toBeInTheDocument();
  expect(within(region).queryByText(/not freshly rechecked/)).not.toBeInTheDocument();
});

test('never falls back to an archived owner and clears fresh ownership on failed refresh', () => {
  const owner = `0x${'c'.repeat(40)}`;
  const oldOwner = `0x${'e'.repeat(40)}`;
  const data = { ...expedition, artifacts: [{ ...artifacts[0], currentOwnerSnapshot: oldOwner, currentOwner: oldOwner, owner: oldOwner }] };
  const record = { transactionHash: artifacts[0].ethscriptionId, currentOwner: owner };
  const { rerender } = render(<EburpExpeditionPage expedition={data} renderMarket={({ onRecord }) => <RecordReader record={record} onRecord={onRecord} />} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 0, EBURP 0000' }));
  expect(screen.getByRole('link', { name: owner })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: oldOwner })).not.toBeInTheDocument();
  rerender(<EburpExpeditionPage expedition={data} renderMarket={({ onRecord }) => <RecordReader record={null} onRecord={onRecord} />} />);
  expect(screen.queryByRole('link', { name: owner })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: oldOwner })).not.toBeInTheDocument();
  expect(screen.getByText('Current owner not verified')).toBeInTheDocument();
});

test('mismatched records cannot supply an owner and ownership does not carry between characters', () => {
  const owner = `0x${'c'.repeat(40)}`;
  const record = { transactionHash: artifacts[0].ethscriptionId, currentOwner: owner };
  render(<EburpExpeditionPage expedition={expedition} renderMarket={({ onRecord }) => <RecordReader record={record} onRecord={onRecord} />} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 0, EBURP 0000' }));
  expect(screen.getByRole('link', { name: owner })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 1, EBURP 0001' }));
  expect(screen.queryByRole('link', { name: owner })).not.toBeInTheDocument();
  expect(screen.getByText('Current owner not verified')).toBeInTheDocument();
});

test('archive records use only the read-only renderer, never the market renderer', () => {
  const burnAddress = '0x000000000000000000000000000000000000dEaD';
  const record = { transactionHash: artifacts[53].ethscriptionId, currentOwner: burnAddress };
  const renderMarket = vi.fn(() => <p>Market controls</p>);
  const renderOwnership = vi.fn(({ onRecord }) => <RecordReader record={record} onRecord={onRecord} />);
  render(<EburpExpeditionPage expedition={expedition} renderMarket={renderMarket} renderOwnership={renderOwnership} />);
  fireEvent.click(screen.getByRole('button', { name: 'Burned Archive 4' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 53, EBURP 0053' }));
  expect(renderMarket).not.toHaveBeenCalled();
  expect(renderOwnership).toHaveBeenCalled();
  expect(screen.getByRole('link', { name: burnAddress })).toBeInTheDocument();
});

test('a core record must have a verified source match before market UI is offered', () => {
  const renderMarket = vi.fn(() => <p>Market controls</p>);
  render(<EburpExpeditionPage expedition={{ ...expedition, artifacts: [{ ...artifacts[0], verifiedSourceMatch: false }] }} renderMarket={renderMarket} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 0, EBURP 0000' }));
  expect(renderMarket).not.toHaveBeenCalled();
});

test('marketplace ownership is labeled as custody instead of inventing a human owner', () => {
  const record = { transactionHash: artifacts[0].ethscriptionId, currentOwner: MARKET_ADDRESS };
  render(<EburpExpeditionPage expedition={expedition} renderMarket={({ onRecord }) => <RecordReader record={record} onRecord={onRecord} />} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Character 0, EBURP 0000' }));
  expect(screen.getByRole('link', { name: MARKET_ADDRESS })).toHaveAttribute('href', `https://etherscan.io/address/${MARKET_ADDRESS}`);
  expect(screen.getByText('Marketplace custody')).toBeInTheDocument();
});

test('story segments allow an inline HTTPS profile link without accepting executable markup', () => {
  const segmented = { ...story, chapters: [{ ...story.chapters[0], paragraphs: [{ segments: [{ text: 'In 2023, collector ' }, { text: '@posvar', url: 'https://x.com/posvar' }, { text: ' preserved the collection.' }] }, { segments: [{ text: '<script>unsafe()</script>', url: 'javascript:unsafe()' }] }] }] };
  const { container } = render(<EburpExpeditionPage expedition={expedition} story={segmented} />);
  expect(screen.getByRole('link', { name: '@posvar' })).toHaveAttribute('href', 'https://x.com/posvar');
  expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument();
  expect(container.querySelector('script, a[href^="javascript:"]')).not.toBeInTheDocument();
});
