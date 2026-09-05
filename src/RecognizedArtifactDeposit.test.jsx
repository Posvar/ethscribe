import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import RecognizedArtifactDeposit from './RecognizedArtifactDeposit';
import { fetchArtifactMarket } from './marketApi';
import { waitForVerifiedCustody } from './ethscriptionCreation';
import { MARKET_ADDRESS } from './marketConfig';

vi.mock('./marketApi', () => ({ fetchArtifactMarket: vi.fn() }));
vi.mock('./ethscriptionCreation', () => ({ waitForVerifiedCustody: vi.fn() }));

const owner = `0x${'aB'.repeat(20)}`;
const creator = `0x${'12'.repeat(20)}`;
const id = `0x${'34'.repeat(32)}`;
const hash = `0x${'56'.repeat(32)}`;
const artifact = { id: 'original-bc-ico', filename: 'bitcoin.ico', ethscriptionId: id };
const market = {
  address: MARKET_ADDRESS, deployed: true, chainId: 1, paused: false,
  transactionsEnabled: true, intakeEnabled: true,
  indexer: { available: true, healthy: true },
};
const snapshot = {
  ethscription: { transactionHash: id, creator, currentOwner: owner.toLowerCase() },
  market,
};
const verifiedRecord = {
  transactionHash: id, currentOwner: MARKET_ADDRESS, previousOwner: owner.toLowerCase(), custody: { verified: true },
};

function provider() {
  return { request: vi.fn(async ({ method }) => {
    if (method === 'eth_chainId') return '0x1';
    if (method === 'eth_estimateGas') return '0x10000';
    if (method === 'eth_sendTransaction') return hash;
    if (method === 'eth_getTransactionReceipt') return { status: '0x1', transactionHash: hash };
    throw new Error(`Unexpected wallet request: ${method}`);
  }) };
}

function props(overrides = {}) {
  return { artifact, snapshot, account: owner, chainId: '0x1', provider: provider(), switchToMainnet: vi.fn(), onDeposited: vi.fn(), ...overrides };
}

function review() {
  fireEvent.click(screen.getByRole('button', { name: /deposit into marketplace/i }));
}

function send() {
  fireEvent.click(screen.getByRole('button', { name: /confirm deposit in wallet/i }));
}

beforeEach(() => {
  sessionStorage.clear();
  fetchArtifactMarket.mockReset().mockResolvedValue(snapshot);
  waitForVerifiedCustody.mockReset().mockResolvedValue(verifiedRecord);
});

test('allows the current owner to review an existing asset even when somebody else created it', () => {
  const input = props();
  render(<RecognizedArtifactDeposit {...input} />);
  review();
  expect(screen.getByRole('region', { name: /review marketplace deposit/i })).toBeInTheDocument();
  expect(screen.getByText(/does not create a new copy or list it for sale/i)).toBeInTheDocument();
  expect(screen.getByText(MARKET_ADDRESS)).toBeInTheDocument();
  expect(screen.getByText(id)).toBeInTheDocument();
  expect(input.provider.request).not.toHaveBeenCalled();
});

test('an imported catalogue requires its pinned protocol payload before offering a deposit', () => {
  const pinned = { ...artifact, recordProtocolSha256: 'aa'.repeat(32) };
  const input = props({ artifact: pinned });
  const { container, rerender } = render(<RecognizedArtifactDeposit {...input} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<RecognizedArtifactDeposit {...input} snapshot={{ ...snapshot, ethscription: { ...snapshot.ethscription, contentSha: pinned.recordProtocolSha256 } }} />);
  expect(screen.getByRole('button', { name: /deposit into marketplace/i })).toBeInTheDocument();
});

test('rechecks an imported payload immediately before the wallet can open', async () => {
  const pinned = { ...artifact, recordProtocolSha256: 'aa'.repeat(32) };
  const input = props({ artifact: pinned, snapshot: { ...snapshot, ethscription: { ...snapshot.ethscription, contentSha: pinned.recordProtocolSha256 } } });
  fetchArtifactMarket.mockResolvedValue({ ...snapshot, ethscription: { ...snapshot.ethscription, contentSha: 'bb'.repeat(32) } });
  render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  expect(await screen.findByText(/artifact payload no longer matches/i)).toBeInTheDocument();
  expect(input.provider.request).not.toHaveBeenCalled();
  expect(input.onDeposited).not.toHaveBeenCalled();
});

test.each([
  { account: creator },
  { account: '' },
  { snapshot: null },
  { snapshot: { ...snapshot, ethscription: { ...snapshot.ethscription, transactionHash: `0x${'ff'.repeat(32)}` } } },
  { account: MARKET_ADDRESS, snapshot: { ...snapshot, ethscription: { ...snapshot.ethscription, currentOwner: MARKET_ADDRESS } } },
])('does not offer deposits for a disconnected, nonowning, mismatched, or custodied wallet: %j', (overrides) => {
  const { container } = render(<RecognizedArtifactDeposit {...props(overrides)} />);
  expect(container).toBeEmptyDOMElement();
});

test('lets local preview visitors review the transfer but cannot send it', () => {
  const input = props({ snapshot: { ...snapshot, market: { ...market, localPreview: true, transactionsEnabled: false, intakeEnabled: false } } });
  render(<RecognizedArtifactDeposit {...input} />);
  review();
  expect(screen.getByRole('button', { name: /deposits disabled in local preview/i })).toBeDisabled();
  expect(screen.getByText(/deposit transactions are disabled in this local preview/i)).toBeInTheDocument();
  expect(input.provider.request).not.toHaveBeenCalled();
});

test.each([
  { paused: true },
  { indexer: { available: true, healthy: false } },
  { intakeEnabled: false },
  { transactionsEnabled: false },
  { deployed: false },
  { chainId: 11155111 },
  { address: creator },
])('keeps the owner review visible and disables sending for an unready market: %j', (change) => {
  render(<RecognizedArtifactDeposit {...props({ snapshot: { ...snapshot, market: { ...market, ...change } } })} />);
  review();
  expect(screen.getByRole('button', { name: /confirm deposit in wallet/i })).toBeDisabled();
});

test('requires mainnet and does not send while switching networks', () => {
  const input = props({ chainId: '0xaa36a7' });
  render(<RecognizedArtifactDeposit {...input} />);
  review();
  expect(screen.getByRole('button', { name: /confirm deposit in wallet/i })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /^switch to ethereum$/i }));
  expect(input.switchToMainnet).toHaveBeenCalledOnce();
  expect(input.provider.request).not.toHaveBeenCalled();
});

test('blocks an Ethscription ID that collides with a reserved contract selector', () => {
  const conflictingId = `0x5c975abb${'34'.repeat(28)}`;
  render(<RecognizedArtifactDeposit {...props({
    artifact: { ...artifact, ethscriptionId: conflictingId },
    snapshot: { ...snapshot, ethscription: { ...snapshot.ethscription, transactionHash: conflictingId } },
  })} />);
  expect(screen.getByRole('button', { name: /deposit into marketplace/i })).toBeDisabled();
  expect(screen.getByText(/conflicts with a reserved marketplace action/i)).toBeInTheDocument();
});

test.each([
  { ...snapshot, ethscription: { ...snapshot.ethscription, currentOwner: creator } },
  { ...snapshot, ethscription: { ...snapshot.ethscription, transactionHash: `0x${'ff'.repeat(32)}` } },
  { ...snapshot, market: { ...market, intakeEnabled: false } },
  { ...snapshot, market: { ...market, address: creator } },
  { ...snapshot, market: { ...market, localPreview: true } },
])('rechecks ownership and intake immediately before simulation: %j', async (fresh) => {
  fetchArtifactMarket.mockResolvedValue(fresh);
  const input = props();
  render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  await waitFor(() => expect(fetchArtifactMarket).toHaveBeenCalledWith(id));
  await waitFor(() => expect(screen.getByRole('button', { name: /confirm deposit in wallet/i })).toBeEnabled());
  expect(input.provider.request).not.toHaveBeenCalled();
  expect(input.onDeposited).not.toHaveBeenCalled();
});

test('sends the exact existing ID and verifies custody before reporting completion', async () => {
  const input = props();
  render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  expect(await screen.findByText(/deposit verified\. set a price/i)).toBeInTheDocument();
  expect(fetchArtifactMarket).toHaveBeenCalledWith(id);
  const sent = input.provider.request.mock.calls.find(([request]) => request.method === 'eth_sendTransaction')[0];
  expect(sent.params[0]).toEqual({ from: owner, to: MARKET_ADDRESS, value: '0x0', data: id });
  expect(input.onDeposited).toHaveBeenCalledWith(verifiedRecord);
  expect(screen.getByRole('link', { name: /view deposit transaction/i })).toHaveAttribute('href', `https://etherscan.io/tx/${hash}`);
  expect(screen.getByRole('button', { name: /close deposit status/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /deposit into marketplace/i })).not.toBeInTheDocument();
});

test('keeps a submitted hash and retries verification without sending another deposit', async () => {
  waitForVerifiedCustody.mockRejectedValueOnce(new Error('Custody reconciliation is temporarily unavailable.'));
  const input = props();
  const { rerender } = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  expect(await screen.findByRole('button', { name: /recheck deposit/i })).toBeInTheDocument();
  rerender(<RecognizedArtifactDeposit {...input} snapshot={null} />);
  expect(screen.getByRole('link', { name: /view deposit transaction/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /recheck deposit/i }));
  expect(await screen.findByText(/deposit verified/i)).toBeInTheDocument();
  expect(input.provider.request.mock.calls.filter(([request]) => request.method === 'eth_sendTransaction')).toHaveLength(1);
  expect(waitForVerifiedCustody).toHaveBeenCalledTimes(2);
});

test('discards a stale ownership check when the wallet disconnects before it returns', async () => {
  let finishRead;
  fetchArtifactMarket.mockImplementation(() => new Promise((resolve) => { finishRead = resolve; }));
  const input = props();
  const { rerender } = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  rerender(<RecognizedArtifactDeposit {...input} account="" />);
  await act(async () => { finishRead(snapshot); });
  expect(input.provider.request).not.toHaveBeenCalled();
  expect(input.onDeposited).not.toHaveBeenCalled();
});

test('stops before sending if the chain changes during gas simulation', async () => {
  let finishEstimate;
  const wallet = provider();
  wallet.request.mockImplementation(({ method }) => {
    if (method === 'eth_chainId') return Promise.resolve('0x1');
    if (method === 'eth_estimateGas') return new Promise((resolve) => { finishEstimate = resolve; });
    throw new Error(`Unexpected ${method}`);
  });
  const input = props({ provider: wallet });
  const { rerender } = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  await waitFor(() => expect(finishEstimate).toBeDefined());
  rerender(<RecognizedArtifactDeposit {...input} chainId="0xaa36a7" />);
  await act(async () => { finishEstimate('0x10000'); });
  expect(wallet.request.mock.calls.some(([request]) => request.method === 'eth_sendTransaction')).toBe(false);
});

test('retains a hash returned after disconnect without invoking a stale completion callback', async () => {
  let finishSend;
  const wallet = provider();
  wallet.request.mockImplementation(async ({ method }) => {
    if (method === 'eth_chainId') return '0x1';
    if (method === 'eth_estimateGas') return '0x10000';
    if (method === 'eth_sendTransaction') return new Promise((resolve) => { finishSend = resolve; });
    if (method === 'eth_getTransactionReceipt') return { status: '0x1' };
  });
  const input = props({ provider: wallet });
  const { rerender } = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  await waitFor(() => expect(finishSend).toBeDefined());
  rerender(<RecognizedArtifactDeposit {...input} account="" />);
  await act(async () => { finishSend(hash); });
  expect(screen.getByRole('link', { name: /view deposit transaction/i })).toBeInTheDocument();
  expect(input.onDeposited).not.toHaveBeenCalled();
  expect(waitForVerifiedCustody).not.toHaveBeenCalled();
  rerender(<RecognizedArtifactDeposit {...input} />);
  fireEvent.click(screen.getByRole('button', { name: /recheck deposit/i }));
  expect(await screen.findByText(/deposit verified/i)).toBeInTheDocument();
  expect(wallet.request.mock.calls.filter(([request]) => request.method === 'eth_sendTransaction')).toHaveLength(1);
});

test('does not invoke a stale verification callback after unmount', async () => {
  let finishVerification;
  waitForVerifiedCustody.mockImplementation(() => new Promise((resolve) => { finishVerification = resolve; }));
  const input = props();
  const { unmount } = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  await waitFor(() => expect(finishVerification).toBeDefined());
  unmount();
  await act(async () => { finishVerification(verifiedRecord); });
  expect(input.onDeposited).not.toHaveBeenCalled();
});

test('restores a submitted deposit when the artifact is reopened and verifies it without resending', async () => {
  waitForVerifiedCustody.mockRejectedValueOnce(new Error('Custody reconciliation is temporarily unavailable.'));
  const input = props();
  const first = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  expect(await screen.findByRole('button', { name: /recheck deposit/i })).toBeInTheDocument();
  first.unmount();
  render(<RecognizedArtifactDeposit {...input} />);
  expect(screen.queryByRole('button', { name: /deposit into marketplace/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /recheck deposit/i }));
  expect(await screen.findByText(/deposit verified/i)).toBeInTheDocument();
  expect(input.provider.request.mock.calls.filter(([request]) => request.method === 'eth_sendTransaction')).toHaveLength(1);
  expect(sessionStorage.length).toBe(0);
});

test('remembers a transaction hash that arrives after the artifact view was closed', async () => {
  let finishSend;
  const wallet = provider();
  wallet.request.mockImplementation(async ({ method }) => {
    if (method === 'eth_chainId') return '0x1';
    if (method === 'eth_estimateGas') return '0x10000';
    if (method === 'eth_sendTransaction') return new Promise((resolve) => { finishSend = resolve; });
    if (method === 'eth_getTransactionReceipt') return { status: '0x1' };
  });
  const input = props({ provider: wallet });
  const first = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  await waitFor(() => expect(finishSend).toBeDefined());
  first.unmount();
  await act(async () => { finishSend(hash); });
  expect(input.onDeposited).not.toHaveBeenCalled();
  expect(sessionStorage.length).toBe(1);
  render(<RecognizedArtifactDeposit {...input} />);
  expect(screen.getByRole('link', { name: /view deposit transaction/i })).toHaveAttribute('href', `https://etherscan.io/tx/${hash}`);
  fireEvent.click(screen.getByRole('button', { name: /recheck deposit/i }));
  expect(await screen.findByText(/deposit verified/i)).toBeInTheDocument();
  expect(wallet.request.mock.calls.filter(([request]) => request.method === 'eth_sendTransaction')).toHaveLength(1);
});

test('does not restore another wallet’s cached deposit', async () => {
  waitForVerifiedCustody.mockRejectedValueOnce(new Error('Custody reconciliation is temporarily unavailable.'));
  const input = props();
  const first = render(<RecognizedArtifactDeposit {...input} />);
  review(); send();
  expect(await screen.findByRole('button', { name: /recheck deposit/i })).toBeInTheDocument();
  first.unmount();
  const second = props({ account: creator, snapshot: { ...snapshot, ethscription: { ...snapshot.ethscription, currentOwner: creator } } });
  render(<RecognizedArtifactDeposit {...second} />);
  expect(screen.getByRole('button', { name: /deposit into marketplace/i })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /view deposit transaction/i })).not.toBeInTheDocument();
});
