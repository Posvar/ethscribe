import { createWalletProvider, toHexChainId } from './walletProvider';

test('formats connected chain IDs for the existing transaction boundary', () => {
  expect(toHexChainId(1)).toBe('0x1');
  expect(toHexChainId(11155111)).toBe('0xaa36a7');
  expect(toHexChainId()).toBe('');
});

test('routes writes and signatures through the explicitly selected wallet client', async () => {
  const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
  const walletClient = {
    account,
    chain: { id: 1 },
    sendTransaction: jest.fn().mockResolvedValue(`0x${'12'.repeat(32)}`),
    signMessage: jest.fn().mockResolvedValue(`0x${'34'.repeat(65)}`),
    request: jest.fn(),
  };
  const publicClient = { request: jest.fn().mockResolvedValue('0x5208') };
  const provider = createWalletProvider(walletClient, publicClient);

  await expect(provider.request({ method: 'eth_chainId' })).resolves.toBe('0x1');
  await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from: account, to: account, value: '0x0', data: '0x1234' }],
  });
  await provider.request({ method: 'personal_sign', params: ['0xabcd', account] });

  expect(walletClient.sendTransaction).toHaveBeenCalledWith(expect.objectContaining({
    account,
    to: account,
    value: 0n,
    data: '0x1234',
  }));
  expect(walletClient.signMessage).toHaveBeenCalledWith({ account, message: { raw: '0xabcd' } });
});

test('routes estimation and receipts through the configured public RPC client', async () => {
  const walletClient = { account: '0x1', chain: { id: 1 }, request: jest.fn() };
  const publicClient = { request: jest.fn().mockResolvedValue('0x123') };
  const provider = createWalletProvider(walletClient, publicClient);
  const transaction = { from: '0x1', to: '0x2', data: '0x' };

  await provider.request({ method: 'eth_estimateGas', params: [transaction] });
  await provider.request({ method: 'eth_getTransactionReceipt', params: ['0xhash'] });

  expect(publicClient.request).toHaveBeenNthCalledWith(1, { method: 'eth_estimateGas', params: [transaction] });
  expect(publicClient.request).toHaveBeenNthCalledWith(2, { method: 'eth_getTransactionReceipt', params: ['0xhash'] });
});
