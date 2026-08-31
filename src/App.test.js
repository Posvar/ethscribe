import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

jest.mock('./XpmPreview', () => function MockXpmPreview() {
  return <div data-testid="xpm-preview" />;
});

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline test'));
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
  expect(brand.querySelector('img')).toHaveAttribute('src', '/ethscribe-icon.svg');
  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).getByRole('link', { name: 'Propose' })).toHaveAttribute('href', '#propose');
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
  expect(within(mobileNavigation).getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
  expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
});

test('expands secured and open artifact records directly in the timeline', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      result: {
        creator: '0x1f01d99a90ad0c752e7765de29c386a169bd9e37',
        current_owner: '0x1f01d99a90ad0c752e7765de29c386a169bd9e37',
      },
    }),
  });
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi');
  render(<App />);

  const primaryNavigation = screen.getByRole('navigation', { name: /primary navigation/i });
  expect(within(primaryNavigation).getByRole('link', { name: 'Expeditions' })).toHaveAttribute('aria-current', 'page');
  expect(within(primaryNavigation).queryByRole('link', { name: /timeline/i })).not.toBeInTheDocument();
  expect(within(primaryNavigation).queryByRole('link', { name: /byte lab/i })).not.toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /current expedition/i })).toHaveTextContent('EXPEDITION 001: THE LOST PIXELS OF SATOSHI');

  const legend = screen.getByLabelText(/timeline status legend/i);
  expect(legend.children).toHaveLength(2);
  expect(within(legend).getByText('NOT YET ETHSCRIBED')).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: /ico bitcoin\.ico/i })[0]);
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

  fireEvent.click(screen.getByRole('button', { name: /^xpm bitcoin\.xpm$/i }));
  expect(screen.getByText('bfc746462cabcd70c1f9fa909065bdd1b2fb4e73f5904de38c7c8c8326bb34b4')).toBeInTheDocument();
  expect(screen.getByText(/contract pending/i)).toBeInTheDocument();
});

test('explains when a browser wallet is unavailable', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
  expect(screen.getByRole('heading', { name: /bring an ethereum wallet/i })).toBeInTheDocument();
});
