import { fetchMarketStatus, fetchWalletInventory } from './marketApi';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('reads the deployed market status through the same-origin function', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ result: { address: '0xmarket', paused: true } }),
  });

  await expect(fetchMarketStatus()).resolves.toMatchObject({ paused: true });
  expect(global.fetch).toHaveBeenCalledWith('/api/market/status', { headers: { accept: 'application/json' } });
});

test('encodes the wallet route and fails on an unusable upstream response', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'invalid_owner' }),
  });

  await expect(fetchWalletInventory('0xabc/def')).rejects.toThrow('invalid_owner');
  expect(global.fetch).toHaveBeenCalledWith('/api/market/wallet?owner=0xabc%2Fdef', { headers: { accept: 'application/json' } });
});

test('passes independent inventory cursors to the wallet route', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ result: { directlyOwned: [], escrow: [] } }),
  });
  const directPageKey = `0x${'1'.repeat(64)}`;
  const escrowPageKey = `0x${'2'.repeat(64)}`;

  await fetchWalletInventory('0xabc', { directPageKey, escrowPageKey });

  expect(global.fetch).toHaveBeenCalledWith(
    `/api/market/wallet?owner=0xabc&direct_page_key=${directPageKey}&escrow_page_key=${escrowPageKey}`,
    { headers: { accept: 'application/json' } },
  );
});
