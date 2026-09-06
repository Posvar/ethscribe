import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MarketplacePage from './MarketplacePage';
import { joinMarketplace, recognizedCatalogue } from './marketplaceData';
import { MARKET_ADDRESS } from './marketConfig';
vi.mock('./WalletPage', () => ({ AssetPreview: ({ record }) => <div role="img" aria-label={record.mimetype} /> }));
const catalogue = recognizedCatalogue();
const base = catalogue.find(item => item.expeditionId === 'lost-pixels-of-satoshi');
const item = joinMarketplace([{ transactionHash: base.ethscriptionId, contentSha: base.recordProtocolSha256, currentOwner: MARKET_ADDRESS, mimetype: 'image/png', listing: { active: true, priceWei: '1000000000000000000' }, custody: { verified: true } }], catalogue)[0];
const snapshot = items => ({ items, complete: true, missingFeeds: false, checkedAt: '2026-09-06T12:00:00Z', market: { indexer: { healthy: true } } });
beforeEach(() => window.history.replaceState({}, '', '/marketplace'));
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

test('browses without a wallet, filters listings and links to the existing artifact', async () => {
  const load = vi.fn().mockResolvedValue(snapshot([item, { ...item, transactionHash: '0xother', name: 'Unlisted artifact', listing: { active: false, priceWei: '0' } }]));
  render(<MarketplacePage load={load} />);
  expect(await screen.findAllByRole('article')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Listed', exact: true }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByText('1 ETH')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View listing' })).toHaveAttribute('href', item.href);
  expect(screen.queryByRole('button', { name: /buy|connect wallet/i })).not.toBeInTheDocument();
  expect(window.location.search).toContain('status=listed');
  fireEvent.change(screen.getByLabelText('Search artifacts'), { target: { value: 'nope' } });
  expect(screen.getByText('No artifacts match those filters.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Reset filters/ }));
  expect(screen.getAllByRole('article')).toHaveLength(2);
});

test('paginates after global price sorting and resets pagination when filtering', async () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ ...item, transactionHash: `${i}`, name: `Artifact ${i}`, listing: { active: true, priceWei: `${25 - i}` } }));
  render(<MarketplacePage load={vi.fn().mockResolvedValue(snapshot(items))} />);
  expect(await screen.findAllByRole('article')).toHaveLength(24);
  expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('Artifact 24');
  fireEvent.click(screen.getByRole('button', { name: /Next →/ }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'price-high' } });
  expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('Artifact 0');
  expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
});

test('refresh errors keep the prior snapshot with an explicit stale-price warning', async () => {
  const load = vi.fn().mockResolvedValueOnce(snapshot([item])).mockRejectedValue(new Error('offline'));
  render(<MarketplacePage load={load} />);
  await screen.findByRole('article');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Showing the last successful snapshot');
  expect(screen.getByText('LAST SEEN')).toBeInTheDocument();
  expect(screen.queryByText('The next chapter is yours to collect.')).not.toBeInTheDocument();
});

test('URL controls and back navigation restore a shareable browse view', async () => {
  window.history.replaceState({}, '', '/marketplace?view=list&status=listed&type=png');
  render(<MarketplacePage load={vi.fn().mockResolvedValue(snapshot([item]))} />);
  await screen.findByRole('article');
  expect(screen.getByRole('button', { name: 'List', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('File type')).toHaveValue('png');
  window.history.replaceState({}, '', '/marketplace?q=absent');
  fireEvent.popState(window);
  expect(screen.getByLabelText('Search artifacts')).toHaveValue('absent');
  expect(screen.getByText('No artifacts match those filters.')).toBeInTheDocument();
});

test('background refresh removes an artifact after it leaves the vault', async () => {
  const load = vi.fn().mockResolvedValueOnce(snapshot([item])).mockResolvedValueOnce(snapshot([]));
  render(<MarketplacePage load={load} />);
  await screen.findByRole('article');
  fireEvent.focus(window);
  await waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument());
  expect(load).toHaveBeenCalledTimes(2);
});
