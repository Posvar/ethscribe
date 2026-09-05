import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EthscribeWorkbench from './EthscribeWorkbench';
import { MARKET_ADDRESS } from './marketConfig';
import { inspectFile } from './ethscriptionCreation';

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

test('hides the deposit action while an existing match is being sent and after custody is verified', async () => {
  const account = `0x${'11'.repeat(20)}`;
  const assetId = `0x${'22'.repeat(32)}`;
  const depositHash = `0x${'33'.repeat(32)}`;
  const bytes = new TextEncoder().encode('/* XPM */\nstatic char * test[] = {"1 1 1 1", "a c #000", "a"};');
  const file = { name: 'bitcoin20.xpm', size: bytes.length, arrayBuffer: async () => bytes.buffer };
  const inspection = await inspectFile(file, 'image/x-xpixmap');
  const record = { transaction_hash: assetId, content_sha: inspection.protocolContentSha256, current_owner: account, block_number: 1, ethscription_number: 100 };
  global.fetch = jest.fn(async (url) => {
    if (url === '/api/market/status') return { ok: true, json: async () => ({ result: { intakeEnabled: true, indexer: { healthy: true } } }) };
    if (url === '/api/targets/check') return { ok: true, json: async () => ({ result: { targetId: 'november-20-xpm', eligible: true, validation: 'exact' } }) };
    if (url.includes('/exists/')) return { ok: true, json: async () => ({ result: {
      exists: url.endsWith(inspection.protocolContentSha256),
      ethscription: url.endsWith(inspection.protocolContentSha256) ? record : null,
    } }) };
    if (url.includes('/api/market/artifact?id=')) return { ok: true, json: async () => ({ result: {
      seller: account, ethscription: { transactionHash: assetId }, custody: { verified: true },
    } }) };
    throw new Error(`Unexpected ${url}`);
  });
  let finishReceipt;
  const provider = { request: jest.fn(async ({ method }) => {
    if (method === 'eth_chainId') return '0x1';
    if (method === 'eth_estimateGas') return '0x10000';
    if (method === 'eth_sendTransaction') return depositHash;
    if (method === 'eth_getTransactionReceipt') return new Promise((resolve) => { finishReceipt = resolve; });
    throw new Error(`Unexpected ${method}`);
  }) };
  const { container } = render(<EthscribeWorkbench
    mode="target" artifact={{ id: 'november-20-xpm', filename: 'bitcoin20.xpm', format: 'XPM', status: 'open' }}
    account={account} chainId="0x1" provider={provider} connectWallet={jest.fn()} switchToMainnet={jest.fn()}
  />);
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.submit(screen.getByRole('button', { name: /^test bytes/i }).closest('form'));
  fireEvent.click(await screen.findByRole('button', { name: /deposit my existing match/i }));
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /simulate \+ open wallet/i }));
  await waitFor(() => expect(finishReceipt).toBeDefined());
  expect(screen.queryByRole('button', { name: /deposit my existing match/i })).not.toBeInTheDocument();
  expect(screen.getByText(/transaction submitted\. checking its ethereum confirmation/i)).toBeInTheDocument();
  await act(async () => { finishReceipt({ status: '0x1', transactionHash: depositHash }); });
  expect(await screen.findByText(/canonical artifact and direct market custody verified/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /deposit my existing match/i })).not.toBeInTheDocument();
  expect(provider.request.mock.calls.filter(([request]) => request.method === 'eth_sendTransaction')).toHaveLength(1);
});

afterEach(() => {
  global.fetch = originalFetch;
});

test.each([false, true])('creates a matching target and recovers an interrupted custody check without a second send (retry: %s)', async (retryCustody) => {
  const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
  const txHash = `0x${'77'.repeat(32)}`;
  let expectedProtocolSha = '';
  let custodyReads = 0;

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
    if (String(url).startsWith('/api/market/artifact?id=')) {
      custodyReads += 1;
      if (retryCustody && custodyReads === 1) return { ok: false, status: 503 };
      return { ok: true, json: async () => ({ result: {
        seller: account.toLowerCase(),
        ethscription: { transactionHash: txHash },
        custody: { verified: true, custodyKind: 'direct_creation' },
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

  if (retryCustody) {
    fireEvent.click(await screen.findByRole('button', { name: /recheck submitted transaction/i }));
    expect(screen.queryByRole('button', { name: /ethscribe directly into vault/i })).not.toBeInTheDocument();
  }

  expect(await screen.findByText(/canonical artifact and direct market custody verified/i)).toBeInTheDocument();
  expect(provider.request.mock.calls.map(([request]) => request.method)).toEqual([
    'eth_chainId', 'eth_estimateGas', 'eth_sendTransaction', 'eth_getTransactionReceipt',
    ...(retryCustody ? ['eth_getTransactionReceipt'] : []),
  ]);
  const sent = provider.request.mock.calls.find(([request]) => request.method === 'eth_sendTransaction')[0].params[0];
  expect(sent.to).toBe(MARKET_ADDRESS);
  expect(sent.from).toBe(account);
  expect(screen.queryByText('READY TO ETHSCRIBE')).not.toBeInTheDocument();
  expect(screen.getByText('BYTE CHECK PASSED')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /view transaction/i })).toHaveAttribute('href', `https://etherscan.io/tx/${txHash}`);
});
