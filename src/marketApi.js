function localPreviewResult(result) {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return result;
  const readOnlyMarket = (market) => ({
    ...market,
    localPreview: true,
    transactionsEnabled: false,
    intakeEnabled: false,
    exitsEnabled: false,
    writesEnabled: false,
  });
  return result.market
    ? { ...result, market: readOnlyMarket(result.market) }
    : readOnlyMarket(result);
}

async function request(path) {
  const response = await fetch(path, { headers: { accept: 'application/json' } });
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    // The caller receives the same stable message for an invalid or empty response.
  }

  if (!response.ok || !payload?.result) {
    throw new Error(payload?.error || 'market_read_unavailable');
  }

  return localPreviewResult(payload.result);
}

export function fetchMarketStatus() {
  return request('/api/market/status');
}

export function fetchArtifactMarket(ethscriptionId) {
  const query = new URLSearchParams({ id: ethscriptionId });
  return request(`/api/market/artifact?${query.toString()}`);
}

export function fetchWalletInventory(owner, pageKeys = {}) {
  const query = new URLSearchParams({ owner });
  if (pageKeys.directPageKey) query.set('direct_page_key', pageKeys.directPageKey);
  if (pageKeys.escrowPageKey) query.set('escrow_page_key', pageKeys.escrowPageKey);
  return request(`/api/market/wallet?${query.toString()}`);
}
