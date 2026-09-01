import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WalletPage from './WalletPage';

const originalFetch = global.fetch;
const owner = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
const ethscriptionId = `0x${'a'.repeat(64)}`;

const market = {
  address: '0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614',
  deployed: true,
  paused: true,
  writesEnabled: false,
  transactionsEnabled: false,
  intakeEnabled: false,
  exitsEnabled: false,
  feeBps: 500,
  indexer: { healthy: true, blocksBehind: 0 },
};

beforeEach(() => {
  global.fetch = jest.fn((path) => Promise.resolve({
    ok: true,
    json: async () => path === '/api/market/status'
      ? { result: market }
      : {
          result: {
            owner: owner.toLowerCase(),
            market,
            directlyOwned: [{
              transactionHash: ethscriptionId,
              ethscriptionNumber: 174464,
              blockTimestamp: 1687470000,
              currentOwner: owner,
              contentSha: 'f'.repeat(64),
              mimetype: 'image/png',
            }],
            escrow: [],
            pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
          },
        },
  }));
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('shows live paused-market state and read-only wallet inventory', async () => {
  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  expect(screen.getByRole('heading', { name: /your field wallet/i })).toBeInTheDocument();
  expect(await screen.findByRole('tab', { name: /marketplace custody/i })).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByText(/no ethscriptions from this wallet are currently verified/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /my wallet/i }));
  expect(await screen.findByText('Ethscription #174464')).toBeInTheDocument();
  expect(screen.getByText('PAUSED')).toBeInTheDocument();
  expect(screen.getByText('LOCKED')).toBeInTheDocument();
  expect(screen.getByText('CURRENT')).toBeInTheDocument();
  expect(screen.getByText('IN MY WALLET')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /two records must agree/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /test before you deposit/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /upload a file/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /ethscription in my wallet/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/expedition 001 target/i)).toHaveTextContent('bitcoin20.xpm');
  expect(screen.getByRole('button', { name: /deposit test locked/i })).toBeDisabled();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/market/wallet?owner=${owner}`, { headers: { accept: 'application/json' } }));
});

test('simulates a deposit and waits for fail-closed custody reconciliation', async () => {
  const activeMarket = {
    ...market,
    paused: false,
    writesEnabled: true,
    transactionsEnabled: true,
    intakeEnabled: true,
    exitsEnabled: true,
  };
  let walletReads = 0;
  global.fetch = jest.fn(() => {
    walletReads += 1;
    const reconciled = walletReads > 1;
    return Promise.resolve({
      ok: true,
      json: async () => ({
        result: {
          owner: owner.toLowerCase(),
          market: activeMarket,
          directlyOwned: reconciled ? [] : [{
            transactionHash: ethscriptionId,
            ethscriptionNumber: 174464,
            blockTimestamp: 1687470000,
            currentOwner: owner,
            contentSha: 'f'.repeat(64),
            mimetype: 'image/png',
          }],
          escrow: reconciled ? [{
            transactionHash: ethscriptionId,
            ethscriptionNumber: 174464,
            blockTimestamp: 1687470000,
            currentOwner: activeMarket.address,
            contentSha: 'f'.repeat(64),
            mimetype: 'image/png',
            custody: { verified: true, status: 'verified', reason: 'Official ownership and active contract custody agree.' },
          }] : [],
          pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
        },
      }),
    });
  });
  const txHash = `0x${'1'.repeat(64)}`;
  const provider = {
    request: jest.fn(({ method }) => {
      if (method === 'eth_chainId') return Promise.resolve('0x1');
      if (method === 'eth_estimateGas') return Promise.resolve('0x10000');
      if (method === 'eth_sendTransaction') return Promise.resolve(txHash);
      if (method === 'eth_getTransactionReceipt') return Promise.resolve({ status: '0x1', transactionHash: txHash });
      return Promise.reject(new Error(`Unexpected ${method}`));
    }),
  };

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    provider={provider}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  fireEvent.click(await screen.findByRole('tab', { name: /my wallet/i }));
  const deposit = await screen.findByRole('button', { name: /deposit for custody only/i });
  fireEvent.click(deposit);
  const confirm = screen.getByRole('button', { name: /simulate \+ open wallet/i });
  expect(confirm).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /disposable, low-value test artifact/i }));
  fireEvent.click(confirm);

  expect(await screen.findByText(/custody verified\. the official indexer/i)).toBeInTheDocument();
  expect(provider.request.mock.calls.map(([request]) => request.method)).toEqual([
    'eth_chainId', 'eth_estimateGas', 'eth_sendTransaction', 'eth_getTransactionReceipt',
  ]);
  expect(screen.getByRole('link', { name: /view transaction/i })).toHaveAttribute('href', `https://etherscan.io/tx/${txHash}`);
});

test('withdraws verified custody back to the connected wallet while intake is paused', async () => {
  const exitMarket = {
    ...market,
    paused: true,
    transactionsEnabled: true,
    intakeEnabled: false,
    exitsEnabled: true,
  };
  let walletReads = 0;
  const escrowRecord = {
    transactionHash: ethscriptionId,
    ethscriptionNumber: 174464,
    blockTimestamp: 1687470000,
    currentOwner: exitMarket.address,
    contentSha: 'f'.repeat(64),
    mimetype: 'image/png',
    custody: { verified: true, status: 'verified', reason: 'Official ownership and active contract custody agree.' },
  };
  global.fetch = jest.fn(() => {
    walletReads += 1;
    const withdrawn = walletReads > 1;
    return Promise.resolve({
      ok: true,
      json: async () => ({
        result: {
          owner: owner.toLowerCase(),
          market: exitMarket,
          directlyOwned: withdrawn ? [{ ...escrowRecord, currentOwner: owner, custody: undefined }] : [],
          escrow: withdrawn ? [] : [escrowRecord],
          pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
        },
      }),
    });
  });
  const txHash = `0x${'2'.repeat(64)}`;
  const provider = {
    request: jest.fn(({ method }) => {
      if (method === 'eth_chainId') return Promise.resolve('0x1');
      if (method === 'eth_estimateGas') return Promise.resolve('0x10000');
      if (method === 'eth_sendTransaction') return Promise.resolve(txHash);
      if (method === 'eth_getTransactionReceipt') return Promise.resolve({ status: '0x1', transactionHash: txHash });
      return Promise.reject(new Error(`Unexpected ${method}`));
    }),
  };

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    provider={provider}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  fireEvent.click(await screen.findByRole('button', { name: /withdraw to this wallet/i }));
  fireEvent.click(screen.getByRole('button', { name: /simulate \+ open wallet/i }));
  expect(await screen.findByText(/withdrawal verified\. the official indexer/i)).toBeInTheDocument();
});

test('stops reconciliation if the connected account changes after confirmation', async () => {
  const activeMarket = {
    ...market,
    paused: false,
    writesEnabled: true,
    transactionsEnabled: true,
    intakeEnabled: true,
    exitsEnabled: true,
  };
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({
      result: {
        owner: owner.toLowerCase(),
        market: activeMarket,
        directlyOwned: [{
          transactionHash: ethscriptionId,
          ethscriptionNumber: 174464,
          blockTimestamp: 1687470000,
          currentOwner: owner,
          contentSha: 'f'.repeat(64),
          mimetype: 'image/png',
        }],
        escrow: [],
        pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
      },
    }),
  }));
  const txHash = `0x${'3'.repeat(64)}`;
  const provider = {
    request: jest.fn(({ method }) => {
      if (method === 'eth_chainId') return Promise.resolve('0x1');
      if (method === 'eth_estimateGas') return Promise.resolve('0x10000');
      if (method === 'eth_sendTransaction') return Promise.resolve(txHash);
      if (method === 'eth_getTransactionReceipt') return Promise.resolve({ status: '0x1', transactionHash: txHash });
      return Promise.reject(new Error(`Unexpected ${method}`));
    }),
  };
  const props = {
    chainId: '0x1',
    connectWallet: jest.fn(),
    switchToMainnet: jest.fn(),
    provider,
    header: <div>HEADER</div>,
    footer: <div>FOOTER</div>,
  };
  const { rerender } = render(<WalletPage account={owner} {...props} />);

  fireEvent.click(await screen.findByRole('tab', { name: /my wallet/i }));
  fireEvent.click(await screen.findByRole('button', { name: /deposit for custody only/i }));
  fireEvent.click(screen.getByRole('checkbox', { name: /disposable, low-value test artifact/i }));
  fireEvent.click(screen.getByRole('button', { name: /simulate \+ open wallet/i }));
  expect(await screen.findByText(/waiting for the official indexer/i)).toBeInTheDocument();

  const differentAccount = `0x${'9'.repeat(40)}`;
  rerender(<WalletPage account={differentAccount} {...props} />);
  expect(await screen.findByText(/reconnect the wallet that submitted/i)).toBeInTheDocument();
  expect(screen.getByText(/do not resubmit/i)).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    `/api/market/wallet?owner=${differentAccount}`,
    { headers: { accept: 'application/json' } },
  ));
  await waitFor(() => expect(screen.getByRole('button', { name: 'REFRESH' })).toBeEnabled());
});

test('can preflight an Ethscription already held by the connected wallet', async () => {
  global.fetch = jest.fn((path) => Promise.resolve({
    ok: true,
    json: async () => {
      if (path === '/api/market/status') return { result: market };
      if (path === `/api/ethscriptions/${ethscriptionId}`) {
        return {
          result: {
            transaction_hash: ethscriptionId,
            ethscription_number: 174464,
            current_owner: owner,
            previous_owner: owner,
            mimetype: 'image/x-xpixmap',
            content_uri: 'data:image/x-xpixmap;base64,QQ==',
          },
        };
      }
      return {
        result: {
          owner: owner.toLowerCase(),
          market,
          directlyOwned: [{
            transactionHash: ethscriptionId,
            ethscriptionNumber: 174464,
            blockTimestamp: 1687470000,
            currentOwner: owner,
            mimetype: 'image/x-xpixmap',
          }],
          escrow: [],
          pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
        },
      };
    },
  }));

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  const targetSelect = await screen.findByLabelText(/expedition 001 target/i);
  fireEvent.change(targetSelect, { target: { value: 'november-20-xpm' } });
  expect(targetSelect).toHaveValue('november-20-xpm');
  fireEvent.click(screen.getByRole('button', { name: /ethscription in my wallet/i }));
  await screen.findByRole('option', { name: /ethscription #174464/i });
  const walletSelect = screen.getByLabelText(/my ethscription/i);
  fireEvent.change(walletSelect, { target: { value: ethscriptionId } });
  expect(walletSelect).toHaveValue(ethscriptionId);

  expect(await screen.findByText(/01 · ethscription in my wallet/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: /test bytes/i })).toBeEnabled());
  expect(screen.getByText(/never opens your wallet or sends a transaction/i)).toBeInTheDocument();
});

test('pages through marketplace custody 50 records at a time', async () => {
  const nextPageKey = `0x${'b'.repeat(64)}`;
  const secondId = `0x${'c'.repeat(64)}`;
  global.fetch = jest.fn((path) => {
    const secondPage = path.includes(`escrow_page_key=${nextPageKey}`);
    return Promise.resolve({
      ok: true,
      json: async () => ({
        result: {
          owner: owner.toLowerCase(),
          market: { ...market, paused: false, transactionsEnabled: true, exitsEnabled: true },
          directlyOwned: [],
          escrow: [{
            transactionHash: secondPage ? secondId : ethscriptionId,
            ethscriptionNumber: secondPage ? 174465 : 174464,
            blockTimestamp: 1687470000,
            mimetype: 'audio/wav',
            contentUri: 'data:audio/wav;base64,UklGRg==',
            custody: { verified: true, status: 'verified' },
          }],
          pagination: {
            directlyOwnedHasMore: false,
            escrowHasMore: !secondPage,
            escrowNextPageKey: secondPage ? null : nextPageKey,
            maximumResultsPerSection: 50,
          },
        },
      }),
    });
  });

  const { container } = render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  expect(await screen.findByText('Ethscription #174464')).toBeInTheDocument();
  expect(container.querySelector('audio[controls]')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));
  expect(await screen.findByText('Ethscription #174465')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    `/api/market/wallet?owner=${owner}&escrow_page_key=${nextPageKey}`,
    { headers: { accept: 'application/json' } },
  );
  expect(screen.getByText(/page 2 · up to 50 items/i)).toBeInTheDocument();
});
