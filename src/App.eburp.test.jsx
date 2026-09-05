import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { useEthscribeWallet } from './useEthscribeWallet';
import { eburpExpedition } from './eburpExpedition';
import { MARKET_ADDRESS } from './marketConfig';

vi.mock('./useEthscribeWallet', () => ({ useEthscribeWallet: vi.fn() }));

beforeEach(() => {
  vi.stubEnv('DEV', true);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline test')));
  useEthscribeWallet.mockReturnValue({ account: '', chainId: '', walletState: 'idle', walletName: '', provider: null,
    connectWallet: vi.fn(), switchToMainnet: vi.fn(), openAccountModal: vi.fn() });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

test('Expedition 000 opens locally as a closed collection with the full story and no network writes', async () => {
  window.history.replaceState({}, '', '/expeditions/eburp');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'EBURP: Before the Punks', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Current expedition' })).toHaveTextContent('EXPEDITION 000: EBURP: BEFORE THE PUNKS');
  expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Tradeable Core 92/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /Burned Archive 124/i })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('heading', { name: 'The story behind the sprites.' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Open .+, EBURP / })).toHaveLength(92);
  expect(screen.queryByRole('navigation', { name: 'Collection pagination' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^(submit|deposit|ethscribe|buy|sell)/i })).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
  await waitFor(() => expect(document.title).toBe('EBURP: Before the Punks — Expedition 000 | ETHSCRI.BE'));
});

test('an existing archive Ethscription deep-link selects the full archive and checks only that record', async () => {
  window.history.replaceState({}, '', '/expeditions/eburp?artifact=eburp-0176#record-eburp-0176');
  render(<App />);
  const heading = await screen.findByRole('heading', { level: 3, name: 'Borakash' });
  const record = heading.closest('section');
  expect(record).toHaveAttribute('id', 'record-eburp-0176');
  expect(screen.getByRole('button', { name: /Burned Archive 124/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('button', { name: /^Open .+, EBURP / })).toHaveLength(124);
  expect(within(record).getByText('Hero · Wario')).toBeInTheDocument();
  expect(within(record).getByRole('link', { name: /View the existing Ethscription/ })).toHaveAttribute('href', expect.stringContaining('https://ethscriptions.com/ethscriptions/0x'));
  fireEvent.click(within(record).getByRole('button', { name: /Close record/ }));
  expect(window.location.search).toBe('');
  expect(global.fetch).toHaveBeenCalledWith(`/api/market/artifact?id=${eburpExpedition.artifacts[176].ethscriptionId}`, expect.any(Object));
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

const owner = `0x${'33'.repeat(20)}`;
const creator = `0x${'44'.repeat(20)}`;
const coreArtifact = eburpExpedition.artifacts[0];
function openCore({ currentOwner = owner, connected = owner, contentSha = coreArtifact.canonicalProtocolSha256, inMarket = false, localPreview = true } = {}) {
  const provider = { request: vi.fn() };
  const snapshot = {
    ethscription: { transactionHash: coreArtifact.ethscriptionId, currentOwner, creator, blockTimestamp: 1691787455, contentSha },
    seller: inMarket ? owner : null, listing: null,
    custody: { verified: inMarket, status: inMarket ? 'verified' : 'not_in_market', custodyKind: inMarket ? 'registered_deposit' : undefined },
    market: { address: MARKET_ADDRESS, deployed: true, chainId: 1, paused: false, localPreview, transactionsEnabled: !localPreview, intakeEnabled: !localPreview, indexer: { available: true, healthy: true } },
  };
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ result: snapshot }) });
  useEthscribeWallet.mockReturnValue({ account: connected, chainId: '0x1', walletState: 'connected', walletName: 'MetaMask', provider,
    connectWallet: vi.fn(), switchToMainnet: vi.fn(), openAccountModal: vi.fn() });
  window.history.replaceState({}, '', `/expeditions/eburp?artifact=${coreArtifact.id}#record-${coreArtifact.id}`);
  render(<App />);
  return provider;
}

test('the current core owner can review the same deposit flow as Satoshi without local writes', async () => {
  const provider = openCore();
  const deposit = await screen.findByRole('button', { name: /deposit into marketplace/i });
  expect(screen.getByText(/^Owner Wallet$/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: owner })).toHaveAttribute('href', `https://etherscan.io/address/${owner}`);
  fireEvent.click(deposit);
  expect(screen.getByRole('region', { name: /Review marketplace deposit/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /DEPOSITS DISABLED IN LOCAL PREVIEW/i })).toBeDisabled();
  expect(provider.request).not.toHaveBeenCalled();
});

test('being the creator is not sufficient to deposit someone else’s core sprite', async () => {
  openCore({ connected: creator });
  await screen.findByRole('link', { name: owner });
  expect(screen.queryByRole('button', { name: /deposit into marketplace/i })).not.toBeInTheDocument();
});

test('a core sprite already held in Ethscribe custody links its seller to listing management', async () => {
  openCore({ currentOwner: MARKET_ADDRESS, inMarket: true });
  expect(await screen.findByRole('link', { name: /MANAGE IN FIELD WALLET/i })).toHaveAttribute('href', '/wallet');
  expect(screen.queryByRole('button', { name: /deposit into marketplace/i })).not.toBeInTheDocument();
});

test('a different protocol payload cannot activate the imported sprite’s ownership controls', async () => {
  const provider = openCore({ contentSha: 'b'.repeat(64) });
  await screen.findByText('LISTING UNAVAILABLE');
  expect(screen.queryByRole('button', { name: /deposit into marketplace/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: owner })).not.toBeInTheDocument();
  expect(provider.request).not.toHaveBeenCalled();
});

test('a sprite held by the legacy EBURP vault explains the required prior withdrawal', async () => {
  openCore({ currentOwner: '0x719a411555ec93a896cf64dc07db72883fb57144' });
  expect(await screen.findByText(/still held by the original EBURP vault/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /deposit into marketplace/i })).not.toBeInTheDocument();
});

test('the completed archive appears separately below the two live hunts', async () => {
  window.history.replaceState({}, '', '/expeditions');
  render(<App />);
  const completed = await screen.findByRole('region', { name: 'Completed expeditions.' });
  const live = await screen.findByRole('region', { name: 'Live expeditions' });
  await within(live).findByRole('link', { name: 'Enter Expedition 002' });
  expect(within(live).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/expeditions/youve-got-history', '/expeditions/lost-pixels-of-satoshi']);
  expect(within(live).queryByText('EBURP: Before the Punks')).not.toBeInTheDocument();
  expect(within(completed).getByText('COMPLETE')).toHaveClass('expedition-complete-status');
  expect(within(completed).queryByText('ACTIVE')).not.toBeInTheDocument();
  expect(within(completed).getByRole('link', { name: 'VIEW COMPLETED COLLECTION' })).toHaveAttribute('href', '/expeditions/eburp');
  expect(live.compareDocumentPosition(completed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('Expedition 000 is a public completed archive without local-preview labels in production', async () => {
  vi.stubEnv('DEV', false);
  window.history.replaceState({}, '', '/expeditions/eburp');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'EBURP: Before the Punks', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Open .+, EBURP / })).toHaveLength(92);
  expect(screen.queryByText(/LOCAL PREVIEW|LOCAL ARCHIVE PREVIEW|NOT PUBLISHED/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^submit/i })).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('the production directory includes completed EBURP while unapproved drafts stay hidden', async () => {
  vi.stubEnv('DEV', false);
  window.history.replaceState({}, '', '/expeditions');
  render(<App />);
  await screen.findByRole('region', { name: 'Expedition 002' });
  const completed = await screen.findByRole('region', { name: 'Completed expeditions.' });
  expect(within(completed).getByText('COMPLETE')).toBeInTheDocument();
  expect(within(completed).getByRole('link', { name: 'VIEW COMPLETED COLLECTION' })).toHaveAttribute('href', '/expeditions/eburp');
  expect(within(completed).queryByText(/LOCAL REVIEW|NOT PUBLISHED/)).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Expedition 003' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Expedition 004' })).not.toBeInTheDocument();
  expect(screen.queryByText('Browser Wars')).not.toBeInTheDocument();
  expect(screen.queryByText('Skin Deep')).not.toBeInTheDocument();
});

test('a verified current owner can review an enabled production deposit without sending it', async () => {
  vi.stubEnv('DEV', false);
  const provider = openCore({ localPreview: false });
  fireEvent.click(await screen.findByRole('button', { name: /deposit into marketplace/i }));
  const review = screen.getByRole('region', { name: /Review marketplace deposit/i });
  expect(within(review).getByRole('button', { name: /confirm deposit/i })).toBeEnabled();
  expect(within(review).queryByText(/DEPOSITS DISABLED IN LOCAL PREVIEW/)).not.toBeInTheDocument();
  expect(screen.queryByText(/LOCAL PREVIEW · TRANSACTIONS DISABLED/)).not.toBeInTheDocument();
  expect(provider.request).not.toHaveBeenCalled();
});
