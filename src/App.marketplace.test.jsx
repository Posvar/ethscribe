import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { useEthscribeWallet } from './useEthscribeWallet';
vi.mock('./useEthscribeWallet', () => ({ useEthscribeWallet: vi.fn() }));
beforeEach(() => {
  vi.stubEnv('DEV', true);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { records: [], pagination: { hasMore: false } } }) }));
  useEthscribeWallet.mockReturnValue({ account: '', connectWallet: vi.fn(), openAccountModal: vi.fn() });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });
test('adds marketplace between expeditions and wallet on desktop and mobile', async () => {
  window.history.replaceState({}, '', '/marketplace');
  render(<App />);
  await screen.findByRole('heading', { name: 'Marketplace', level: 1 });
  const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
  expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual(['Mission', 'Expeditions', 'Marketplace', 'Wallet']);
  expect(within(nav).getByRole('link', { name: 'Marketplace' })).toHaveAttribute('aria-current', 'page');
  expect(within(nav).getByRole('link', { name: 'Mission' })).toHaveAttribute('href', '/#mission');
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  const mobile = screen.getByRole('navigation', { name: 'Mobile navigation' });
  expect(mobile.firstElementChild.tagName).toBe('BUTTON');
  expect(within(mobile).getAllByRole('link').map(link => link.textContent)).toEqual(['Mission', 'Expeditions', 'Marketplace', 'Wallet']);
});
test('publishes marketplace in production without exposing draft expeditions', async () => {
  vi.stubEnv('DEV', false);
  window.history.replaceState({}, '', '/marketplace');
  render(<App />);
  await screen.findByRole('heading', { name: 'Marketplace', level: 1 });
  expect(screen.getByRole('link', { name: 'Marketplace' })).toHaveAttribute('href', '/marketplace');
  expect(screen.queryByText(/Browser Wars|Skin Deep/)).not.toBeInTheDocument();
});
