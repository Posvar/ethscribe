import {
  buildDepositTransaction,
  buildWithdrawTransaction,
  encodeWithdrawEthscription,
  encodeWithdrawUnregisteredEthscription,
  friendlyTransactionError,
  hasDepositSelectorCollision,
  reconciliationTimedOut,
  simulateAndSendTransaction,
  waitForTransactionReceipt,
} from './marketTransactions';
import { MARKET_ADDRESS } from './marketConfig';

const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
const id = `0x${'ab'.repeat(32)}`;

test('builds the raw zero-value Ethscription deposit transaction', () => {
  expect(buildDepositTransaction(account, id)).toEqual({
    from: account,
    to: MARKET_ADDRESS,
    value: '0x0',
    data: id,
  });
});

test('rejects IDs that collide with any deployed market selector', () => {
  const pauseCollision = `0x8456cb59${'00'.repeat(28)}`;
  const directWithdrawalCollision = `0x42ea2274${'00'.repeat(28)}`;
  const directBatchWithdrawalCollision = `0xc5c2076f${'00'.repeat(28)}`;
  expect(hasDepositSelectorCollision(pauseCollision)).toBe(true);
  expect(hasDepositSelectorCollision(directWithdrawalCollision)).toBe(true);
  expect(hasDepositSelectorCollision(directBatchWithdrawalCollision)).toBe(true);
  expect(() => buildDepositTransaction(account, pauseCollision)).toThrow(/conflicts/i);
  expect(hasDepositSelectorCollision(id)).toBe(false);
});

test('ABI-encodes the ESIP-2 unregistered direct-creation exit', () => {
  const calldata = encodeWithdrawUnregisteredEthscription(id, account);
  expect(calldata.slice(0, 10)).toBe('0x42ea2274');
  expect(calldata.slice(10, 74)).toBe(id.slice(2));
  expect(buildWithdrawTransaction(account, id, { directCreation: true }).data).toBe(calldata);
});

test('ABI-encodes withdrawal to the connected wallet', () => {
  const calldata = encodeWithdrawEthscription(id, account);
  expect(calldata).toHaveLength(2 + 8 + 64 + 64);
  expect(calldata.slice(0, 10)).toBe('0x7e78ba70');
  expect(calldata.slice(10, 74)).toBe(id.slice(2));
  expect(calldata.slice(-40)).toBe(account.slice(2).toLowerCase());
  expect(buildWithdrawTransaction(account, id).data).toBe(calldata);
});

test('simulates on mainnet before asking the wallet to send', async () => {
  const calls = [];
  const provider = {
    request: jest.fn(({ method, params }) => {
      calls.push({ method, params });
      if (method === 'eth_chainId') return Promise.resolve('0x1');
      if (method === 'eth_estimateGas') return Promise.resolve('0x5208');
      if (method === 'eth_sendTransaction') return Promise.resolve(`0x${'12'.repeat(32)}`);
      return Promise.reject(new Error('unexpected method'));
    }),
  };
  const transaction = buildDepositTransaction(account, id);

  await expect(simulateAndSendTransaction(provider, transaction)).resolves.toBe(`0x${'12'.repeat(32)}`);
  expect(calls.map(({ method }) => method)).toEqual(['eth_chainId', 'eth_estimateGas', 'eth_sendTransaction']);
  expect(calls[1].params[0]).toEqual(transaction);
  expect(calls[2].params[0]).toEqual(transaction);
});

test('waits for a successful receipt and explains common wallet failures', async () => {
  const provider = { request: jest.fn().mockResolvedValue({ status: '0x1', blockNumber: '0x10' }) };
  await expect(waitForTransactionReceipt(provider, `0x${'34'.repeat(32)}`, { pollMs: 0, timeoutMs: 10 })).resolves.toMatchObject({ status: '0x1' });
  expect(friendlyTransactionError({ code: 4001 })).toMatch(/cancelled/i);
  expect(friendlyTransactionError(new Error('execution reverted: EnforcedPause'))).toMatch(/paused/i);
});

test('bounds post-confirmation reconciliation without timing out an unknown start', () => {
  expect(reconciliationTimedOut(1_000, 600_999)).toBe(false);
  expect(reconciliationTimedOut(1_000, 601_000)).toBe(true);
  expect(reconciliationTimedOut(undefined, 601_000)).toBe(false);
});
