import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { useEthscribeWallet } from './useEthscribeWallet';
import { MARKET_ADDRESS } from './marketConfig';

vi.mock('./XpmPreview', () => ({ default: function MockXpmPreview() {
  return <div data-testid="xpm-preview" />;
} }));
vi.mock('./useEthscribeWallet', () => ({ useEthscribeWallet: vi.fn() }));

const originalFetch = global.fetch;
const SATOSHI_FINDINGS_URL = '/api/findings?expedition=lost-pixels-of-satoshi';
const connectWallet = jest.fn();
const switchToMainnet = jest.fn();
const openAccountModal = jest.fn();

beforeEach(() => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline test'));
  connectWallet.mockReset();
  switchToMainnet.mockReset();
  openAccountModal.mockReset();
  useEthscribeWallet.mockReturnValue({
    account: '',
    chainId: '',
    walletState: 'idle',
    walletName: '',
    provider: null,
    connectWallet,
    switchToMainnet,
    openAccountModal,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  global.fetch = originalFetch;
  window.history.pushState({}, '', '/');
});

test('renders a broad mission homepage with the first expedition separated', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /find the bytes.*establish the provenance/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /living museum built through public hunts/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /lost pixels of satoshi/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open the expedition/i })).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi');
  expect(screen.queryByRole('link', { name: /explore the mission/i })).not.toBeInTheDocument();
  const brand = screen.getByRole('link', { name: /ethscribe home/i });
  expect(within(brand).getByText('ETHSCRI.BE')).toBeInTheDocument();
  expect(brand.querySelector('img')).toHaveAttribute('src', '/newicon.svg');
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).queryByRole('link', { name: 'Method' })).not.toBeInTheDocument();
  expect(within(primaryNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('href', '/expeditions');
  expect(within(primaryNavigation).queryByRole('link', { name: 'Propose' })).not.toBeInTheDocument();
  expect(within(primaryNavigation).getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/wallet');
  expect(within(primaryNavigation).queryByRole('link', { name: 'Ethscribe' })).not.toBeInTheDocument();
  expect(within(primaryNavigation).queryByRole('link', { name: 'Docs' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /new here.*learn how ethscribe works/i })).toHaveAttribute('href', '/docs');
  expect(screen.getByText(/the ethscriptions protocol recognizes that exact payload only once/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  expect(screen.getAllByText(/find the bytes\. establish the provenance\. own the artifact\./i)).toHaveLength(2);
  const footer = screen.getByRole('contentinfo');
  expect(within(footer).getAllByRole('link')).toHaveLength(1);
  expect(within(footer).getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
  expect(within(footer).getByText('© 2026 ETHSCRIBE')).toBeInTheDocument();
});

test('opens a mobile navigation menu with wallet connection first', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

  const mobileNavigation = screen.getByRole('navigation', { name: /mobile navigation/i });
  expect(mobileNavigation.firstElementChild).toBe(within(mobileNavigation).getByRole('button', { name: /connect wallet/i }));
  expect(within(mobileNavigation).getByRole('link', { name: 'Mission' })).toHaveAttribute('href', '#mission');
  expect(within(mobileNavigation).queryByRole('link', { name: 'Method' })).not.toBeInTheDocument();
  expect(within(mobileNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('href', '/expeditions');
  expect(within(mobileNavigation).queryByRole('link', { name: 'Propose' })).not.toBeInTheDocument();
  expect(within(mobileNavigation).getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/wallet');
  expect(within(mobileNavigation).queryByRole('link', { name: 'Ethscribe' })).not.toBeInTheDocument();
  expect(within(mobileNavigation).queryByRole('link', { name: 'Docs' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
});

test('uses the connected-address control to open RainbowKit account management', () => {
  useEthscribeWallet.mockReturnValue({
    account: '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba',
    chainId: '0x1',
    walletState: 'idle',
    walletName: 'MetaMask',
    ensName: 'jeremy.eth',
    provider: null,
    connectWallet,
    switchToMainnet,
    openAccountModal,
  });
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /manage connected wallet/i }));
  expect(openAccountModal).toHaveBeenCalledTimes(1);
  expect(within(screen.getByRole('navigation', { name: /primary navigation/i })).getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/wallet');
});

test('expands secured and open artifact records directly in the timeline', async () => {
  global.fetch = jest.fn().mockImplementation(async (url) => ({
    ok: true,
    json: async () => ({
      result: url === '/api/market/status'
        ? { paused: false, transactionsEnabled: true, indexer: { healthy: true } }
        : {
            creator: '0x1f01d99a90ad0c752e7765de29c386a169bd9e37',
            current_owner: '0x1f01d99a90ad0c752e7765de29c386a169bd9e37',
          },
    }),
  }));
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi');
  render(<App />);

  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('aria-current', 'page');
  expect(within(primaryNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('href', '/expeditions');
  expect(within(primaryNavigation).queryByRole('link', { name: /timeline/i })).not.toBeInTheDocument();
  expect(within(primaryNavigation).queryByRole('link', { name: /byte lab/i })).not.toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /current expedition/i })).toHaveTextContent('EXPEDITION 001: THE LOST PIXELS OF SATOSHI');

  const legend = screen.getByLabelText(/timeline status legend/i);
  expect(legend.children).toHaveLength(2);
  expect(within(legend).getByText('NOT YET ETHSCRIBED')).toBeInTheDocument();
  expect(screen.getByText(/Satoshi's release of Bitcoin v0\.1\.0 introduces the six-frame Windows icon/i)).toBeInTheDocument();
  expect(screen.getByText(/Its exact bytes are this expedition’s real mystery/i)).toBeInTheDocument();
  expect(screen.getByText(/“New icons, what do you think\?” Satoshi releases new Bitcoin PNGs into the public domain/i)).toBeInTheDocument();
  expect(screen.getByText(/This is his final contribution to bitcoin's identity/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'The ₿ coin is revealed' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'The end of an era' })).toBeInTheDocument();
  expect(screen.getByText(/Bitboy introduces the orange, tilted mark\. Icons of that later community era belong in a separate expedition\./i)).toBeInTheDocument();
  expect(screen.getByText(/known files ethscribed/i)).toBeInTheDocument();
  expect(screen.getByText(/Satoshi’s attested 20 × 20 transparent PNG remains/i)).toBeInTheDocument();
  expect(screen.queryByText(/expedition brief/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/primary source \/ 08 feb 2010/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/canonical corpus \/ through v0\.3\.0/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^known bytes$/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^unknown bytes$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/expedition principles/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: /icobitcoin\.ico/i })[0]);
  expect(screen.getByRole('heading', { name: /file information/i })).toBeInTheDocument();
  expect(await screen.findByText('NOT LISTED')).toBeInTheDocument();
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /byte identity/i })).not.toBeInTheDocument();
  expect(screen.getByText(/decoded raw file sha-256/i)).toBeInTheDocument();
  expect(screen.getByText('22,486 bytes')).toBeInTheDocument();
  expect(screen.getByText('8571889ac8a29b5c2e537f3fb11973295fcffc8f9b348623aa87b3598e869033')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /ethscription transaction/i })).toBeInTheDocument();
  expect(screen.getByText(/22 jun 2023 · 19:48:35 utc/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '0xa96f32bc3cb428966aafe501b598ac57e5716fd22ff7576b054ea960ce5bdaef' })).toHaveAttribute('href', 'https://etherscan.io/tx/0xa96f32bc3cb428966aafe501b598ac57e5716fd22ff7576b054ea960ce5bdaef');
  expect(screen.queryByRole('heading', { name: /ownership/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/creator \/ ethscribing wallet/i)).not.toBeInTheDocument();
  expect(screen.getByText(/^ethscribing wallet$/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '0x1f01d99a90ad0c752e7765de29c386a169bd9e37' })).toHaveAttribute('href', 'https://etherscan.io/address/0x1f01d99a90ad0c752e7765de29c386a169bd9e37');
  expect(screen.queryByText(/current owner/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/protocol content sha-256/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/verified source/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /inspect primary source/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/raw file keccak-256/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/ethereum block/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/collection status/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^evidence a$/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/byte lab \/ x pixmap/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/attested artifact has no verified surviving bytes/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^xpmbitcoin\.xpm$/i }));
  expect(screen.getByText(/expected sha-256 sealed while the hunt is open/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /ethscription transaction/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /ownership/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/marketplace listing/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /inspect primary source/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /test your candidate/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /upload exact file/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /submit a finding/i }));
  expect(screen.getByRole('heading', { name: /test your candidate/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /upload exact file/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /use existing ethscription/i })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: /test bytes against bitcoin\.xpm/i })).toBeInTheDocument();
  expect(screen.queryByText(/data uri media type/i)).not.toBeInTheDocument();
  expect(screen.getByText(/read-only byte check/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/market active · transaction ui enabled · indexer current/i)).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /use existing ethscription/i }));
  expect(screen.getByText(/connect the wallet that owns the ethscription/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
  expect(screen.queryByRole('heading', { name: /test your candidate/i })).not.toBeInTheDocument();
}, 25_000);

test('loads existing wallet Ethscriptions from an expedition target', async () => {
  const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
  const id = `0x${'44'.repeat(32)}`;
  useEthscribeWallet.mockReturnValue({
    account,
    chainId: '0x1',
    walletState: 'idle',
    walletName: 'MetaMask',
    ensName: 'jeremy.eth',
    provider: null,
    connectWallet,
    switchToMainnet,
    openAccountModal,
  });
  global.fetch = jest.fn(async (url) => {
    if (url === SATOSHI_FINDINGS_URL) return { ok: true, json: async () => ({ result: [] }) };
    if (url === '/api/market/status') return { ok: true, json: async () => ({ result: { paused: false, transactionsEnabled: true, intakeEnabled: true, indexer: { healthy: true } } }) };
    if (String(url).startsWith('/api/market/wallet?owner=')) {
      return { ok: true, json: async () => ({ result: {
        directlyOwned: [{ transactionHash: id, ethscriptionNumber: 12345, mimetype: 'image/x-xpixmap' }],
        escrow: [],
        pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
      } }) };
    }
    if (url === `/api/ethscriptions/${id}`) {
      return { ok: true, json: async () => ({ result: {
        transaction_hash: id,
        ethscription_number: 12345,
        current_owner: account,
        mimetype: 'image/x-xpixmap',
        content_uri: 'data:image/x-xpixmap;base64,WA==',
      } }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^xpmbitcoin\.xpm$/i }));
  fireEvent.click(screen.getByRole('button', { name: /submit a finding/i }));
  fireEvent.click(screen.getByRole('button', { name: /use existing ethscription/i }));
  const picker = await screen.findByLabelText(/existing ethscription/i);
  expect(await screen.findByRole('option', { name: /ethscription #12345.*my wallet/i })).toBeInTheDocument();
  fireEvent.change(picker, { target: { value: id } });
  expect(await screen.findByText(/01 · ethscription in my wallet/i)).toBeInTheDocument();
});

test('does not expose a standalone Ethscribe utility outside expeditions', () => {
  window.history.pushState({}, '', '/ethscribe');
  render(<App />);

  expect(screen.queryByRole('heading', { name: /ethscribe a file directly into the vault/i })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^expeditions$/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/expeditions');
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).queryByRole('link', { name: 'Ethscribe' })).not.toBeInTheDocument();
});

test('promotes an exact verified Finding into the live expedition grid and counter', async () => {
  const findingId = `0x${'66'.repeat(32)}`;
  global.fetch = jest.fn(async (url) => {
    if (url === SATOSHI_FINDINGS_URL) {
      return { ok: true, json: async () => ({ result: [{
        findingId: `november-20-xpm--${findingId.slice(2)}`,
        targetId: 'november-20-xpm',
        validationMode: 'exact',
        ethscriptionId: findingId,
        rawSha256: `0x${'11'.repeat(32)}`,
        protocolContentSha256: `0x${'22'.repeat(32)}`,
        byteLength: 4193,
        authorAddress: `0x${'33'.repeat(20)}`,
        sourceUrl: 'https://example.com/source',
        contentUri: 'data:image/x-xpixmap;base64,WA==',
        verifiedAt: '2026-09-01T12:00:00.000Z',
      }] }) };
    }
    if (String(url).startsWith('/api/market/artifact?')) {
      return { ok: true, json: async () => ({ result: {
        seller: `0x${'33'.repeat(20)}`,
        listing: { active: true, expired: false, listingNonce: '1', priceWei: '1000000000000000000' },
        custody: { verified: true, status: 'verified' },
        market: { transactionsEnabled: true },
      } }) };
    }
    return { ok: true, json: async () => ({ result: {} }) };
  });
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi');
  render(<App />);

  expect(await screen.findByRole('button', { name: /open field note for bitcoin20\.xpm, ethscribed/i })).toBeInTheDocument();
  expect(screen.getByText('8 / 22')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /open field note for bitcoin20\.xpm, ethscribed/i }));
  expect(await screen.findByText('ACTIVE LISTING')).toBeInTheDocument();
  expect(screen.getByText('1 ETH')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /connect wallet to buy/i })).toBeInTheDocument();
});

test('renders a compact Expeditions archive focused on the live hunt', () => {
  window.history.pushState({}, '', '/expeditions');
  render(<App />);

  expect(screen.getByRole('heading', { name: /^expeditions$/i })).toBeInTheDocument();
  expect(screen.getByText(/live now \/ expedition 001/i)).toBeInTheDocument();
  expect(screen.queryByText(/active and completed field records/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Enter Expedition 001' })).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi');
  expect(screen.getByRole('link', { name: /explore the active hunts/i })).toHaveAttribute('href', '#live-expeditions');
  expect(screen.queryByRole('link', { name: /propose/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/proposal notebook/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/what should the field investigate next/i)).not.toBeInTheDocument();
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('aria-current', 'page');
});

test('keeps the proposal notebook hidden when its former URL is opened directly', async () => {
  window.history.pushState({}, '', '/expeditions/propose');
  render(<App />);

  expect(screen.getByRole('heading', { name: /^expeditions$/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /propose the next expedition/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/expedition title/i)).not.toBeInTheDocument();
  await waitFor(() => expect(window.location.pathname).toBe('/expeditions'));
});

test('opens the RainbowKit wallet chooser when connection is requested', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
  expect(connectWallet).toHaveBeenCalledTimes(1);
});

test('keeps the timeline compact, filters targets, and restores the full record', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ result: [] }) }));
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi');
  render(<App />);
  expect(screen.queryByRole('heading', { name: 'bitcoin20x20.png' })).not.toBeInTheDocument();
  expect(screen.getByText('23 targets · 22 known files + 1 lost original')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Lost bytes' }));
  const timeline = document.getElementById('timeline');
  expect(within(timeline).getByRole('heading', { name: 'The attachment disappears' })).toBeInTheDocument();
  expect(within(timeline).queryByRole('heading', { name: 'The BC coin ships' })).not.toBeInTheDocument();
  expect(screen.getByText('1 target matches your view')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: 'FIND A TARGET' }), { target: { value: 'no-such-file' } });
  expect(screen.getByText(/no targets match this view/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show all targets' }));
  expect(screen.getByText('23 targets · 22 known files + 1 lost original')).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(SATOSHI_FINDINGS_URL, expect.anything()));
});

test('a corpus link opens its target even after a different timeline filter is selected', async () => {
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Ethscribed' }));
  fireEvent.click(screen.getByRole('button', { name: /open field note for bitcoin20\.xpm, not yet ethscribed, 07 NOV 2009/i }));
  expect(screen.getByRole('heading', { name: 'bitcoin20.xpm' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'All targets' })).toHaveAttribute('aria-pressed', 'true');
  expect(new URLSearchParams(window.location.search).get('artifact')).toBe('november-20-xpm');
  fireEvent.click(screen.getByRole('button', { name: /close record/i }));
  expect(screen.queryByRole('heading', { name: 'bitcoin20.xpm' })).not.toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});

test('mobile Escape returns focus to the menu button', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
});

test('unknown routes show a useful not-found view instead of silently rendering the mission', () => {
  window.history.pushState({}, '', '/missing-expedition');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'This trail ends here.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /explore expeditions/i })).toHaveAttribute('href', '/expeditions');
  expect(document.title).toBe('Page not found — Ethscribe');
});

test('shows the exact listed amount and disables buying when a background listing refresh fails', async () => {
  let offline = false;
  const intervals = vi.spyOn(globalThis, 'setInterval');
  global.fetch = jest.fn(async (url) => {
    if (url === SATOSHI_FINDINGS_URL) return { ok: true, json: async () => ({ result: [] }) };
    if (offline) throw new Error('offline');
    return { ok: true, json: async () => ({ result: {
      seller: `0x${'33'.repeat(20)}`,
      listing: { active: true, expired: false, listingNonce: '1', priceWei: '12345' },
      custody: { verified: true }, market: { transactionsEnabled: true },
    } }) };
  });
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico');
  render(<App />);
  expect(await screen.findByText('0.000000000000012345 ETH')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /connect wallet to buy/i })).toBeInTheDocument();
  try {
    offline = true;
    await waitFor(() => expect(intervals.mock.calls.some(([, delay]) => delay === 15_000)).toBe(true));
    const refreshListing = intervals.mock.calls.find(([, delay]) => delay === 15_000)[0];
    await act(async () => { await refreshListing(); });
    expect(screen.getByText('LISTING UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /connect wallet to buy/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry listing check/i })).toBeInTheDocument();
  } finally { intervals.mockRestore(); }
});

test.each([
  ['paused', { transactionsEnabled: true, intakeEnabled: false, paused: true }],
  ['intake unavailable', { transactionsEnabled: true, intakeEnabled: false, paused: false }],
])('a %s market shows its listing without offering a purchase', async (_, market) => {
  global.fetch = vi.fn(async (url) => ({ ok: true, json: async () => ({ result: url === SATOSHI_FINDINGS_URL ? [] : {
    seller: `0x${'33'.repeat(20)}`,
    listing: { active: true, expired: false, listingNonce: '1', priceWei: '1000000000000000000' },
    custody: { verified: true },
    market,
  } }) }));
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico');

  render(<App />);

  expect(await screen.findByText('1 ETH')).toBeInTheDocument();
  const listing = screen.getByRole('region', { name: 'Marketplace listing' });
  expect(within(listing).queryByRole('button', { name: /buy|purchase/i })).not.toBeInTheDocument();
});

test('switching wallets during the final listing read cancels purchase before any provider request', async () => {
  const firstAccount = `0x${'11'.repeat(20)}`;
  const nextAccount = `0x${'22'.repeat(20)}`;
  const provider = { request: vi.fn().mockRejectedValue(new Error('A cancelled purchase must not reach the wallet')) };
  const session = {
    account: firstAccount, chainId: '0x1', walletState: 'connected', walletName: 'MetaMask', provider,
    connectWallet, switchToMainnet, openAccountModal,
  };
  useEthscribeWallet.mockReturnValue(session);
  const snapshot = {
    seller: `0x${'33'.repeat(20)}`,
    listing: { active: true, expired: false, listingNonce: '1', priceWei: '1000000000000000000' },
    custody: { verified: true },
    market: { transactionsEnabled: true, intakeEnabled: true, paused: false },
  };
  let marketReads = 0;
  let resolveFreshRead;
  const freshRead = new Promise((resolve) => { resolveFreshRead = resolve; });
  global.fetch = vi.fn(async (url) => {
    if (url === SATOSHI_FINDINGS_URL) return { ok: true, json: async () => ({ result: [] }) };
    marketReads += 1;
    if (marketReads === 2) return freshRead;
    return { ok: true, json: async () => ({ result: snapshot }) };
  });
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico');
  const { rerender } = render(<App />);

  fireEvent.click(await screen.findByRole('button', { name: /buy for 1 eth/i }));
  fireEvent.click(screen.getByRole('button', { name: 'CONFIRM PURCHASE' }));
  await waitFor(() => expect(marketReads).toBe(2));
  expect(screen.getByText('CHECKING PURCHASE')).toBeInTheDocument();

  useEthscribeWallet.mockReturnValue({ ...session, account: nextAccount });
  rerender(<App />);
  await act(async () => { resolveFreshRead({ ok: true, json: async () => ({ result: snapshot }) }); });

  await waitFor(() => expect(screen.queryByText('CHECKING PURCHASE')).not.toBeInTheDocument());
  expect(provider.request).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'CONFIRM PURCHASE' })).not.toBeInTheDocument();
});

function recognizedArtifactFixture({ account = '', currentOwner = account, seller = null, creator = `0x${'11'.repeat(20)}` } = {}) {
  const ethscriptionId = '0xa96f32bc3cb428966aafe501b598ac57e5716fd22ff7576b054ea960ce5bdaef';
  useEthscribeWallet.mockReturnValue({
    account, chainId: '0x1', walletState: account ? 'connected' : 'idle', walletName: 'MetaMask',
    provider: { request: vi.fn() }, connectWallet, switchToMainnet, openAccountModal,
  });
  const snapshot = {
    ethscription: { transactionHash: ethscriptionId, currentOwner, creator },
    seller, listing: null,
    custody: { verified: Boolean(seller), status: seller ? 'verified' : 'not_in_market' },
    market: {
      address: MARKET_ADDRESS, chainId: 1, deployed: true, paused: false,
      transactionsEnabled: true, intakeEnabled: true, indexer: { available: true, healthy: true },
    },
  };
  global.fetch = vi.fn(async (url) => ({ ok: true, json: async () => ({ result: url === SATOSHI_FINDINGS_URL ? [] : snapshot }) }));
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico');
  return snapshot;
}

test('recognized artifacts offer their current owner a deposit instead of another upload or Finding', async () => {
  recognizedArtifactFixture({ account: `0x${'22'.repeat(20)}` });
  render(<App />);
  expect(await screen.findByRole('button', { name: 'DEPOSIT INTO MARKETPLACE' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /submit a finding/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /upload exact file/i })).not.toBeInTheDocument();
});

test('the original creator cannot deposit a recognized artifact now owned by another wallet', async () => {
  recognizedArtifactFixture({
    account: `0x${'11'.repeat(20)}`,
    currentOwner: `0x${'22'.repeat(20)}`,
    creator: `0x${'11'.repeat(20)}`,
  });
  render(<App />);
  expect(await screen.findByText('NOT LISTED')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'DEPOSIT INTO MARKETPLACE' })).not.toBeInTheDocument();
});

test('a recognized unlisted artifact offers a wallet connection before ownership can be checked', async () => {
  recognizedArtifactFixture({ currentOwner: `0x${'22'.repeat(20)}` });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'CONNECT WALLET TO MANAGE' }));
  expect(connectWallet).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'DEPOSIT INTO MARKETPLACE' })).not.toBeInTheDocument();
});

test('already escrowed recognized artifacts offer their seller management even without a listing', async () => {
  const account = `0x${'22'.repeat(20)}`;
  recognizedArtifactFixture({ account, currentOwner: MARKET_ADDRESS, seller: account });
  render(<App />);
  expect(await screen.findByRole('link', { name: 'MANAGE IN FIELD WALLET' })).toHaveAttribute('href', '/wallet');
  expect(screen.queryByRole('button', { name: 'DEPOSIT INTO MARKETPLACE' })).not.toBeInTheDocument();
});

test('a failed ownership refresh removes an old owner deposit action', async () => {
  recognizedArtifactFixture({ account: `0x${'22'.repeat(20)}` });
  const intervals = vi.spyOn(globalThis, 'setInterval');
  try {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'DEPOSIT INTO MARKETPLACE' })).toBeInTheDocument();
    await waitFor(() => expect(intervals.mock.calls.some(([, delay]) => delay === 15_000)).toBe(true));
    global.fetch.mockRejectedValue(new Error('offline'));
    const refresh = intervals.mock.calls.find(([, delay]) => delay === 15_000)[0];
    await act(async () => { await refresh(); });
    expect(screen.getByText('LISTING UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'DEPOSIT INTO MARKETPLACE' })).not.toBeInTheDocument();
  } finally { intervals.mockRestore(); }
});

test('opens the public sound expedition with contextual navigation and a scoped Finding feed', async () => {
  const { soundExpedition } = await import('./soundExpedition');
  window.history.pushState({}, '', '/expeditions/youve-got-history');
  render(<App />);
  expect(await screen.findByRole('heading', { name: soundExpedition.title, level: 1 })).toBeInTheDocument();
  const context = screen.getByRole('navigation', { name: 'Current expedition' });
  expect(context).toHaveTextContent(`EXPEDITION 002: ${soundExpedition.title.toUpperCase()}`);
  expect(within(context).getByRole('link', { name: /EXPEDITION 002/ })).toHaveAttribute('href', '/expeditions/youve-got-history');
  expect(document.title).toContain('Ethscribe Expedition 002');
  expect(screen.queryByRole('button', { name: /^(deposit|ethscribe|submit)/i })).not.toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes('youve-got-history'))).toBe(true);
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes('/api/market/'))).toBe(false);
});

test('the directory presents both active expeditions with the newest first', async () => {
  window.history.pushState({}, '', '/expeditions');
  render(<App />);
  const sound = await screen.findByRole('region', { name: 'Expedition 002' });
  expect(within(sound).getByRole('link', { name: 'Enter Expedition 002' })).toHaveAttribute('href', '/expeditions/youve-got-history');
  const live = screen.getByRole('region', { name: 'Live expeditions' });
  expect(within(live).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/expeditions/youve-got-history', '/expeditions/lost-pixels-of-satoshi']);
});

test('the sound expedition is available in production without a preview flag', async () => {
  vi.stubEnv('DEV', false);
  window.history.pushState({}, '', '/expeditions/youve-got-history');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'You’ve Got History', level: 1 })).toBeInTheDocument();
  expect(screen.queryByText('Local research preview')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'This trail ends here.' })).not.toBeInTheDocument();
});

test('the production directory includes the active sound expedition', async () => {
  vi.stubEnv('DEV', false);
  window.history.pushState({}, '', '/expeditions');
  render(<App />);
  expect(await screen.findByRole('region', { name: 'Expedition 002' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Enter Expedition 002' })).toHaveAttribute('href', '/expeditions/youve-got-history');
});

test('a sound target deep link opens the shared compact upload or existing-Ethscription Finding workflow', async () => {
  global.fetch = vi.fn(async (url) => ({ ok: true, json: async () => ({ result: String(url).includes('/api/findings') ? [] : { paused: false, transactionsEnabled: true, intakeEnabled: true, indexer: { healthy: true } } }) }));
  window.history.pushState({}, '', '/expeditions/youve-got-history?artifact=windows-31-ding#record-windows-31-ding');
  render(<App />);
  expect(await screen.findByRole('region', { name: 'The familiar ding' })).toHaveAttribute('id', 'record-windows-31-ding');
  expect(screen.queryByRole('button', { name: 'UPLOAD EXACT FILE' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'SUBMIT A FINDING' }));
  expect(screen.getByRole('button', { name: 'UPLOAD EXACT FILE' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'USE EXISTING ETHSCRIPTION' })).toBeInTheDocument();
  expect(screen.getByLabelText(/exact file/i)).toHaveAttribute('type', 'file');
  fireEvent.click(screen.getByRole('button', { name: 'USE EXISTING ETHSCRIPTION' }));
  expect(screen.getByText(/connect the wallet that owns the ethscription/i)).toBeInTheDocument();
});

test('a recognized AOL artifact reuses the owner deposit flow without asking for another Finding', async () => {
  const { soundTargets } = await import('./soundExpedition');
  const target = soundTargets.find(artifact => artifact.id === 'aol-got-mail-1993');
  const account = `0x${'22'.repeat(20)}`;
  const provider = { request: vi.fn() };
  useEthscribeWallet.mockReturnValue({ account, chainId: '0x1', walletState: 'connected', walletName: 'MetaMask', provider, connectWallet, switchToMainnet, openAccountModal });
  global.fetch = vi.fn(async (url) => ({ ok: true, json: async () => ({ result: String(url).includes('/api/findings') ? [] : {
    ethscription: { transactionHash: target.ethscriptionId, currentOwner: account }, seller: null, listing: null,
    custody: { verified: false, status: 'not_in_market' }, market: { address: MARKET_ADDRESS, chainId: 1, paused: false, transactionsEnabled: true, intakeEnabled: true, indexer: { healthy: true } },
  } }) }));
  window.history.pushState({}, '', '/expeditions/youve-got-history?artifact=aol-got-mail-1993');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'DEPOSIT INTO MARKETPLACE' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'SUBMIT A FINDING' })).not.toBeInTheDocument();
  expect(provider.request).not.toHaveBeenCalled();
});

test('a verified sound Finding updates its audio preview and recognized count', async () => {
  const { soundTargets } = await import('./soundExpedition');
  const target = soundTargets.find(artifact => artifact.id === 'windows-31-ding');
  const ethscriptionId = `0x${'87'.repeat(32)}`;
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ result: [{
    findingId: `windows-31-ding--${ethscriptionId.slice(2)}`, expeditionId: 'youve-got-history', targetId: target.id,
    validationMode: 'exact', ethscriptionId, rawSha256: target.sha256, protocolContentSha256: `0x${'65'.repeat(32)}`,
    byteLength: target.bytes, authorAddress: `0x${'22'.repeat(20)}`, sourceUrl: target.sourceUrl,
    contentUri: 'data:audio/wav;base64,UklGRg==', verifiedAt: '2026-09-05T12:00:00.000Z',
  }] }) }));
  window.history.pushState({}, '', '/expeditions/youve-got-history');
  const { container } = render(<App />);
  expect(await screen.findByText('6 / 17')).toBeInTheDocument();
  const preview = container.querySelector(`audio[src="/api/ethscriptions/media/${ethscriptionId}"]`);
  expect(preview).toBeInTheDocument();
  expect(preview).toHaveAttribute('preload', 'none');
});
