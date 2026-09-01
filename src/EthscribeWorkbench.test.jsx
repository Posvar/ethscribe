import { fireEvent, render, screen } from '@testing-library/react';
import EthscribeWorkbench from './EthscribeWorkbench';
import { MARKET_ADDRESS } from './marketConfig';

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

test('creates a matching target directly into verified market custody', async () => {
  const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
  const txHash = `0x${'77'.repeat(32)}`;
  let expectedProtocolSha = '';

  global.fetch = jest.fn(async (url) => {
    if (url === '/api/market/status') {
      return { ok: true, json: async () => ({ result: { paused: false, transactionsEnabled: true, intakeEnabled: true, indexer: { healthy: true } } }) };
    }
    if (url === '/api/targets/check') {
      return { ok: true, json: async () => ({ result: { targetId: 'november-20-xpm', eligible: true, validation: 'exact' } }) };
    }
    if (String(url).startsWith('/api/ethscriptions/exists/')) {
      return { ok: true, json: async () => ({ result: { exists: false, ethscription: null } }) };
    }
    if (url === `/api/ethscriptions/${txHash}`) {
      return { ok: true, json: async () => ({ result: {
        transaction_hash: txHash,
        content_sha: expectedProtocolSha,
        creator: account,
        initial_owner: MARKET_ADDRESS,
        current_owner: MARKET_ADDRESS,
        previous_owner: account,
      } }) };
    }
    if (String(url).startsWith('/api/market/wallet?owner=')) {
      return { ok: true, json: async () => ({ result: {
        escrow: [{ transactionHash: txHash, custody: { verified: true, custodyKind: 'direct_creation' } }],
      } }) };
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
      if (method === 'eth_estimateGas') return '0x50000';
      if (method === 'eth_sendTransaction') return txHash;
      if (method === 'eth_getTransactionReceipt') return { status: '0x1', transactionHash: txHash };
      throw new Error(`Unexpected wallet method: ${method}`);
    }),
  };
  const { container } = render(<EthscribeWorkbench
    mode="target"
    artifact={{ id: 'november-20-xpm', filename: 'bitcoin20.xpm', format: 'XPM', status: 'open', validationMode: 'exact' }}
    account={account}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    provider={provider}
  />);

  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.submit(screen.getByRole('button', { name: /^test bytes/i }).closest('form'));

  expect(await screen.findByText('READY TO ETHSCRIBE')).toBeInTheDocument();
  expect(screen.getByText(/TARGET MATCHED/)).toBeInTheDocument();
  expect(screen.getByText(/NO KNOWN DUPLICATE FOUND/)).toBeInTheDocument();
  const technicalDetails = screen.getByText('HASHES + WRAPPERS').closest('details');
  expect(technicalDetails).not.toHaveAttribute('open');
  const protocolHashRow = Array.from(technicalDetails.querySelectorAll('dt'))
    .find((element) => element.textContent === 'PROTOCOL SHA-256')
    .closest('div');
  expectedProtocolSha = protocolHashRow.querySelector('code').textContent;

  fireEvent.click(screen.getByRole('button', { name: /ethscribe directly into vault/i }));
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByText(MARKET_ADDRESS)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /simulate \+ open wallet/i }));

  expect(await screen.findByText(/canonical artifact and direct market custody verified/i)).toBeInTheDocument();
  expect(provider.request.mock.calls.map(([request]) => request.method)).toEqual([
    'eth_chainId', 'eth_estimateGas', 'eth_sendTransaction', 'eth_getTransactionReceipt',
  ]);
  const sent = provider.request.mock.calls.find(([request]) => request.method === 'eth_sendTransaction')[0].params[0];
  expect(sent.to).toBe(MARKET_ADDRESS);
  expect(sent.from).toBe(account);
});
