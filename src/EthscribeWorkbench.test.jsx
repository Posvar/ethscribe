import { fireEvent, render, screen } from '@testing-library/react';
import EthscribeWorkbench from './EthscribeWorkbench';

const originalFetch = global.fetch;

beforeAll(() => {
  if (!global.TextEncoder) {
    const { TextEncoder, TextDecoder } = require('node:util');
    Object.defineProperty(global, 'TextEncoder', { value: TextEncoder });
    Object.defineProperty(global, 'TextDecoder', { value: TextDecoder });
  }
  if (!global.crypto?.subtle) {
    Object.defineProperty(global, 'crypto', { value: require('node:crypto').webcrypto });
  }
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('reduces successful target validation to one ready checkpoint with optional technical details', async () => {
  global.fetch = jest.fn(async (url) => {
    if (url === '/api/market/status') {
      return { ok: true, json: async () => ({ result: { paused: false, transactionsEnabled: true, indexer: { healthy: true } } }) };
    }
    if (url === '/api/targets/check') {
      return { ok: true, json: async () => ({ result: { targetId: 'november-20-xpm', eligible: true, validation: 'exact' } }) };
    }
    if (String(url).startsWith('/api/ethscriptions/exists/')) {
      return { ok: true, json: async () => ({ result: { exists: false, ethscription: null } }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const bytes = new TextEncoder().encode('/* XPM */\nstatic char * test[] = {"1 1 1 1", "a c #000", "a"};');
  const file = {
    name: 'bitcoin20.xpm',
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  };
  const provider = {
    request: jest.fn(async ({ method }) => {
      if (method === 'eth_chainId') return '0x1';
      if (method === 'eth_sendTransaction') throw Object.assign(new Error('User rejected the request'), { code: 4001 });
      throw new Error(`Unexpected wallet method: ${method}`);
    }),
  };
  const { container } = render(<EthscribeWorkbench
    mode="target"
    artifact={{ id: 'november-20-xpm', filename: 'bitcoin20.xpm', format: 'XPM', status: 'open', validationMode: 'exact' }}
    account="0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba"
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    provider={provider}
  />);

  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.submit(screen.getByRole('button', { name: /^test bytes/i }).closest('form'));

  expect(await screen.findByText('READY TO ETHSCRIBE')).toBeInTheDocument();
  expect(screen.getByText('✓ TARGET MATCHED')).toBeInTheDocument();
  expect(screen.getByText('✓ NO KNOWN DUPLICATE FOUND')).toBeInTheDocument();
  const technicalDetails = screen.getByText('HASHES + WRAPPERS').closest('details');
  expect(technicalDetails).not.toHaveAttribute('open');
  expect(global.fetch).toHaveBeenCalledTimes(6);

  fireEvent.click(screen.getByRole('button', { name: /1 of 2 · ethscribe to my wallet/i }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /^open wallet/i }));

  expect(await screen.findByText(/transaction was cancelled in the wallet/i)).toBeInTheDocument();
  expect(provider.request).toHaveBeenCalledTimes(2);
  expect(provider.request.mock.calls.map(([request]) => request.method)).toEqual(['eth_chainId', 'eth_sendTransaction']);
  expect(screen.getByText('READY TO ETHSCRIBE')).toBeInTheDocument();
  expect(screen.queryByText('CHECK INCOMPLETE')).not.toBeInTheDocument();
});
