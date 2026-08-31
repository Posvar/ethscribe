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
  const brand = screen.getByRole('link', { name: /ethscribe home/i });
  expect(within(brand).getByText('ETHSCRI.BE')).toBeInTheDocument();
  expect(brand.querySelector('img')).toHaveAttribute('src', '/icon.svg');
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).queryByRole('link', { name: 'Method' })).not.toBeInTheDocument();
  expect(within(primaryNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('href', '/expeditions');
  expect(within(primaryNavigation).queryByRole('link', { name: 'Propose' })).not.toBeInTheDocument();
  expect(within(primaryNavigation).getByRole('link', { name: 'Ethscribe' })).toHaveAttribute('href', '/ethscribe');
  expect(within(primaryNavigation).getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
  expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  expect(screen.getAllByText(/find the bytes\. establish the provenance\. own the artifact\./i)).toHaveLength(2);
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
  expect(within(mobileNavigation).getByRole('link', { name: 'Ethscribe' })).toHaveAttribute('href', '/ethscribe');
  expect(within(mobileNavigation).getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
  expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
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

  fireEvent.click(screen.getAllByRole('button', { name: /icobitcoin\.ico/i })[0]);
  expect(screen.getByRole('heading', { name: /file information/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /hashing/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /ethscription transaction/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /ownership/i })).toBeInTheDocument();
  expect(screen.getByText('0x1a27e03916705c933876019cbe617384d7201c979ba244479528eb0cb8544e72')).toBeInTheDocument();
  expect(screen.getByText(/22 jun 2023 · 19:48:35 utc/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '0xa96f32bc3cb428966aafe501b598ac57e5716fd22ff7576b054ea960ce5bdaef' })).toHaveAttribute('href', 'https://etherscan.io/tx/0xa96f32bc3cb428966aafe501b598ac57e5716fd22ff7576b054ea960ce5bdaef');
  expect(screen.getAllByRole('link', { name: '0x1f01d99a90ad0c752e7765de29c386a169bd9e37' })).toHaveLength(2);
  expect(await screen.findByText(/live ownership · official ethscriptions indexer/i)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/api/ethscriptions/0xa96f32bc3cb428966aafe501b598ac57e5716fd22ff7576b054ea960ce5bdaef');
  expect(screen.queryByText(/raw file keccak-256/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/ethereum block/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/collection status/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^xpmbitcoin\.xpm$/i }));
  expect(screen.getByText(/expected sha-256 sealed while the hunt is open/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /inspect primary source/i })).not.toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: /test bytes against bitcoin\.xpm/i })).toBeInTheDocument();
  expect(screen.getByDisplayValue('image/x-xpixmap')).toHaveAttribute('readonly');
  expect(screen.getByText(/creation does not go directly to the market/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/market active · transaction ui enabled · indexer current/i)).toBeInTheDocument());
}, 10_000);

test('offers a standalone personal Ethscribe flow with expedition handoff explained', () => {
  window.history.pushState({}, '', '/ethscribe');
  render(<App />);

  expect(screen.getByRole('heading', { name: /ethscribe a file to your own wallet/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /preserve exact bytes in your wallet/i })).toBeInTheDocument();
  expect(screen.getByText(/does not deposit, list, or assign/i)).toBeInTheDocument();
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).getByRole('link', { name: 'Ethscribe' })).toHaveAttribute('aria-current', 'page');
});

test('renders a compact newest-first Expeditions archive with a dedicated proposal entry point', () => {
  window.history.pushState({}, '', '/expeditions');
  render(<App />);

  expect(screen.getByRole('heading', { name: /^expeditions$/i })).toBeInTheDocument();
  expect(screen.getByText(/expedition archive \/ newest first/i)).toBeInTheDocument();
  expect(screen.queryByText(/active and completed field records/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /lost pixels of satoshi/i })).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi');
  expect(screen.getByRole('link', { name: /propose an expedition/i })).toHaveAttribute('href', '/expeditions/propose');
  expect(screen.queryByText(/what should the field investigate next/i)).not.toBeInTheDocument();
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('aria-current', 'page');
});

test('publishes a wallet-signed expedition proposal inline and clears the form', async () => {
  const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
  const provider = {
    request: jest.fn(async ({ method }) => {
      if (method === 'personal_sign') return `0x${'12'.repeat(65)}`;
      throw new Error(`Unexpected wallet method: ${method}`);
    }),
  };
  useEthscribeWallet.mockReturnValue({
    account,
    chainId: '0x1',
    walletState: 'idle',
    walletName: 'MetaMask',
    provider,
    connectWallet,
    switchToMainnet,
    openAccountModal,
  });
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url === '/api/proposals' && options.method === 'POST') {
      const { proposal } = JSON.parse(options.body);
      return { ok: true, json: async () => ({ result: { ...proposal, proposalId: 'proposal-test', status: 'proposed', submittedAt: proposal.createdAt } }) };
    }
    if (url === '/api/proposals') return { ok: true, json: async () => ({ result: [] }) };
    throw new Error('Unexpected request');
  });
  window.history.pushState({}, '', '/expeditions/propose');
  render(<App />);

  expect(screen.getByRole('heading', { name: /propose the next expedition/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /digital history is bigger than the web/i })).toBeInTheDocument();
  expect(screen.getByText('The Desktop Before the Web')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/no proposals yet/i)).toBeInTheDocument());

  fireEvent.change(screen.getByLabelText(/expedition title/i), { target: { value: 'Browser Archaeology' } });
  fireEvent.change(screen.getByLabelText(/what should researchers find/i), { target: { value: 'Recover the exact browser icons.' } });
  fireEvent.change(screen.getByLabelText(/why does it matter/i), { target: { value: 'They shaped visual web culture.' } });
  fireEvent.change(screen.getByLabelText(/starting source/i), { target: { value: 'https://example.com/archive' } });
  fireEvent.click(await screen.findByRole('button', { name: /sign \+ publish proposal/i }));

  expect(await screen.findByRole('heading', { name: 'Browser Archaeology' })).toBeInTheDocument();
  expect(screen.getByText(/proposal published to the public expedition notebook/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/expedition title/i)).toHaveValue('');
});

test('opens the RainbowKit wallet chooser when connection is requested', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
  expect(connectWallet).toHaveBeenCalledTimes(1);
});
