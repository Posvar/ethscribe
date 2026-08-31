import { render, screen, waitFor } from '@testing-library/react';
import WalletPage from './WalletPage';

const originalFetch = global.fetch;
const owner = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
const ethscriptionId = `0x${'a'.repeat(64)}`;

const market = {
  address: '0x44c241ac86724D64a33558b03A637a63D9a30B02',
  deployed: true,
  paused: true,
  writesEnabled: false,
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
  expect(await screen.findByText('Ethscription #174464')).toBeInTheDocument();
  expect(screen.getByText('PAUSED')).toBeInTheDocument();
  expect(screen.getByText('DISABLED')).toBeInTheDocument();
  expect(screen.getByText('CURRENT')).toBeInTheDocument();
  expect(screen.getByText('DIRECTLY OWNED')).toBeInTheDocument();
  expect(screen.getByText(/no active market deposits/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /two records must agree/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /buy|sell|deposit|ethscribe/i })).not.toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/market/wallet?owner=${owner}`, { headers: { accept: 'application/json' } }));
});
