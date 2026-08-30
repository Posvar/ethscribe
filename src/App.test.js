import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./XpmPreview', () => function MockXpmPreview() {
  return <div data-testid="xpm-preview" />;
});

afterEach(() => {
  window.history.pushState({}, '', '/');
});

test('renders a broad mission homepage with the first expedition separated', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /recover digital history/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /living museum built through public hunts/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /lost pixels of satoshi/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open the expedition/i })).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi');
  expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
});

test('expands secured and open artifact records directly in the timeline', () => {
  window.history.pushState({}, '', '/expeditions/lost-pixels-of-satoshi');
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: /ico bitcoin\.ico/i })[0]);
  expect(screen.getByText('0x1a27e03916705c933876019cbe617384d7201c979ba244479528eb0cb8544e72')).toBeInTheDocument();
  expect(screen.getByText(/22 jun 2023 · 19:48:35 utc/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^xpm bitcoin\.xpm$/i }));
  expect(screen.getByText('bfc746462cabcd70c1f9fa909065bdd1b2fb4e73f5904de38c7c8c8326bb34b4')).toBeInTheDocument();
  expect(screen.getByText(/contract pending/i)).toBeInTheDocument();
});

test('explains when a browser wallet is unavailable', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
  expect(screen.getByRole('heading', { name: /bring an ethereum wallet/i })).toBeInTheDocument();
});
