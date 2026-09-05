import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WalletPage from './WalletPage';
import { artifactById } from './huntData';

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
            claimableWei: '0',
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

test('shows a focused Field Wallet without operational pilot panels', async () => {
  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  expect(screen.getByRole('heading', { name: /field wallet/i })).toBeInTheDocument();
  expect(screen.getByText(/view ethscriptions in your wallet and manage artifacts held by the ethscribe marketplace/i)).toBeInTheDocument();
  expect(await screen.findByRole('tab', { name: /marketplace custody/i })).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByText(/no ethscriptions from this wallet are currently verified/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /my wallet/i }));
  expect(await screen.findByText('Ethscription #174464')).toBeInTheDocument();
  expect(screen.queryByText('IN MY WALLET')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/claimable marketplace credit/i)).toHaveTextContent('0 ETH');
  expect(screen.getByLabelText(/claimable marketplace credit/i)).toHaveTextContent(/your sale proceeds accumulate here/i);
  expect(screen.queryByText(/ethscribe marketplace fees and any sale proceeds/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /nothing to claim/i })).toBeDisabled();
  expect(screen.queryByRole('heading', { name: /marketplace status/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/custody pilot/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /two records must agree/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /test before you deposit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /deposit/i })).not.toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/market/wallet?owner=${owner}`, { headers: { accept: 'application/json' } }));
});

test('renders HTML in a sandbox and plain UTF-8 content as text', async () => {
  const htmlId = '0x94dcc6fda79f0360b17e5a347bb1aa86e3a67d611a3044787dbf036c42ac7476';
  const textId = '0x16757df96b89db333c32af3d768ee1aa5dec34f0adf2ac435d9f9a45282db6b9';
  global.fetch = jest.fn((path) => {
    if (path === `/api/ethscriptions/media/${textId}`) {
      return Promise.resolve({ ok: true, text: async () => 'a222330b-ce29-49a0-8723-9b1258b1522f' });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({
        result: {
          owner: owner.toLowerCase(),
          market: { ...market, transactionsEnabled: true, exitsEnabled: true },
          directlyOwned: [],
          escrow: [
            { transactionHash: htmlId, ethscriptionNumber: 5563238, blockTimestamp: 1687470000, mimetype: 'text/html', custody: { verified: true, status: 'verified' } },
            { transactionHash: textId, ethscriptionNumber: 5584922, blockTimestamp: 1687470000, mimetype: 'text/plain;utf8', custody: { verified: true, status: 'verified' } },
          ],
          pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
        },
      }),
    });
  });

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  const htmlPreview = await screen.findByTitle(/ethscription #5563238 html preview/i);
  expect(htmlPreview).toHaveAttribute('src', `/api/ethscriptions/media/${htmlId}`);
  expect(htmlPreview).toHaveAttribute('sandbox', '');
  expect(await screen.findByText('a222330b-ce29-49a0-8723-9b1258b1522f')).toBeInTheDocument();
});

test('labels verified expedition Findings and direct contract deposits separately', async () => {
  const directDepositId = `0x${'b'.repeat(64)}`;
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({
      result: {
        owner: owner.toLowerCase(),
        market,
        directlyOwned: [],
        escrow: [
          { transactionHash: ethscriptionId, ethscriptionNumber: 16251030, blockTimestamp: 1788250000, mimetype: 'image/x-xpixmap', custody: { verified: false, status: 'cooldown' } },
          { transactionHash: directDepositId, ethscriptionNumber: 16251031, blockTimestamp: 1788250100, mimetype: 'image/png', custody: { verified: false, status: 'cooldown' } },
        ],
        pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
      },
    }),
  }));

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    resolvedFindings={[{ ethscriptionId, expeditionId: 'lost-pixels-of-satoshi', targetId: 'november-20-xpm' }]}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  const assignment = await screen.findByRole('link', { name: /expedition 001.*bitcoin20\.xpm/i });
  expect(assignment).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi?artifact=november-20-xpm#record-november-20-xpm');
  expect(screen.getByText('UNASSIGNED CONTRACT DEPOSIT')).toBeInTheDocument();
  expect(screen.queryByText(/verified in market custody/i)).not.toBeInTheDocument();
});

test.each([
  ['loading', 'CHECKING ASSIGNMENT'],
  ['error', 'ASSIGNMENT INDEX UNAVAILABLE'],
  ['ready', 'UNASSIGNED CONTRACT DEPOSIT'],
])('recognized catalogue deposits remain linked while the Finding index is %s', async (findingIndexState, unresolvedLabel) => {
  const known = artifactById('original-bc-ico');
  const mixedCaseId = `0x${known.ethscriptionId.slice(2).toUpperCase()}`;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ result: {
    owner: owner.toLowerCase(), market, directlyOwned: [], claimableWei: '0', pagination: {},
    escrow: [
      { transactionHash: mixedCaseId, ethscriptionNumber: 175266, mimetype: 'image/x-icon', custody: { verified: false } },
      { transactionHash: ethscriptionId, ethscriptionNumber: 999, mimetype: 'image/png', custody: { verified: false } },
    ],
  } }) }));

  render(<WalletPage account={owner} chainId="0x1" connectWallet={jest.fn()} switchToMainnet={jest.fn()} findingIndexState={findingIndexState} />);

  const assignment = await screen.findByRole('link', { name: /expedition 001.*bitcoin\.ico/i });
  expect(assignment).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico#record-original-bc-ico');
  expect(screen.getAllByText(unresolvedLabel)).toHaveLength(1);
});

test('a published Finding mapping takes priority over the static catalogue fallback', async () => {
  const known = artifactById('original-bc-ico');
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ result: {
    owner: owner.toLowerCase(), market, directlyOwned: [], claimableWei: '0', pagination: {},
    escrow: [{ transactionHash: known.ethscriptionId, ethscriptionNumber: 175266, mimetype: 'image/x-icon', custody: { verified: false } }],
  } }) }));

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    resolvedFindings={[{ ethscriptionId: known.ethscriptionId.toUpperCase(), expeditionId: 'lost-pixels-of-satoshi', targetId: 'november-20-xpm' }]}
  />);

  const assignment = await screen.findByRole('link', { name: /expedition 001.*bitcoin20\.xpm/i });
  expect(assignment).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi?artifact=november-20-xpm#record-november-20-xpm');
  expect(screen.queryByText('UNASSIGNED CONTRACT DEPOSIT')).not.toBeInTheDocument();
});

test('keeps connected-wallet identity in the global header instead of repeating it in inventory', async () => {
  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  expect(await screen.findByRole('heading', { name: 'Your Ethscriptions' })).toBeInTheDocument();
  expect(screen.queryByText('jeremy.eth')).not.toBeInTheDocument();
  expect(screen.queryByText(/connected with/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /copy address/i })).not.toBeInTheDocument();
});

test('explains the one-time market registration required after direct-to-vault creation', async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({
      result: {
        owner: owner.toLowerCase(),
        market: { ...market, paused: false, transactionsEnabled: true, intakeEnabled: true, exitsEnabled: true },
        claimableWei: '0',
        directlyOwned: [],
        escrow: [{
          transactionHash: ethscriptionId,
          ethscriptionNumber: 16251030,
          blockTimestamp: 1788250000,
          mimetype: 'image/x-xpixmap',
          custody: { verified: true, status: 'verified', custodyKind: 'direct_creation' },
          listing: null,
        }],
        pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
      },
    }),
  }));

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  expect(await screen.findByText('REGISTRATION REQUIRED')).toBeInTheDocument();
  expect(screen.getByText(/Ethscription ID.*did not exist until creation was mined/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /register for sale/i }));
  expect(screen.getByRole('heading', { name: /register this Ethscription for sale/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /enable trading/i })).not.toBeInTheDocument();
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

test('sets a fixed ETH price for a verified marketplace deposit', async () => {
  const activeMarket = {
    ...market,
    paused: false,
    transactionsEnabled: true,
    intakeEnabled: true,
    exitsEnabled: true,
  };
  let walletReads = 0;
  global.fetch = jest.fn(() => {
    walletReads += 1;
    const listingActive = walletReads > 1;
    return Promise.resolve({
      ok: true,
      json: async () => ({
        result: {
          owner: owner.toLowerCase(),
          market: activeMarket,
          claimableWei: '0',
          directlyOwned: [],
          escrow: [{
            transactionHash: ethscriptionId,
            ethscriptionNumber: 174464,
            blockTimestamp: 1687470000,
            mimetype: 'image/png',
            custody: { verified: true, status: 'verified', custodyKind: 'registered_deposit' },
            listing: {
              active: listingActive,
              expired: false,
              priceWei: listingActive ? '250000000000000000' : '0',
              listingNonce: listingActive ? '1' : '0',
            },
          }],
          pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
        },
      }),
    });
  });
  const txHash = `0x${'4'.repeat(64)}`;
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

  const price = await screen.findByPlaceholderText('0.10');
  fireEvent.change(price, { target: { value: '0.25' } });
  fireEvent.click(screen.getByRole('button', { name: /list for sale/i }));
  expect(screen.getByRole('heading', { name: /list this ethscription/i })).toBeInTheDocument();
  expect(screen.getByText(/credits 95% to you and 5% to the ethscribe treasury/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /simulate \+ open wallet/i }));

  expect(await screen.findByText(/listing confirmed at the selected eth price/i)).toBeInTheDocument();
  const sent = provider.request.mock.calls.find(([request]) => request.method === 'eth_sendTransaction')[0].params[0];
  expect(sent.data).toMatch(/^0x822b4701/);
});

test('shows and claims accumulated marketplace credit', async () => {
  const activeMarket = {
    ...market,
    paused: false,
    transactionsEnabled: true,
    intakeEnabled: true,
    exitsEnabled: true,
    feeRecipient: owner.toLowerCase(),
  };
  let walletReads = 0;
  global.fetch = jest.fn(() => {
    walletReads += 1;
    return Promise.resolve({
      ok: true,
      json: async () => ({
        result: {
          owner: owner.toLowerCase(),
          market: activeMarket,
          claimableWei: walletReads > 1 ? '0' : '1250000000000000000',
          directlyOwned: [],
          escrow: [],
          pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
        },
      }),
    });
  });
  const txHash = `0x${'5'.repeat(64)}`;
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

  await waitFor(() => expect(screen.getByLabelText(/claimable marketplace credit/i)).toHaveTextContent('1.25 ETH'));
  expect(screen.getByLabelText(/claimable marketplace credit/i)).toHaveTextContent(/ethscribe marketplace fees and any sale proceeds/i);
  fireEvent.click(screen.getByRole('button', { name: /claim 1\.25 eth/i }));
  expect(screen.getByRole('heading', { name: /claim your marketplace credit/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /simulate \+ open wallet/i }));

  expect(await screen.findByText(/marketplace balance claimed to this wallet/i)).toBeInTheDocument();
  const sent = provider.request.mock.calls.find(([request]) => request.method === 'eth_sendTransaction')[0].params[0];
  expect(sent.data).toMatch(/^0x1e83409a/);
});

test('presents temporary indexer lag as syncing rather than uncertain custody', async () => {
  const syncingMarket = {
    ...market,
    paused: false,
    transactionsEnabled: true,
    intakeEnabled: false,
    exitsEnabled: true,
    indexer: { healthy: false, blocksBehind: 2 },
  };
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({
      result: {
        owner: owner.toLowerCase(),
        market: syncingMarket,
        directlyOwned: [],
        escrow: [{
          transactionHash: ethscriptionId,
          ethscriptionNumber: 174464,
          blockTimestamp: 1687470000,
          mimetype: 'image/png',
          custody: {
            verified: false,
            status: 'indexer_lagging',
            reason: 'Official indexer is 2 blocks behind.',
          },
        }],
        pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
        checkedAt: '2026-09-01T12:00:00.000Z',
      },
    }),
  }));

  render(<WalletPage
    account={owner}
    chainId="0x1"
    connectWallet={jest.fn()}
    switchToMainnet={jest.fn()}
    header={<div>HEADER</div>}
    footer={<div>FOOTER</div>}
  />);

  expect(await screen.findByText('SYNCING OWNERSHIP')).toBeInTheDocument();
  expect(screen.getByText(/Ethscribe checks the official ownership index again automatically/i)).toBeInTheDocument();
  expect(screen.getByText('FINALIZING MARKET UPDATE')).toBeInTheDocument();
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
        directlyOwned: [],
        escrow: [{
          transactionHash: ethscriptionId,
          ethscriptionNumber: 174464,
          blockTimestamp: 1687470000,
          contentSha: 'f'.repeat(64),
          mimetype: 'image/png',
          custody: { verified: true, status: 'verified', custodyKind: 'registered_deposit' },
          listing: { active: false, expired: false, priceWei: '0', listingNonce: '0' },
        }],
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

  const price = await screen.findByPlaceholderText('0.10');
  fireEvent.change(price, { target: { value: '0.25' } });
  fireEvent.click(screen.getByRole('button', { name: /list for sale/i }));
  fireEvent.click(screen.getByRole('button', { name: /simulate \+ open wallet/i }));
  expect(await screen.findByText(/waiting for the contract to return the new listing terms/i)).toBeInTheDocument();

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

test('ignores a late inventory response from a previously connected wallet', async () => {
  const secondOwner = `0x${'9'.repeat(40)}`;
  let finishFirstRead;
  const responseFor = (address, number) => ({
    ok: true,
    json: async () => ({ result: {
      owner: address.toLowerCase(), market, claimableWei: number === 1 ? '1000000000000000000' : '0',
      directlyOwned: [],
      escrow: [{ transactionHash: `0x${String(number).repeat(64)}`, ethscriptionNumber: number, mimetype: 'image/png', custody: { verified: false } }],
      pagination: {},
    } }),
  });
  global.fetch = jest.fn((url) => url.includes(owner)
    ? new Promise((resolve) => { finishFirstRead = resolve; })
    : Promise.resolve(responseFor(secondOwner, 2)));
  const props = { chainId: '0x1', connectWallet: jest.fn(), switchToMainnet: jest.fn() };
  const { rerender } = render(<WalletPage account={owner} {...props} />);
  rerender(<WalletPage account={secondOwner} {...props} />);
  expect(await screen.findByText('Ethscription #2')).toBeInTheDocument();
  await act(async () => { finishFirstRead(responseFor(owner, 1)); });
  expect(screen.queryByText('Ethscription #1')).not.toBeInTheDocument();
  expect(screen.getByText('Ethscription #2')).toBeInTheDocument();
  expect(screen.getByLabelText(/claimable marketplace credit/i)).toHaveTextContent('0 ETH');
});

test('closes an unsigned transaction confirmation when the wallet changes', async () => {
  const activeMarket = { ...market, transactionsEnabled: true, exitsEnabled: true };
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ result: {
    owner: owner.toLowerCase(), market: activeMarket, claimableWei: '0', directlyOwned: [],
    escrow: [{ transactionHash: ethscriptionId, ethscriptionNumber: 174464, mimetype: 'image/png', custody: { verified: true } }],
    pagination: {},
  } }) }));
  const provider = { request: jest.fn() };
  const props = { chainId: '0x1', provider, connectWallet: jest.fn(), switchToMainnet: jest.fn() };
  const { rerender } = render(<WalletPage account={owner} {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: /withdraw to this wallet/i }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  rerender(<WalletPage account={`0x${'9'.repeat(40)}`} {...props} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(provider.request).not.toHaveBeenCalled();
});
