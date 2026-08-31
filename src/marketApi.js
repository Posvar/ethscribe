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

  return payload.result;
}

export function fetchMarketStatus() {
  return request('/api/market/status');
}

export function fetchWalletInventory(owner) {
  return request(`/api/market/wallet?owner=${encodeURIComponent(owner)}`);
}
