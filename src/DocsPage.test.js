import { render, screen, within } from '@testing-library/react';
import App from './App';

jest.mock('./XpmPreview', () => function MockXpmPreview() {
  return <div data-testid="xpm-preview" />;
});
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
  expect(within(primaryNavigation).getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page');
  expect(await screen.findByRole('heading', { name: 'Welcome to Ethscribe' })).toBeInTheDocument();
  expect(screen.getByText('public field guide')).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveTextContent('SHA-256');
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
