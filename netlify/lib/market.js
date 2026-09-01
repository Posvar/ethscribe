const MARKET_ADDRESS = '0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614';
const MARKET_ADDRESS_LOWER = MARKET_ADDRESS.toLowerCase();
const MAINNET_CHAIN_ID = 1;
const TRANSFER_COOLDOWN_BLOCKS = 5;
const INDEXER_MAX_BLOCK_LAG = 1;
const MAX_INVENTORY_RESULTS = 50;
const DEFAULT_RPC_URL = 'https://ethereum-rpc.publicnode.com';
const DEFAULT_INDEXER_URL = 'https://api.ethscriptions.com/v2';

const SELECTORS = Object.freeze({
  paused: '0x5c975abb',
  owner: '0x8da5cb5b',
  feeRecipient: '0x46904840',
  pendingFeeRecipient: '0xe4dcfa6e',
  marketVersion: '0x24dabda7',
  feeBps: '0xbf333f2c',
  bpsDenominator: '0xe1a45218',
  transferCooldownBlocks: '0xf42af46c',
  lockedOfferTotal: '0x7dbb4bbb',
  totalClaimable: '0x4838ed19',
  potentialDeposits: '0x61f9df78',
  listings: '0xaa3a6b36',
  claimable: '0x402914f5',
});

function rpcUrl() {
  return process.env.ETHEREUM_RPC_URL || DEFAULT_RPC_URL;
}

function indexerUrl() {
  return (process.env.ETHSCRIPTIONS_API_URL || DEFAULT_INDEXER_URL).replace(/\/$/, '');
}

function transactionUiEnabled() {
  return process.env.MARKET_UI_TRANSACTIONS_ENABLED === 'true';
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || '');
}

function isEthscriptionId(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value || '');
}

function normalizeAddress(value) {
  return isAddress(value) ? value.toLowerCase() : '';
}

function hexWord(value) {
  const hex = BigInt(value).toString(16);
  return hex.padStart(64, '0');
}

function wordAt(data, index) {
  if (typeof data !== 'string' || !data.startsWith('0x')) throw new Error('Invalid ABI response');
  const start = 2 + (index * 64);
  const word = data.slice(start, start + 64);
  if (word.length !== 64) throw new Error('Short ABI response');
  return word;
}

function decodeUint(data, index = 0) {
  return BigInt(`0x${wordAt(data, index)}`);
}

function decodeAddress(data, index = 0) {
  return `0x${wordAt(data, index).slice(24)}`;
}

function decodeBool(data, index = 0) {
  return decodeUint(data, index) !== 0n;
}

function safeNumber(value, label) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${label} exceeds JavaScript safe range`);
  return Number(value);
}

function encodePotentialDepositCall(owner, ethscriptionId) {
  if (!isAddress(owner)) throw new Error('Invalid owner address');
  if (!isEthscriptionId(ethscriptionId)) throw new Error('Invalid Ethscription ID');
  return `${SELECTORS.potentialDeposits}${owner.slice(2).toLowerCase().padStart(64, '0')}${ethscriptionId.slice(2).toLowerCase()}`;
}

function encodeListingCall(owner, ethscriptionId) {
  if (!isAddress(owner)) throw new Error('Invalid owner address');
  if (!isEthscriptionId(ethscriptionId)) throw new Error('Invalid Ethscription ID');
  return `${SELECTORS.listings}${owner.slice(2).toLowerCase().padStart(64, '0')}${ethscriptionId.slice(2).toLowerCase()}`;
}

function encodeClaimableCall(owner) {
  if (!isAddress(owner)) throw new Error('Invalid owner address');
  return `${SELECTORS.claimable}${owner.slice(2).toLowerCase().padStart(64, '0')}`;
}

function decodePotentialDeposit(data) {
  return {
    receivedBlock: safeNumber(decodeUint(data, 0), 'receivedBlock'),
    nonce: decodeUint(data, 1).toString(),
    active: decodeBool(data, 2),
  };
}

function decodeListing(data, nowSeconds = Math.floor(Date.now() / 1000)) {
  const price = decodeUint(data, 0);
  const expiry = safeNumber(decodeUint(data, 3), 'listing expiry');
  return {
    active: price > 0n,
    expired: price > 0n && expiry > 0 && expiry <= nowSeconds,
    priceWei: price.toString(),
    depositNonce: decodeUint(data, 1).toString(),
    listingNonce: decodeUint(data, 2).toString(),
    expiry,
    onlyBuyer: decodeAddress(data, 4),
    feeRecipient: decodeAddress(data, 5),
    contextHash: `0x${wordAt(data, 6)}`,
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function rpcBatch(requests) {
  const payload = requests.map((request, index) => ({
    jsonrpc: '2.0',
    id: index + 1,
    method: request.method,
    params: request.params || [],
  }));
  const response = await fetchJson(rpcUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!Array.isArray(response)) throw new Error('RPC did not return a batch');

  const byId = new Map(response.map((item) => [item.id, item]));
  return payload.map(({ id }) => {
    const item = byId.get(id);
    if (!item) return { error: 'missing_rpc_response' };
    if (item.error) return { error: item.error.message || 'rpc_error' };
    return { result: item.result };
  });
}

function callRequest(selector) {
  return { method: 'eth_call', params: [{ to: MARKET_ADDRESS, data: selector }, 'latest'] };
}

async function getIndexerStatus() {
  try {
    const result = await fetchJson(`${indexerUrl()}/status`);
    const blocksBehind = Number(result.blocks_behind);
    return {
      available: Number.isFinite(blocksBehind),
      currentBlockNumber: Number(result.current_block_number),
      lastImportedBlock: Number(result.last_imported_block),
      blocksBehind: Number.isFinite(blocksBehind) ? blocksBehind : null,
      healthy: Number.isFinite(blocksBehind) && blocksBehind <= INDEXER_MAX_BLOCK_LAG,
    };
  } catch {
    return {
      available: false,
      currentBlockNumber: null,
      lastImportedBlock: null,
      blocksBehind: null,
      healthy: false,
    };
  }
}

function reconcileIndexerStatus(indexer, rpcBlockNumber) {
  const lastImportedBlock = Number(indexer?.lastImportedBlock);
  const reportedBlocksBehind = Number(indexer?.blocksBehind);
  const rpcBlocksBehind = Number.isFinite(lastImportedBlock)
    ? Math.max(0, rpcBlockNumber - lastImportedBlock)
    : null;
  const effectiveBlocksBehind = Number.isFinite(reportedBlocksBehind) && rpcBlocksBehind !== null
    ? Math.max(reportedBlocksBehind, rpcBlocksBehind)
    : null;

  return {
    ...indexer,
    reportedBlocksBehind: Number.isFinite(reportedBlocksBehind) ? reportedBlocksBehind : null,
    rpcBlocksBehind,
    blocksBehind: effectiveBlocksBehind,
    healthy: Boolean(indexer?.available)
      && effectiveBlocksBehind !== null
      && effectiveBlocksBehind <= INDEXER_MAX_BLOCK_LAG,
  };
}

function marketCapabilities({ deployed, chainId, paused, indexerHealthy, transactionsEnabled }) {
  const readBoundaryHealthy = Boolean(deployed)
    && chainId === MAINNET_CHAIN_ID
    && Boolean(indexerHealthy);

  return {
    transactionsEnabled: Boolean(transactionsEnabled),
    intakeEnabled: Boolean(transactionsEnabled) && readBoundaryHealthy && !paused,
    exitsEnabled: Boolean(transactionsEnabled) && readBoundaryHealthy,
  };
}

function requiredResult(response, label) {
  if (!response || response.error || typeof response.result !== 'string') {
    throw new Error(`${label} unavailable`);
  }
  return response.result;
}

async function getMarketStatus() {
  const requests = [
    { method: 'eth_chainId' },
    { method: 'eth_blockNumber' },
    { method: 'eth_getCode', params: [MARKET_ADDRESS, 'latest'] },
    callRequest(SELECTORS.paused),
    callRequest(SELECTORS.owner),
    callRequest(SELECTORS.feeRecipient),
    callRequest(SELECTORS.pendingFeeRecipient),
    callRequest(SELECTORS.marketVersion),
    callRequest(SELECTORS.feeBps),
    callRequest(SELECTORS.bpsDenominator),
    callRequest(SELECTORS.transferCooldownBlocks),
    callRequest(SELECTORS.lockedOfferTotal),
    callRequest(SELECTORS.totalClaimable),
  ];

  const [responses, indexer] = await Promise.all([rpcBatch(requests), getIndexerStatus()]);
  const chainId = safeNumber(BigInt(requiredResult(responses[0], 'chainId')), 'chainId');
  const blockNumber = safeNumber(BigInt(requiredResult(responses[1], 'blockNumber')), 'blockNumber');
  const reconciledIndexer = reconcileIndexerStatus(indexer, blockNumber);
  const code = requiredResult(responses[2], 'runtime code');
  const paused = decodeBool(requiredResult(responses[3], 'paused'));
  const deployed = code !== '0x' && code !== '0x0';
  const capabilities = marketCapabilities({
    deployed,
    chainId,
    paused,
    indexerHealthy: reconciledIndexer.healthy,
    transactionsEnabled: transactionUiEnabled(),
  });

  return {
    network: 'ethereum-mainnet',
    chainId,
    blockNumber,
    address: MARKET_ADDRESS,
    deployed,
    paused,
    owner: decodeAddress(requiredResult(responses[4], 'owner')),
    feeRecipient: decodeAddress(requiredResult(responses[5], 'feeRecipient')),
    pendingFeeRecipient: decodeAddress(requiredResult(responses[6], 'pendingFeeRecipient')),
    marketVersion: safeNumber(decodeUint(requiredResult(responses[7], 'marketVersion')), 'marketVersion'),
    feeBps: safeNumber(decodeUint(requiredResult(responses[8], 'feeBps')), 'feeBps'),
    bpsDenominator: safeNumber(decodeUint(requiredResult(responses[9], 'bpsDenominator')), 'bpsDenominator'),
    transferCooldownBlocks: safeNumber(decodeUint(requiredResult(responses[10], 'transferCooldownBlocks')), 'transferCooldownBlocks'),
    lockedOfferTotalWei: decodeUint(requiredResult(responses[11], 'lockedOfferTotal')).toString(),
    totalClaimableWei: decodeUint(requiredResult(responses[12], 'totalClaimable')).toString(),
    indexer: reconciledIndexer,
    ...capabilities,
    writesEnabled: capabilities.intakeEnabled,
    checkedAt: new Date().toISOString(),
  };
}

function buildIndexerListUrl(parameters) {
  const url = new URL(`${indexerUrl()}/ethscriptions`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url.toString();
}

async function fetchIndexerList(parameters) {
  const payload = await fetchJson(buildIndexerListUrl(parameters));
  if (!Array.isArray(payload.result)) throw new Error('Indexer list response is malformed');
  return {
    records: payload.result,
    pagination: {
      hasMore: Boolean(payload.pagination?.has_more),
      pageKey: payload.pagination?.page_key || null,
    },
  };
}

function publicEthscriptionRecord(record) {
  return {
    transactionHash: record.transaction_hash,
    ethscriptionNumber: record.ethscription_number,
    blockNumber: Number(record.block_number),
    blockTimestamp: Number(record.block_timestamp),
    creator: record.creator,
    initialOwner: record.initial_owner,
    currentOwner: record.current_owner,
    previousOwner: record.previous_owner,
    contentSha: record.content_sha,
    mimetype: record.mimetype,
    attachmentSha: record.attachment_sha || null,
    attachmentContentType: record.attachment_content_type || null,
  };
}

function reconcileCustody({ record, owner, deposit, currentBlock, indexer }) {
  const ownerLower = normalizeAddress(owner);
  const currentOwner = normalizeAddress(record.current_owner);
  const previousOwner = normalizeAddress(record.previous_owner);
  const indexerMatches = currentOwner === MARKET_ADDRESS_LOWER && previousOwner === ownerLower;

  if (!indexer?.available) {
    return { verified: false, status: 'indexer_unavailable', reason: 'Official indexer status is unavailable.' };
  }
  if (!indexer.healthy) {
    return { verified: false, status: 'indexer_lagging', reason: `Official indexer is ${indexer.blocksBehind} blocks behind.` };
  }
  if (!indexerMatches) {
    return { verified: false, status: 'indexer_mismatch', reason: 'Official ownership does not match the market and depositor.' };
  }

  const directCreation = normalizeAddress(record.initial_owner) === MARKET_ADDRESS_LOWER
    && normalizeAddress(record.creator) === ownerLower;
  if (directCreation && !deposit?.active) {
    const creationBlock = Number(record.block_number);
    if (!Number.isFinite(creationBlock)) {
      return { verified: false, status: 'creation_block_unavailable', reason: 'The direct creation block is unavailable.' };
    }
    const confirmations = Math.max(0, currentBlock - creationBlock);
    const cooldownRemaining = Math.max(0, TRANSFER_COOLDOWN_BLOCKS - confirmations);
    if (cooldownRemaining > 0) {
      return {
        verified: false,
        status: 'cooldown',
        reason: `${cooldownRemaining} confirmation block${cooldownRemaining === 1 ? '' : 's'} remaining.`,
        custodyKind: 'direct_creation',
        confirmations,
        cooldownRemaining,
        receivedBlock: creationBlock,
        nonce: null,
        active: false,
      };
    }
    return {
      verified: true,
      status: 'verified_direct_creation',
      reason: 'Official creation and ownership place this artifact directly in market custody.',
      custodyKind: 'direct_creation',
      confirmations,
      cooldownRemaining: 0,
      receivedBlock: creationBlock,
      nonce: null,
      active: false,
    };
  }
  if (!deposit) {
    return { verified: false, status: 'contract_unavailable', reason: 'Contract deposit state could not be read.' };
  }
  if (!deposit.active) {
    return { verified: false, status: 'contract_inactive', reason: 'The contract deposit record is not active.' };
  }

  const confirmations = Math.max(0, currentBlock - deposit.receivedBlock);
  const cooldownRemaining = Math.max(0, TRANSFER_COOLDOWN_BLOCKS - confirmations);
  if (cooldownRemaining > 0) {
    return {
      verified: false,
      status: 'cooldown',
      reason: `${cooldownRemaining} confirmation block${cooldownRemaining === 1 ? '' : 's'} remaining.`,
      confirmations,
      cooldownRemaining,
      ...deposit,
    };
  }

  return {
    verified: true,
    status: 'verified',
    reason: 'Official ownership and active contract custody agree.',
    custodyKind: 'registered_deposit',
    confirmations,
    cooldownRemaining: 0,
    ...deposit,
  };
}

async function getWalletInventory(owner, options = {}) {
  if (!isAddress(owner)) throw new Error('Invalid owner address');
  const normalizedOwner = owner.toLowerCase();
  const directParameters = {
    current_owner: normalizedOwner,
    max_results: MAX_INVENTORY_RESULTS,
    sort_by: 'newest_first',
  };
  const escrowParameters = {
    current_owner: MARKET_ADDRESS_LOWER,
    previous_owner: normalizedOwner,
    include_latest_transfer: true,
    max_results: MAX_INVENTORY_RESULTS,
    sort_by: 'newest_first',
  };
  if (options.directPageKey) directParameters.page_key = options.directPageKey;
  if (options.escrowPageKey) escrowParameters.page_key = options.escrowPageKey;

  const [direct, escrowCandidates, market] = await Promise.all([
    fetchIndexerList(directParameters),
    fetchIndexerList(escrowParameters),
    getMarketStatus(),
  ]);

  const depositRequests = escrowCandidates.records.map((record) => ({
    method: 'eth_call',
    params: [{
      to: MARKET_ADDRESS,
      data: encodePotentialDepositCall(normalizedOwner, record.transaction_hash),
    }, 'latest'],
  }));
  const listingRequests = escrowCandidates.records.map((record) => ({
    method: 'eth_call',
    params: [{
      to: MARKET_ADDRESS,
      data: encodeListingCall(normalizedOwner, record.transaction_hash),
    }, 'latest'],
  }));
  const claimableRequests = [{
    method: 'eth_call',
    params: [{ to: MARKET_ADDRESS, data: encodeClaimableCall(normalizedOwner) }, 'latest'],
  }];
  const [depositResponses, listingResponses, claimableResponses] = await Promise.all([
    depositRequests.length > 0 ? rpcBatch(depositRequests) : [],
    listingRequests.length > 0 ? rpcBatch(listingRequests) : [],
    rpcBatch(claimableRequests),
  ]);

  const escrow = escrowCandidates.records.map((record, index) => {
    let deposit = null;
    let listing = null;
    const response = depositResponses[index];
    if (response && !response.error && typeof response.result === 'string') {
      try {
        deposit = decodePotentialDeposit(response.result);
      } catch {
        deposit = null;
      }
    }
    const listingResponse = listingResponses[index];
    if (listingResponse && !listingResponse.error && typeof listingResponse.result === 'string') {
      try {
        listing = decodeListing(listingResponse.result);
      } catch {
        listing = null;
      }
    }

    return {
      ...publicEthscriptionRecord(record),
      listing,
      custody: reconcileCustody({
        record,
        owner: normalizedOwner,
        deposit,
        currentBlock: market.blockNumber,
        indexer: market.indexer,
      }),
    };
  });

  let claimableWei = null;
  const claimableResponse = claimableResponses[0];
  if (claimableResponse && !claimableResponse.error && typeof claimableResponse.result === 'string') {
    try {
      claimableWei = decodeUint(claimableResponse.result).toString();
    } catch {
      claimableWei = null;
    }
  }

  return {
    owner: normalizedOwner,
    market,
    directlyOwned: direct.records.map(publicEthscriptionRecord),
    escrow,
    claimableWei,
    pagination: {
      directlyOwnedHasMore: direct.pagination.hasMore,
      directlyOwnedNextPageKey: direct.pagination.pageKey,
      escrowHasMore: escrowCandidates.pagination.hasMore,
      escrowNextPageKey: escrowCandidates.pagination.pageKey,
      maximumResultsPerSection: MAX_INVENTORY_RESULTS,
    },
    checkedAt: new Date().toISOString(),
  };
}

function jsonResponse(statusCode, body, cacheControl = 'no-store') {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

module.exports = {
  INDEXER_MAX_BLOCK_LAG,
  MAINNET_CHAIN_ID,
  MARKET_ADDRESS,
  SELECTORS,
  TRANSFER_COOLDOWN_BLOCKS,
  decodePotentialDeposit,
  decodeListing,
  encodeClaimableCall,
  encodeListingCall,
  encodePotentialDepositCall,
  getMarketStatus,
  getWalletInventory,
  isAddress,
  isEthscriptionId,
  jsonResponse,
  marketCapabilities,
  reconcileCustody,
  reconcileIndexerStatus,
};
