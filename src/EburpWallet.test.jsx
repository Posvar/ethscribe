import { fireEvent, render, screen, within } from '@testing-library/react';
import EburpWallet from './EburpWallet';
import catalogue from './eburpWalletCatalogue.json';
import WalletPage from './WalletPage';
import { eburpExpedition } from './eburpExpedition';
import { artifactById } from './huntData';
import { fetchMarketStatus, fetchWalletInventory } from './marketApi';

vi.mock('./marketApi', () => ({ fetchMarketStatus: vi.fn(), fetchWalletInventory: vi.fn() }));

const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
const market = {
  address: '0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614',
  deployed: true, paused: false, localPreview: true,
  transactionsEnabled: false, intakeEnabled: false, exitsEnabled: false,
};
const core = eburpExpedition.artifacts.find(artifact => artifact.collectionGroup === 'core');
const uncheckedCore = eburpExpedition.artifacts.find(artifact => artifact.collectionGroup === 'core' && !artifact.protocolVerification.verified);
const archive = eburpExpedition.artifacts.find(artifact => artifact.collectionGroup === 'archive');
const satoshi = artifactById('original-bc-ico');

function record(artifact, index = 1, extras = {}) {
  return {
    transactionHash: artifact.ethscriptionId,
    ethscriptionNumber: 23000 + index,
    blockTimestamp: 1691787455,
    mimetype: 'image/png',
    contentSha: artifact.canonicalProtocolSha256,
    custody: { verified: true, status: 'verified', custodyKind: 'registered_deposit' },
    listing: { active: false, priceWei: '0' },
    ...extras,
  };
}

function inventory(escrow, marketSnapshot = market) {
  fetchMarketStatus.mockResolvedValue(marketSnapshot);
  fetchWalletInventory.mockResolvedValue({
    owner: account.toLowerCase(), market: marketSnapshot, escrow, directlyOwned: [], claimableWei: '0',
    pagination: { directlyOwnedHasMore: false, escrowHasMore: false, maximumResultsPerSection: 50 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  inventory([]);
});

test('the lightweight wallet catalogue exactly matches all 92 source-verified core entries', () => {
  const expected = eburpExpedition.artifacts
    .filter(artifact => artifact.collectionGroup === 'core' && artifact.verifiedSourceMatch === true)
    .map(artifact => ({
      id: artifact.id, expeditionId: eburpExpedition.id, ethscriptionId: artifact.ethscriptionId,
      name: artifact.name, filename: artifact.filename, protocolContentSha256: artifact.canonicalProtocolSha256,
    }));
  expect(catalogue.artifacts).toHaveLength(92);
  expect(catalogue.artifacts).toEqual(expected);
  expect(new Set(catalogue.artifacts.map(artifact => artifact.ethscriptionId)).size).toBe(92);
  expect(catalogue.expeditions).toEqual([{
    id: eburpExpedition.id, number: eburpExpedition.number,
    title: eburpExpedition.title, path: eburpExpedition.path,
  }]);
  expect(catalogue.nonTradingEthscriptionIds).toHaveLength(124);
  expect(catalogue.nonTradingEthscriptionIds).toEqual(eburpExpedition.artifacts
    .filter(artifact => artifact.collectionGroup === 'archive').map(artifact => artifact.ethscriptionId));
  expect(catalogue.artifacts.some(artifact => catalogue.nonTradingEthscriptionIds.includes(artifact.ethscriptionId))).toBe(false);
  expect(JSON.stringify(catalogue)).not.toMatch(/data:image|contentUri|currentOwner|custody|sourceCsv/);
});

test('links a source-matched core to Expedition 000 without publishing a Finding', async () => {
  inventory([record(core)]);
  render(<EburpWallet account={account} chainId="0x1" resolvedFindings={[]} findingIndexState="error" />);
  const link = await screen.findByRole('link', { name: /EXPEDITION 000/ });
  expect(link).toHaveAttribute('href', `/expeditions/eburp?artifact=${core.id}#record-${core.id}`);
  expect(link).toHaveTextContent(core.name);
  expect(link).toHaveTextContent(core.filename);
  expect(screen.queryByText('UNASSIGNED CONTRACT DEPOSIT')).not.toBeInTheDocument();
});

test('the supplemental catalogue covers core records beyond the historical API sample', async () => {
  expect(uncheckedCore).toBeDefined();
  inventory([record(uncheckedCore)]);
  render(<EburpWallet account={account} chainId="0x1" />);
  expect(await screen.findByRole('link', { name: /EXPEDITION 000/ })).toHaveTextContent(uncheckedCore.name);
});

test('never associates the 124 archival records with the tradable Expedition 000 core', async () => {
  inventory([record(core), record(archive, 2)]);
  render(<EburpWallet account={account} chainId="0x1" />);
  await screen.findByRole('link', { name: /EXPEDITION 000/ });
  expect(screen.getAllByRole('link', { name: /EXPEDITION 000/ })).toHaveLength(1);
  const archiveCard = screen.getByRole('heading', { name: 'Ethscription #23002' }).closest('article');
  expect(within(archiveCard).getByText('UNASSIGNED CONTRACT DEPOSIT')).toBeInTheDocument();
  expect(within(archiveCard).queryByRole('link', { name: /EXPEDITION 000/ })).not.toBeInTheDocument();
});

test.each([undefined, 'f'.repeat(64)])('does not assign a core when the fresh content hash is missing or differs: %s', async contentSha => {
  inventory([record(core, 1, { contentSha })]);
  render(<EburpWallet account={account} chainId="0x1" />);
  expect(await screen.findByText('UNASSIGNED CONTRACT DEPOSIT')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /EXPEDITION 000/ })).not.toBeInTheDocument();
});

test('normalizes hash and transaction casing without weakening exact matching', async () => {
  inventory([record(core, 1, {
    transactionHash: `0x${core.ethscriptionId.slice(2).toUpperCase()}`,
    contentSha: `0x${core.canonicalProtocolSha256.toUpperCase()}`,
  })]);
  render(<EburpWallet account={account} chainId="0x1" />);
  expect(await screen.findByRole('link', { name: /EXPEDITION 000/ })).toHaveTextContent(core.name);
});

test('does not require the generic wallet to import the additional catalogue', async () => {
  inventory([record(core)]);
  render(<WalletPage account={account} chainId="0x1" />);
  expect(await screen.findByText('UNASSIGNED CONTRACT DEPOSIT')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /EXPEDITION 000/ })).not.toBeInTheDocument();
});

test('preserves the original Satoshi catalogue association alongside EBURP core assets', async () => {
  inventory([record(satoshi), record(core, 2)]);
  render(<EburpWallet account={account} chainId="0x1" />);
  const link = await screen.findByRole('link', { name: /EXPEDITION 001.*bitcoin\.ico/i });
  expect(link).toHaveAttribute('href', '/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico#record-original-bc-ico');
  expect(screen.getByRole('link', { name: /EXPEDITION 000/ })).toHaveTextContent(core.name);
});

test('display association does not enable local listing, withdrawal or wallet requests', async () => {
  inventory([record(core)]);
  const provider = { request: vi.fn() };
  render(<EburpWallet account={account} chainId="0x1" provider={provider} />);
  await screen.findByRole('link', { name: /EXPEDITION 000/ });
  expect(screen.getByRole('button', { name: /LIST FOR SALE/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'READ-ONLY PREVIEW' })).toBeDisabled();
  expect(provider.request).not.toHaveBeenCalled();
});

test('production controls remain available only through the existing verified custody gates', async () => {
  inventory([record(core)], {
    ...market, localPreview: false, transactionsEnabled: true, intakeEnabled: true, exitsEnabled: true,
  });
  const provider = { request: vi.fn() };
  render(<EburpWallet account={account} chainId="0x1" provider={provider} />);
  await screen.findByRole('link', { name: /EXPEDITION 000/ });
  fireEvent.change(screen.getByLabelText('PRICE IN ETH'), { target: { value: '1' } });
  expect(screen.getByRole('button', { name: /LIST FOR SALE/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'WITHDRAW TO THIS WALLET' })).toBeEnabled();
  expect(provider.request).not.toHaveBeenCalled();
});

test('an expedition association alone never enables trading or withdrawal before custody verifies', async () => {
  inventory([record(core, 1, { custody: { verified: false, status: 'indexer_mismatch' } })], {
    ...market, localPreview: false, transactionsEnabled: true, intakeEnabled: true, exitsEnabled: true,
  });
  const provider = { request: vi.fn() };
  render(<EburpWallet account={account} chainId="0x1" provider={provider} />);
  await screen.findByRole('link', { name: /EXPEDITION 000/ });
  expect(screen.queryByRole('button', { name: /LIST FOR SALE/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'VERIFYING CUSTODY' })).toBeDisabled();
  expect(provider.request).not.toHaveBeenCalled();
});

test('known archive IDs cannot be priced in production, but verified withdrawals remain available', async () => {
  inventory([record(archive)], {
    ...market, localPreview: false, transactionsEnabled: true, intakeEnabled: true, exitsEnabled: true,
  });
  const provider = { request: vi.fn() };
  render(<EburpWallet account={account} chainId="0x1" provider={provider} />);
  expect(await screen.findByText('PRESERVATION ARCHIVE · NOT FOR TRADING')).toBeInTheDocument();
  expect(screen.queryByLabelText('PRICE IN ETH')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /LIST FOR SALE|REGISTER FOR SALE/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'WITHDRAW TO THIS WALLET' })).toBeEnabled();
  expect(provider.request).not.toHaveBeenCalled();
});

test('an archive record can cancel an existing listing without being allowed to set another', async () => {
  inventory([record(archive, 1, { listing: { active: true, priceWei: '1000000000000000000' } })], {
    ...market, localPreview: false, transactionsEnabled: true, intakeEnabled: true, exitsEnabled: true,
  });
  render(<EburpWallet account={account} chainId="0x1" />);
  await screen.findByText('PRESERVATION ARCHIVE · NOT FOR TRADING');
  expect(screen.getByRole('button', { name: 'CANCEL LISTING' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /UPDATE PRICE|LIST FOR SALE/ })).not.toBeInTheDocument();
});

test('the archive exclusion does not change trading controls for unrelated custody records', async () => {
  const generic = record(core, 1, { transactionHash: `0x${'b'.repeat(64)}`, contentSha: 'f'.repeat(64) });
  inventory([generic], {
    ...market, localPreview: false, transactionsEnabled: true, intakeEnabled: true, exitsEnabled: true,
  });
  render(<EburpWallet account={account} chainId="0x1" />);
  await screen.findByText('UNASSIGNED CONTRACT DEPOSIT');
  fireEvent.change(screen.getByLabelText('PRICE IN ETH'), { target: { value: '1' } });
  expect(screen.getByRole('button', { name: /LIST FOR SALE/ })).toBeEnabled();
  expect(screen.queryByText('PRESERVATION ARCHIVE · NOT FOR TRADING')).not.toBeInTheDocument();
});

test('cannot associate a supplemental record through an external expedition URL', async () => {
  inventory([record(core)]);
  render(<WalletPage account={account} chainId="0x1"
    extraCatalogue={[{ id: core.id, ethscriptionId: core.ethscriptionId, expeditionId: 'eburp', protocolContentSha256: core.canonicalProtocolSha256 }]}
    extraExpeditions={[{ id: 'eburp', title: 'Misleading link', number: '000', path: 'https://example.org/expeditions/eburp' }]} />);
  expect(await screen.findByText('UNASSIGNED CONTRACT DEPOSIT')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /EXPEDITION 000/ })).not.toBeInTheDocument();
});
