import { MAINNET_CHAIN_ID, MARKET_ADDRESS } from './marketConfig';

// Every selector in the immutable V1 ABI. A raw Ethscription ID whose first
// four bytes collide would enter Solidity dispatch instead of the deposit fallback.
const V1_SELECTORS = new Set([
  '0x000a7ffb', '0x13888565', '0x1e83409a', '0x24dabda7', '0x2dc78f67',
  '0x3f4ba83a', '0x402914f5', '0x46904840', '0x4838ed19', '0x5c975abb',
  '0x5f5d0655', '0x61f9df78', '0x69644c75', '0x715018a6', '0x733ec0c4',
  '0x79ba5097', '0x7dbb4bbb', '0x7e78ba70', '0x822b4701', '0x8456cb59',
  '0x8a72ea6a', '0x8da5cb5b', '0x92936da3', '0x9299e552', '0xa6edbe87',
  '0xaa3a6b36', '0xbd550a2e', '0xbf333f2c', '0xc815729d', '0xcfdbf254',
  '0xe1a45218', '0xe30c3978', '0xe4dcfa6e', '0xef706adf', '0xf2fde38b',
  '0xf42af46c', '0xf73579a9',
]);

const WITHDRAW_ETHSCRIPTION_SELECTOR = '0x7e78ba70';
export const RECONCILIATION_TIMEOUT_MS = 10 * 60 * 1000;

export function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || '');
}

export function isEthscriptionId(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value || '');
}

export function hasDepositSelectorCollision(ethscriptionId) {
  if (!isEthscriptionId(ethscriptionId)) return false;
  return V1_SELECTORS.has(ethscriptionId.slice(0, 10).toLowerCase());
}

export function reconciliationTimedOut(startedAt, now = Date.now()) {
  return Number.isFinite(startedAt) && now - startedAt >= RECONCILIATION_TIMEOUT_MS;
}

function requireAddress(value, label) {
  if (!isAddress(value)) throw new Error(`Invalid ${label} address.`);
  return value;
}

function requireEthscriptionId(value) {
  if (!isEthscriptionId(value)) throw new Error('Invalid Ethscription ID.');
  return value.toLowerCase();
}

export function buildDepositTransaction(account, ethscriptionId) {
  const from = requireAddress(account, 'wallet');
  const id = requireEthscriptionId(ethscriptionId);
  if (hasDepositSelectorCollision(id)) {
    throw new Error('This Ethscription ID collides with a market function selector and cannot use the V1 fallback deposit path.');
  }

  return {
    from,
    to: MARKET_ADDRESS,
    value: '0x0',
    data: id,
  };
}

export function encodeWithdrawEthscription(ethscriptionId, recipient) {
  const id = requireEthscriptionId(ethscriptionId);
  const normalizedRecipient = requireAddress(recipient, 'recipient').slice(2).toLowerCase();
  return `${WITHDRAW_ETHSCRIPTION_SELECTOR}${id.slice(2)}${normalizedRecipient.padStart(64, '0')}`;
}

export function buildWithdrawTransaction(account, ethscriptionId) {
  const from = requireAddress(account, 'wallet');
  return {
    from,
    to: MARKET_ADDRESS,
    value: '0x0',
    data: encodeWithdrawEthscription(ethscriptionId, from),
  };
}

function requireProvider(provider) {
  if (!provider || typeof provider.request !== 'function') {
    throw new Error('An Ethereum browser wallet is required.');
  }
}

export async function simulateAndSendTransaction(provider, transaction) {
  requireProvider(provider);
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (String(chainId).toLowerCase() !== MAINNET_CHAIN_ID) {
    throw new Error('Switch the wallet to Ethereum mainnet before continuing.');
  }

  await provider.request({ method: 'eth_estimateGas', params: [transaction] });
  const transactionHash = await provider.request({ method: 'eth_sendTransaction', params: [transaction] });
  if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash || '')) {
    throw new Error('The wallet did not return a valid transaction hash.');
  }
  return transactionHash;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForTransactionReceipt(provider, transactionHash, options = {}) {
  requireProvider(provider);
  const timeoutMs = options.timeoutMs ?? 300_000;
  const pollMs = options.pollMs ?? 3_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [transactionHash],
    });

    if (receipt) {
      if (Number.parseInt(String(receipt.status ?? '0x0'), 16) !== 1) {
        throw new Error('The Ethereum transaction reverted.');
      }
      return receipt;
    }
    await wait(pollMs);
  }

  throw new Error('The transaction is still pending. Check it on Etherscan before trying again.');
}

export function friendlyTransactionError(error) {
  if (error?.code === 4001) return 'The transaction was cancelled in the wallet.';
  const message = typeof error?.message === 'string' ? error.message : '';
  if (/user rejected|user denied/i.test(message)) return 'The transaction was cancelled in the wallet.';
  if (/External transactions to internal accounts cannot include data/i.test(message)) {
    return 'The connected browser provider rejected the direct self-addressed calldata transaction used to create an Ethscription. Reconnecting or changing networks will not change this wallet policy. Your byte preflight passed and no transaction was sent. Ethscribe must open the transaction through a compatible wallet connection while preserving your wallet as creator.';
  }
  if (/pause/i.test(message)) return 'The market is paused. No Ethscription was deposited.';
  if (/insufficient funds/i.test(message)) return 'The wallet does not have enough ETH for gas.';
  return message && message.length <= 220
    ? message
    : 'The transaction could not be completed. Nothing is represented as verified custody.';
}
