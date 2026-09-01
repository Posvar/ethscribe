const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MARKET_ADDRESS,
  decodeListing,
  decodePotentialDeposit,
  encodeClaimableCall,
  encodeListingCall,
  encodePotentialDepositCall,
  isAddress,
  marketCapabilities,
  reconcileCustody,
  reconcileIndexerStatus,
} = require('./market');

const OWNER = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';
const ID = `0x${'ab'.repeat(32)}`;

function word(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

test('validates and ABI-encodes only exact addresses and Ethscription IDs', () => {
  assert.equal(isAddress(OWNER), true);
  assert.equal(isAddress('0x1234'), false);
  const calldata = encodePotentialDepositCall(OWNER, ID);
  assert.equal(calldata.slice(0, 10), '0x61f9df78');
  assert.equal(calldata.length, 2 + 8 + 64 + 64);
  assert.equal(calldata.slice(-64), ID.slice(2));
});

test('decodes the public PotentialDeposit tuple', () => {
  const decoded = decodePotentialDeposit(`0x${word(25_873_370)}${word(7)}${word(1)}`);
  assert.deepEqual(decoded, { receivedBlock: 25_873_370, nonce: '7', active: true });
});

test('encodes and decodes seller listing state and claimable proceeds', () => {
  assert.equal(encodeListingCall(OWNER, ID).slice(0, 10), '0xaa3a6b36');
  assert.equal(encodeClaimableCall(OWNER).slice(0, 10), '0x402914f5');
  const onlyBuyer = '0000000000000000000000000000000000000001'.padStart(64, '0');
  const feeRecipient = OWNER.slice(2).toLowerCase().padStart(64, '0');
  const contextHash = 'cd'.repeat(32);
  const listing = decodeListing(`0x${word(1_500_000_000_000_000_000n)}${word(2)}${word(3)}${word(0)}${onlyBuyer}${feeRecipient}${contextHash}`);
  assert.equal(listing.active, true);
  assert.equal(listing.expired, false);
  assert.equal(listing.priceWei, '1500000000000000000');
  assert.equal(listing.depositNonce, '2');
  assert.equal(listing.listingNonce, '3');
  assert.equal(listing.feeRecipient, OWNER.toLowerCase());
  assert.equal(listing.contextHash, `0x${contextHash}`);
});

test('verifies custody only when indexer and active contract state agree after cooldown', () => {
  const record = {
    current_owner: MARKET_ADDRESS,
    previous_owner: OWNER,
  };
  const verified = reconcileCustody({
    record,
    owner: OWNER,
    deposit: { receivedBlock: 100, nonce: '1', active: true },
    currentBlock: 105,
    indexer: { available: true, healthy: true, blocksBehind: 0 },
  });
  assert.equal(verified.status, 'verified');
  assert.equal(verified.verified, true);

  const inactive = reconcileCustody({
    record,
    owner: OWNER,
    deposit: { receivedBlock: 100, nonce: '1', active: false },
    currentBlock: 105,
    indexer: { available: true, healthy: true, blocksBehind: 0 },
  });
  assert.equal(inactive.status, 'contract_inactive');
  assert.equal(inactive.verified, false);
});

test('verifies a direct-to-market creation without inventing a deposit record', () => {
  const record = {
    transaction_hash: ID,
    block_number: '100',
    creator: OWNER,
    initial_owner: MARKET_ADDRESS,
    current_owner: MARKET_ADDRESS,
    previous_owner: OWNER,
  };
  const verified = reconcileCustody({
    record,
    owner: OWNER,
    deposit: { receivedBlock: 0, nonce: '0', active: false },
    currentBlock: 105,
    indexer: { available: true, healthy: true, blocksBehind: 0 },
  });
  assert.equal(verified.verified, true);
  assert.equal(verified.status, 'verified_direct_creation');
  assert.equal(verified.custodyKind, 'direct_creation');
  assert.equal(verified.receivedBlock, 100);

  const wrongCreator = reconcileCustody({
    record: { ...record, creator: '0x0000000000000000000000000000000000000001' },
    owner: OWNER,
    deposit: { receivedBlock: 0, nonce: '0', active: false },
    currentBlock: 105,
    indexer: { available: true, healthy: true, blocksBehind: 0 },
  });
  assert.equal(wrongCreator.verified, false);
  assert.equal(wrongCreator.status, 'contract_inactive');
});

test('fails closed for indexer lag, ownership mismatch, and cooldown', () => {
  const record = { current_owner: MARKET_ADDRESS, previous_owner: OWNER };
  const deposit = { receivedBlock: 100, nonce: '1', active: true };

  assert.equal(reconcileCustody({
    record,
    owner: OWNER,
    deposit,
    currentBlock: 105,
    indexer: { available: true, healthy: false, blocksBehind: 3 },
  }).status, 'indexer_lagging');

  assert.equal(reconcileCustody({
    record: { ...record, previous_owner: '0x0000000000000000000000000000000000000001' },
    owner: OWNER,
    deposit,
    currentBlock: 105,
    indexer: { available: true, healthy: true, blocksBehind: 0 },
  }).status, 'indexer_mismatch');

  assert.equal(reconcileCustody({
    record,
    owner: OWNER,
    deposit,
    currentBlock: 103,
    indexer: { available: true, healthy: true, blocksBehind: 0 },
  }).status, 'cooldown');
});

test('checks indexer freshness against the independently read RPC block', () => {
  const stale = reconcileIndexerStatus({
    available: true,
    healthy: true,
    blocksBehind: 0,
    lastImportedBlock: 100,
  }, 105);
  assert.equal(stale.reportedBlocksBehind, 0);
  assert.equal(stale.rpcBlocksBehind, 5);
  assert.equal(stale.blocksBehind, 5);
  assert.equal(stale.healthy, false);

  const current = reconcileIndexerStatus({
    available: true,
    healthy: true,
    blocksBehind: 0,
    lastImportedBlock: 104,
  }, 105);
  assert.equal(current.healthy, true);
});

test('keeps intake and exits behind an explicit operational transaction gate', () => {
  const locked = marketCapabilities({
    deployed: true,
    chainId: 1,
    paused: false,
    indexerHealthy: true,
    transactionsEnabled: false,
  });
  assert.deepEqual(locked, {
    transactionsEnabled: false,
    intakeEnabled: false,
    exitsEnabled: false,
  });

  const paused = marketCapabilities({
    deployed: true,
    chainId: 1,
    paused: true,
    indexerHealthy: true,
    transactionsEnabled: true,
  });
  assert.equal(paused.intakeEnabled, false);
  assert.equal(paused.exitsEnabled, true);

  const active = marketCapabilities({
    deployed: true,
    chainId: 1,
    paused: false,
    indexerHealthy: true,
    transactionsEnabled: true,
  });
  assert.equal(active.intakeEnabled, true);
  assert.equal(active.exitsEnabled, true);
});
