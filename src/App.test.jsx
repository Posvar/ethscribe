import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { useEthscribeWallet } from './useEthscribeWallet';

vi.mock('./XpmPreview', () => ({ default: function MockXpmPreview() {
  return <div data-testid="xpm-preview" />;
} }));
vi.mock('./useEthscribeWallet', () => ({ useEthscribeWallet: vi.fn() }));

const originalFetch = global.fetch;
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
  expect(screen.getByText(/known files secured/i)).toBeInTheDocument();
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
    if (url === '/api/findings') return { ok: true, json: async () => ({ result: [] }) };
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
  expect(screen.getByRole('heading', { name: /find the bytes.*establish the provenance/i })).toBeInTheDocument();
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).queryByRole('link', { name: 'Ethscribe' })).not.toBeInTheDocument();
});

test('promotes an exact verified Finding into the live expedition grid and counter', async () => {
  const findingId = `0x${'66'.repeat(32)}`;
  global.fetch = jest.fn(async (url) => {
    if (url === '/api/findings') {
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
  expect(screen.getByRole('link', { name: /lost pixels of satoshi/i })).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi');
  expect(screen.getByRole('link', { name: /enter the live expedition/i })).toHaveAttribute('href', '#live-expeditions');
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
