function toHexChainId(chainId) {
  return chainId ? `0x${Number(chainId).toString(16)}` : '';
}

function toBigInt(value) {
  return value == null ? undefined : BigInt(value);
}

/**
 * Presents the small EIP-1193 surface used by the existing transaction code,
 * while routing wallet actions through the connector explicitly selected in
 * RainbowKit. Read-only RPC calls use the configured public mainnet client.
 */
export function createWalletProvider(walletClient, publicClient) {
  if (!walletClient || !publicClient) return null;

  return {
    async request({ method, params = [] }) {
      if (method === 'eth_chainId') {
        return toHexChainId(walletClient.chain?.id);
      }

      if (method === 'eth_estimateGas' || method === 'eth_getTransactionReceipt') {
        return publicClient.request({ method, params });
      }

      if (method === 'eth_sendTransaction') {
        const transaction = params[0] || {};
        return walletClient.sendTransaction({
          account: transaction.from || walletClient.account,
          chain: walletClient.chain,
          to: transaction.to,
          data: transaction.data,
          value: toBigInt(transaction.value),
          gas: toBigInt(transaction.gas),
          gasPrice: toBigInt(transaction.gasPrice),
          maxFeePerGas: toBigInt(transaction.maxFeePerGas),
          maxPriorityFeePerGas: toBigInt(transaction.maxPriorityFeePerGas),
          nonce: transaction.nonce == null ? undefined : Number(transaction.nonce),
        });
      }

      if (method === 'personal_sign') {
        const [message, account] = params;
        return walletClient.signMessage({
          account: account || walletClient.account,
          message: { raw: message },
        });
      }

      return walletClient.request({ method, params });
    },
  };
}

export { toHexChainId };
