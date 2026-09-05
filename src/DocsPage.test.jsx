import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import DocsPage from './DocsPage';

vi.mock('./XpmPreview', () => ({ default: function MockXpmPreview() {
  return <div data-testid="xpm-preview" />;
} }));
vi.mock('./useEthscribeWallet', () => ({
  useEthscribeWallet: () => ({
    account: '',
    chainId: '',
    walletState: 'idle',
    walletName: '',
    provider: null,
    connectWallet: vi.fn(),
    switchToMainnet: vi.fn(),
    openAccountModal: vi.fn(),
  }),
}));
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  window.history.pushState({}, '', '/');
});

test('renders the Git-backed documentation with active navigation and parsed content', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => '# Welcome to Ethscribe\n\nA **public field guide** for exact bytes.\n\n## Start here\n\n| Layer | Proof |\n|---|---|\n| Artifact | SHA-256 |',
  });
  window.history.pushState({}, '', '/docs');

  render(<App />);

  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).queryByRole('link', { name: 'Docs' })).not.toBeInTheDocument();
  expect(within(primaryNavigation).getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/wallet');
  expect(await screen.findByRole('heading', { name: 'Welcome to Ethscribe' })).toBeInTheDocument();
  expect(screen.getByText('public field guide')).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveTextContent('SHA-256');
  expect(screen.queryByText('System design')).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/docs-content/README.md', expect.objectContaining({ signal: expect.anything() }));
});

test('shows a documentation 404 without requesting an unknown file', () => {
  global.fetch = jest.fn();
  window.history.pushState({}, '', '/docs/not-in-the-archive');

  render(<App />);

  expect(screen.getByRole('heading', { name: /not in the archive/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open the docs/i })).toHaveAttribute('href', '/docs');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('malformed encoded documentation paths show a 404 instead of crashing', () => {
  global.fetch = vi.fn();
  window.history.pushState({}, '', '/docs/%E0%A4%A');

  render(<DocsPage />);

  expect(screen.getByRole('heading', { name: /not in the archive/i })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('documentation links resolve relative guides and preserve safe formatting without executable URLs', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => '# Guide\n\n[Identity](../foundations/byte-perfect-identity.md#the-exact-file) [Wallet](/wallet) [`Transaction`](https://etherscan.io/tx/0x123) [Unsafe](javascript:bad) [Embedded document](data:text/html,bad)',
  });
  window.history.pushState({}, '', '/docs/product/expeditions');

  render(<DocsPage />);

  const article = screen.getByRole('article');
  expect(await within(article).findByRole('link', { name: 'Identity' })).toHaveAttribute('href', '/docs/foundations/byte-perfect-identity#the-exact-file');
  expect(within(article).getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/wallet');
  const transaction = within(article).getByRole('link', { name: 'Transaction' });
  expect(transaction).toHaveAttribute('rel', 'noopener noreferrer');
  expect(transaction.querySelector('code')).toHaveTextContent('Transaction');
  expect(within(article).queryByRole('link', { name: 'Unsafe' })).not.toBeInTheDocument();
  expect(within(article).queryByRole('link', { name: 'Embedded document' })).not.toBeInTheDocument();
  expect(article).toHaveTextContent('Unsafe');
});

test('deep links focus the loaded heading and the contents ignore code examples and disambiguate repeated titles', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => '# Guide\n\n## Evidence\n\nFirst record.\n\n```markdown\n## This is code\n```\n\n## Evidence\n\nSecond record.',
  });
  window.history.pushState({}, '', '/docs#evidence-1');

  render(<DocsPage />);

  const headings = await screen.findAllByRole('heading', { name: 'Evidence' });
  expect(headings[0]).toHaveAttribute('id', 'evidence');
  expect(headings[1]).toHaveAttribute('id', 'evidence-1');
  await waitFor(() => expect(headings[1]).toHaveFocus());
  const contents = screen.getByRole('complementary', { name: 'On this page' });
  expect(within(contents).queryByRole('link', { name: 'This is code' })).not.toBeInTheDocument();
  expect(within(contents).getAllByRole('link', { name: 'Evidence' }).map((link) => link.getAttribute('href'))).toEqual(['#evidence', '#evidence-1']);
});

test('a failed guide can be retried without a full page refresh', async () => {
  global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({
    ok: true,
    text: async () => '# Recovered guide',
  });
  window.history.pushState({}, '', '/docs');

  render(<DocsPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Document unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('heading', { name: 'Recovered guide' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test.each(['', '<!doctype html><html><body>Site fallback</body></html>'])('a missing source does not render an empty page or HTML fallback as a guide', async (source) => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => source });
  window.history.pushState({}, '', '/docs');

  render(<DocsPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Document unavailable');
  expect(screen.queryByText('Site fallback')).not.toBeInTheDocument();
});

test('readers can find guides by title, recover from no results, and clear with Escape', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '# Welcome' });
  window.history.pushState({}, '', '/docs');

  render(<DocsPage />);
  await screen.findByRole('heading', { name: 'Welcome' });

  const search = screen.getByRole('search', { name: 'Find a documentation guide' });
  const input = within(search).getByRole('searchbox', { name: 'Find a guide' });
  fireEvent.change(input, { target: { value: 'marketplace' } });
  expect(within(search).getByRole('link', { name: /Ownership and marketplace/i })).toHaveAttribute('href', '/docs/product/ownership-and-marketplace');
  fireEvent.change(input, { target: { value: 'nothingmatches' } });
  expect(within(search).getByRole('status')).toHaveTextContent('No matching titles');
  expect(within(search).queryByRole('list')).not.toBeInTheDocument();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input).toHaveValue('');
  expect(within(search).queryByRole('status')).not.toBeInTheDocument();
});
