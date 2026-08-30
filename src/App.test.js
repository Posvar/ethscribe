import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the Genesis Hunt', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /unearth the bytes/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /satoshi.s workshop/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
});

test('explains when a browser wallet is unavailable', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
  expect(screen.getByRole('heading', { name: /bring an ethereum wallet/i })).toBeInTheDocument();
});
