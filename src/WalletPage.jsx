import { useCallback, useEffect, useRef, useState } from 'react';
import XpmPreview from './XpmPreview';
import { artifactRecordHref, catalogueArtifacts, expeditionArtifactById, getExpedition } from './expeditionRegistry';
import { fetchMarketStatus, fetchWalletInventory } from './marketApi';
import {
  MAINNET_CHAIN_ID,
  MARKET_ADDRESS,
} from './marketConfig';
import {
  buildCancelListingTransaction,
  buildClaimTransaction,
  buildCreateListingTransaction,
  buildDepositTransaction,
  buildWithdrawTransaction,
  friendlyTransactionError,
  hasDepositSelectorCollision,
  parseEthPriceToWei,
  reconciliationTimedOut,
  simulateAndSendTransaction,
  waitForTransactionReceipt,
} from './marketTransactions';

const catalogueAssignments = new Map(catalogueArtifacts
  .filter((artifact) => artifact.status === 'secured' && artifact.ethscriptionId)
  .map((artifact) => [artifact.ethscriptionId.toLowerCase(), {
    expeditionId: artifact.expeditionId,
    targetId: artifact.id,
    ethscriptionId: artifact.ethscriptionId,
  }]));

// Optional display context for additional recognized collections. It must never
// grant custody, trading permissions, or replace a published catalogue entry.
function supplementalAssignment(record, extraCatalogue, extraExpeditions) {
  const id = record.transactionHash?.toLowerCase();
  const artifact = extraCatalogue.find(item => item.ethscriptionId?.toLowerCase() === id);
  if (!artifact || expeditionArtifactById(artifact.expeditionId, artifact.id)) return null;
  const expedition = getExpedition(artifact.expeditionId)
    || extraExpeditions.find(item => item.id === artifact.expeditionId);
  if (!expedition || !/^\/expeditions\/[a-z0-9-]+$/.test(expedition.path || '')) return null;
  const normalizeHash = value => typeof value === 'string' ? value.replace(/^0x/i, '').toLowerCase() : '';
  const expected = normalizeHash(artifact.protocolContentSha256);
  if (!/^[a-f0-9]{64}$/.test(expected) || normalizeHash(record.contentSha) !== expected) return null;
  return { expeditionId: artifact.expeditionId, targetId: artifact.id, ethscriptionId: artifact.ethscriptionId };
}

function ArrowIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 4l5 5-5 5" /></svg>;
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(timestamp * 1000));
}

function formatWeiAsEth(value) {
  try {
    const wei = BigInt(value || 0);
    const whole = wei / 10n ** 18n;
    const fullFraction = (wei % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '');
    const fraction = fullFraction;
    return fraction ? `${whole}.${fraction}` : whole.toString();
  } catch {
    return '—';
  }
}

function TransactionStatus({ transaction, onDismiss, countdown = 0 }) {
  if (!transaction) return null;
  const action = {
    register: 'Market registration',
    listing: 'Listing',
    'cancel-listing': 'Listing cancellation',
    withdraw: 'Withdrawal',
    claim: 'Marketplace balance claim',
  }[transaction.type] || 'Transaction';
  const completeMessage = {
    register: 'Market registration confirmed. This Ethscription can now be priced for sale.',
    listing: 'Listing confirmed at the selected ETH price.',
    'cancel-listing': 'Listing cancelled. The artifact remains in marketplace custody.',
    withdraw: 'Withdrawal verified. The official indexer reports the artifact back in this wallet.',
    claim: 'Marketplace balance claimed to this wallet.',
  }[transaction.type];
  const copy = {
    simulating: 'Simulating against Ethereum mainnet. Your wallet opens only if the transaction is expected to succeed.',
    mining: 'Transaction submitted. Waiting for an Ethereum receipt.',
    reconciling: transaction.message || 'Ethereum confirmed the transaction. Waiting for the official indexer and contract record to agree.',
    complete: completeMessage,
    error: transaction.message || 'The transaction could not be completed.',
  };

  return (
    <div className={`wallet-transaction-status transaction-${transaction.phase}`} role="status">
      <div><span>{action.toUpperCase()} · {transaction.phase.toUpperCase()}</span><strong>{copy[transaction.phase]}</strong></div>
      {transaction.hash && <a href={`https://etherscan.io/tx/${transaction.hash}`} target="_blank" rel="noreferrer">View transaction</a>}
      {transaction.phase === 'reconciling' && <small>NEXT AUTOMATIC CHECK IN {String(countdown || 0).padStart(2, '0')}S</small>}
      {(transaction.phase === 'complete' || transaction.phase === 'error') && <button type="button" onClick={onDismiss}>DISMISS</button>}
    </div>
  );
}

function TextAssetPreview({ source, label }) {
  const [preview, setPreview] = useState({ state: 'loading', text: '' });

  useEffect(() => {
    const controller = new AbortController();
    setPreview({ state: 'loading', text: '' });

    fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Text preview returned ${response.status}`);
        return response.text();
      })
      .then((text) => { if (!controller.signal.aborted) setPreview({ state: 'ready', text }); })
      .catch((previewError) => {
        if (previewError.name !== 'AbortError') setPreview({ state: 'error', text: '' });
      });

    return () => controller.abort();
  }, [source]);

  if (preview.state !== 'ready') {
    return <div className="wallet-asset-fallback"><span>{preview.state === 'error' ? 'TEXT PREVIEW UNAVAILABLE' : 'LOADING TEXT…'}</span></div>;
  }

  return <pre className="wallet-asset-text" aria-label={`${label} text preview`}>{preview.text}</pre>;
}

function AssetPreview({ record }) {
  const source = record.transactionHash ? `/api/ethscriptions/media/${record.transactionHash}` : '';
  const [failedSource, setFailedSource] = useState('');
  const mimetype = (record.mimetype || '').toLowerCase();
  const mediaType = mimetype.split(';')[0].trim();
  const label = `Ethscription #${record.ethscriptionNumber ?? ''}`.trim();

  if (!source || failedSource === source) {
    return <div className="wallet-asset-fallback"><span>PREVIEW UNAVAILABLE</span><strong>{record.mimetype || 'UNKNOWN MEDIA'}</strong></div>;
  }
  if (['image/x-xpixmap', 'image/x-xpm', 'image/xpm', 'text/x-xpm'].includes(mediaType)) {
    return <XpmPreview source={source} label={`${label} XPM preview`} className="wallet-asset-xpm" />;
  }
  if (mediaType.startsWith('image/')) {
    return <img src={source} alt={`${label} preview`} loading="lazy" onError={() => setFailedSource(source)} />;
  }
  if (mediaType === 'text/html' || mediaType === 'application/xhtml+xml') {
    return <iframe src={source} title={`${label} HTML preview`} loading="lazy" sandbox="" referrerPolicy="no-referrer" />;
  }
  if (mediaType === 'text/plain') {
    return <TextAssetPreview source={source} label={label} />;
  }
  if (mediaType.startsWith('audio/')) {
    return <div className="wallet-asset-audio"><span>AUDIO ETHSCRIPTION</span><audio controls preload="none" src={source}>Your browser cannot play this audio Ethscription.</audio></div>;
  }
  if (mediaType.startsWith('video/')) {
    return <video controls preload="metadata" src={source}>Your browser cannot play this video Ethscription.</video>;
  }
  return <div className="wallet-asset-fallback"><span>DIGITAL ARTIFACT</span><strong>{record.mimetype || 'UNKNOWN MEDIA'}</strong></div>;
}

function MarketplaceControls({ record, registerAction, listingAction, cancelAction }) {
  const listing = record.listing;
  const registered = record.custody?.custodyKind === 'registered_deposit';
  const [price, setPrice] = useState(listing?.active ? formatWeiAsEth(listing.priceWei, 18) : '');
  const [priceError, setPriceError] = useState('');

  const prepareListing = () => {
    try {
      parseEthPriceToWei(price);
      setPriceError('');
      listingAction.onClick(price);
    } catch (listingError) {
      setPriceError(listingError.message);
    }
  };

  if (!registered) {
    return (
      <div className="wallet-market-actions">
        <div><span>MARKETPLACE</span><strong>REGISTRATION REQUIRED</strong></div>
        <p>This Ethscription was created directly in the vault. Its transaction hash—and therefore its Ethscription ID—did not exist until creation was mined. One registration transaction links that new ID to your market record before it can be priced.</p>
        <button type="button" disabled={registerAction.disabled} onClick={registerAction.onClick}>{registerAction.label} <ArrowIcon /></button>
        <small>{registerAction.hint}</small>
      </div>
    );
  }

  return (
    <div className="wallet-market-actions">
      <div><span>MARKETPLACE</span><strong>{listing?.active ? `${formatWeiAsEth(listing.priceWei)} ETH` : 'NOT LISTED'}</strong></div>
      <label>
        <span>PRICE IN ETH</span>
        <input type="text" inputMode="decimal" value={price} onChange={(event) => { setPrice(event.target.value); setPriceError(''); }} placeholder="0.10" />
      </label>
      {priceError && <small className="wallet-price-error">{priceError}</small>}
      <div className="wallet-market-buttons">
        <button type="button" disabled={listingAction.disabled || !price} onClick={prepareListing}>{listing?.active ? 'UPDATE PRICE' : 'LIST FOR SALE'} <ArrowIcon /></button>
        {listing?.active && <button className="secondary-market-action" type="button" disabled={cancelAction.disabled} onClick={cancelAction.onClick}>CANCEL LISTING</button>}
      </div>
      <small>{listingAction.hint}</small>
    </div>
  );
}

function InventoryCard({ record, assignment = undefined, assignmentState = 'ready', action = null, marketControls = null, extraCatalogue = [], extraExpeditions = [], tradingRestricted = false }) {
  const assignedArtifact = assignment ? expeditionArtifactById(assignment.expeditionId || 'lost-pixels-of-satoshi', assignment.targetId)
    || extraCatalogue.find(item => item.expeditionId === assignment.expeditionId && item.id === assignment.targetId) : null;
  const assignedExpedition = assignedArtifact ? getExpedition(assignedArtifact.expeditionId)
    || extraExpeditions.find(item => item.id === assignedArtifact.expeditionId) : null;
  const assignmentHref = assignedArtifact && assignedExpedition
    ? artifactRecordHref(assignedExpedition.id, assignedArtifact.id)
      || (/^\/expeditions\/[a-z0-9-]+$/.test(assignedExpedition.path || '')
        ? `${assignedExpedition.path}?artifact=${encodeURIComponent(assignedArtifact.id)}#record-${encodeURIComponent(assignedArtifact.id)}` : null)
    : null;
  const assignmentAvailable = assignmentState === 'ready';

  return (
    <article className="wallet-inventory-card">
      <div className="wallet-asset-preview"><AssetPreview record={record} /></div>
      <div className="wallet-card-heading">
        <p>{record.mimetype || 'UNKNOWN MEDIA'}</p>
      </div>
      <h3>Ethscription #{record.ethscriptionNumber ?? '—'}</h3>
      <dl>
        <div><dt>ETHSCRIPTION ID</dt><dd><a href={`https://ethscriptions.com/ethscriptions/${record.transactionHash}`} target="_blank" rel="noreferrer">{shortAddress(record.transactionHash)}</a></dd></div>
        <div><dt>ETHSCRIBED</dt><dd>{formatDate(record.blockTimestamp)}</dd></div>
      </dl>
      {assignment !== undefined && (
        <div className={`wallet-expedition-assignment${assignment ? ' assignment-linked' : assignmentAvailable ? ' assignment-unassigned' : ''}`}>
          <span>EXPEDITION ASSIGNMENT</span>
          {assignedArtifact && assignedExpedition && assignmentHref ? (
            <a href={assignmentHref}>
              <strong>EXPEDITION {assignedExpedition.number} · {assignedExpedition.title.toUpperCase()}</strong>
              <small>{[assignedArtifact.name, assignedArtifact.filename].filter(Boolean).join(' · ') || assignment.targetId}</small>
            </a>
          ) : assignmentAvailable ? (
            <><strong>UNASSIGNED CONTRACT DEPOSIT</strong><small>No verified Finding links this Ethscription to an expedition target.</small></>
          ) : (
            <><strong>{assignmentState === 'error' ? 'ASSIGNMENT INDEX UNAVAILABLE' : 'CHECKING ASSIGNMENT'}</strong><small>{assignmentState === 'error' ? 'Custody is unchanged. Refresh later to restore the verified Finding link.' : 'Checking the public Finding record.'}</small></>
          )}
        </div>
      )}
      {tradingRestricted && <div className="wallet-expedition-assignment"><strong>PRESERVATION ARCHIVE · NOT FOR TRADING</strong><small>This Ethscription is an archival record, outside the tradable collection. It cannot be listed here. Any verified custody can still be withdrawn to its rightful depositing wallet.</small></div>}
      {marketControls}
      {action && (
        <div className="wallet-custody-action">
          <button type="button" disabled={action.disabled} onClick={action.onClick}>{action.label} <ArrowIcon /></button>
          <small>{action.hint}</small>
        </div>
      )}
    </article>
  );
}

export default function WalletPage({
  account,
  chainId,
  connectWallet,
  switchToMainnet,
  provider,
  resolvedFindings = [],
  findingIndexState = 'ready',
  extraCatalogue = [],
  extraExpeditions = [],
  nonTradingEthscriptionIds = [],
  header,
  footer,
}) {
  const [status, setStatus] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [inventoryView, setInventoryView] = useState('escrow');
  const [pageKeys, setPageKeys] = useState({ directPageKey: '', escrowPageKey: '' });
  const [pageHistory, setPageHistory] = useState({ direct: [], escrow: [] });
  const [autoRefreshIn, setAutoRefreshIn] = useState(0);
  const [reconcileRefreshIn, setReconcileRefreshIn] = useState(0);
  const previousAccount = useRef(account);
  const refreshSequence = useRef(0);
  const currentSelection = useRef('');
  const selectionKey = `${account?.toLowerCase() || ''}:${pageKeys.directPageKey}:${pageKeys.escrowPageKey}`;
  currentSelection.current = selectionKey;
  const hasPendingCustody = Boolean(inventory?.escrow?.some((record) => !record.custody?.verified));

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    // Late responses from a previous account/page must never restore its assets
    // or its claimable balance in the currently connected wallet.
    const requestSequence = ++refreshSequence.current;
    const isCurrent = () => requestSequence === refreshSequence.current && currentSelection.current === selectionKey;
    if (!quiet) {
      setLoading(true);
      setError('');
    }

    try {
      if (account) {
        const nextInventory = await fetchWalletInventory(account, pageKeys);
        if (!isCurrent()) return null;
        if (nextInventory.owner?.toLowerCase() !== account.toLowerCase()) throw new Error('Wallet inventory owner mismatch.');
        setInventory(nextInventory);
        setStatus(nextInventory.market);
        setError('');
        return nextInventory;
      } else {
        const nextStatus = await fetchMarketStatus();
        if (!isCurrent()) return null;
        setStatus(nextStatus);
        setInventory(null);
        setError('');
        return { market: nextStatus, directlyOwned: [], escrow: [] };
      }
    } catch {
      if (isCurrent()) {
        setError('Live wallet data is temporarily unavailable. Any visible assets are from the last successful check. Marketplace actions will resume when the next check succeeds.');
      }
      return null;
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [account, pageKeys, selectionKey]);

  useEffect(() => {
    if (previousAccount.current === account) return;
    previousAccount.current = account;
    setInventory(null);
    setStatus(null);
    setPageKeys({ directPageKey: '', escrowPageKey: '' });
    setPageHistory({ direct: [], escrow: [] });
    setInventoryView('escrow');
  }, [account]);

  useEffect(() => {
    setConfirmation(null);
  }, [account, chainId]);

  useEffect(() => {
    refresh();
    return () => { refreshSequence.current += 1; };
  }, [refresh]);

  useEffect(() => {
    if (!account || transaction?.phase === 'reconciling') {
      setAutoRefreshIn(0);
      return undefined;
    }
    const intervalSeconds = hasPendingCustody ? 8 : 20;
    setAutoRefreshIn(intervalSeconds);
    const countdownTimer = setInterval(() => setAutoRefreshIn((current) => current <= 1 ? intervalSeconds : current - 1), 1_000);
    const refreshTimer = setInterval(() => refresh({ quiet: true }), intervalSeconds * 1_000);
    return () => {
      clearInterval(countdownTimer);
      clearInterval(refreshTimer);
    };
  }, [account, hasPendingCustody, refresh, transaction?.phase]);

  useEffect(() => {
    if (transaction?.phase !== 'reconciling') {
      setReconcileRefreshIn(0);
      return undefined;
    }
    setReconcileRefreshIn(12);
    const timer = setInterval(() => setReconcileRefreshIn((current) => current <= 1 ? 12 : current - 1), 1_000);
    return () => clearInterval(timer);
  }, [transaction?.message, transaction?.phase]);

  useEffect(() => {
    if (!account || transaction?.phase !== 'reconciling') return undefined;
    let stopped = false;
    let timer;

    const reconcile = async () => {
      if (account.toLowerCase() !== transaction.account?.toLowerCase()) {
        setTransaction((current) => current?.id === transaction.id ? {
          ...current,
          phase: 'error',
          message: 'Reconnect the wallet that submitted this transaction, then refresh. Do not resubmit while the transaction is already confirmed.',
        } : current);
        return;
      }
      if (reconciliationTimedOut(transaction.reconcileStartedAt)) {
        setTransaction((current) => current?.id === transaction.id ? {
          ...current,
          phase: 'error',
          message: 'The transaction confirmed, but indexer reconciliation is taking longer than expected. Refresh later; do not resubmit the confirmed transaction.',
        } : current);
        return;
      }

      const nextInventory = await refresh({ quiet: true });
      if (stopped) return;
      if (!nextInventory) {
        setTransaction((current) => current?.id === transaction.id ? {
          ...current,
          message: 'The transaction confirmed. Retrying the independent contract and indexer custody checks.',
        } : current);
        timer = setTimeout(reconcile, 12_000);
        return;
      }
      const targetId = transaction.id.toLowerCase();
      const directMatch = nextInventory.directlyOwned.find(
        (record) => record.transactionHash?.toLowerCase() === targetId,
      );
      const escrowMatch = nextInventory.escrow.find(
        (record) => record.transactionHash?.toLowerCase() === targetId,
      );

      if (transaction.type === 'register' && escrowMatch?.custody?.verified
        && escrowMatch.custody.custodyKind === 'registered_deposit') {
        setTransaction((current) => current?.id === transaction.id ? { ...current, phase: 'complete', message: '' } : current);
        return;
      }
      if (transaction.type === 'listing' && escrowMatch?.listing?.active
        && escrowMatch.listing.priceWei === transaction.expectedPriceWei) {
        setTransaction((current) => current?.id === transaction.id ? { ...current, phase: 'complete', message: '' } : current);
        return;
      }
      if (transaction.type === 'cancel-listing' && escrowMatch?.listing && !escrowMatch.listing.active) {
        setTransaction((current) => current?.id === transaction.id ? { ...current, phase: 'complete', message: '' } : current);
        return;
      }
      if (transaction.type === 'withdraw' && directMatch && !escrowMatch) {
        setTransaction((current) => current?.id === transaction.id ? { ...current, phase: 'complete', message: '' } : current);
        return;
      }

      const message = {
        register: escrowMatch?.custody?.reason || 'Waiting for trading registration and the custody cooldown to reconcile.',
        listing: 'Waiting for the contract to return the new listing terms.',
        'cancel-listing': 'Waiting for the contract to report the listing as cancelled.',
        withdraw: 'Waiting for the official indexer to report this wallet as current owner.',
      }[transaction.type] || 'Waiting for the market state to reconcile.';
      setTransaction((current) => current?.id === transaction.id ? { ...current, message } : current);
      timer = setTimeout(reconcile, 12_000);
    };

    reconcile();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [account, refresh, transaction?.account, transaction?.expectedPriceWei, transaction?.id, transaction?.phase, transaction?.reconcileStartedAt, transaction?.type]);

  const market = inventory?.market || status;
  const onMainnet = chainId?.toLowerCase() === MAINNET_CHAIN_ID;
  const isFeeRecipient = Boolean(
    account
    && market?.feeRecipient
    && account.toLowerCase() === market.feeRecipient.toLowerCase(),
  );
  const direct = inventory?.directlyOwned || [];
  const escrow = inventory?.escrow || [];
  const transactionBusy = transaction && !['complete', 'error'].includes(transaction.phase);
  const visibleRecords = inventoryView === 'escrow' ? escrow : direct;
  const visibleHistory = inventoryView === 'escrow' ? pageHistory.escrow : pageHistory.direct;
  const visibleHasMore = inventoryView === 'escrow'
    ? inventory?.pagination?.escrowHasMore
    : inventory?.pagination?.directlyOwnedHasMore;
  const visibleNextPageKey = inventoryView === 'escrow'
    ? inventory?.pagination?.escrowNextPageKey
    : inventory?.pagination?.directlyOwnedNextPageKey;
  const tradingRestrictedForRecord = record => nonTradingEthscriptionIds.some(id =>
    typeof id === 'string' && id.toLowerCase() === record?.transactionHash?.toLowerCase());

  const findingForRecord = (record) => {
    const id = record.transactionHash?.toLowerCase();
    if (!id) return null;
    // Recognized catalogue IDs already identify their expedition target. A
    // later owner deposit does not need a new Finding to restore that link.
    return resolvedFindings.find((finding) => finding.ethscriptionId?.toLowerCase() === id
        && expeditionArtifactById(finding.expeditionId || 'lost-pixels-of-satoshi', finding.targetId))
      || catalogueAssignments.get(id)
      || supplementalAssignment(record, extraCatalogue, extraExpeditions)
      || null;
  };

  const showNextInventoryPage = () => {
    if (!visibleHasMore || !visibleNextPageKey) return;
    const pageKeyName = inventoryView === 'escrow' ? 'escrowPageKey' : 'directPageKey';
    const historyName = inventoryView === 'escrow' ? 'escrow' : 'direct';
    setPageHistory((current) => ({
      ...current,
      [historyName]: [...current[historyName], pageKeys[pageKeyName]],
    }));
    setPageKeys((current) => ({ ...current, [pageKeyName]: visibleNextPageKey }));
  };

  const showPreviousInventoryPage = () => {
    if (visibleHistory.length === 0) return;
    const pageKeyName = inventoryView === 'escrow' ? 'escrowPageKey' : 'directPageKey';
    const historyName = inventoryView === 'escrow' ? 'escrow' : 'direct';
    const previousPageKey = visibleHistory[visibleHistory.length - 1];
    setPageHistory((current) => ({ ...current, [historyName]: current[historyName].slice(0, -1) }));
    setPageKeys((current) => ({ ...current, [pageKeyName]: previousPageKey }));
  };

  const openConfirmation = (type, record = null, details = {}) => {
    setConfirmation({ type, record, account, ...details });
  };

  const executeConfirmedTransaction = async () => {
    if (!confirmation || !account || confirmation.account?.toLowerCase() !== account.toLowerCase() || error || loading) return;
    const { type, record, price } = confirmation;
    const id = record?.transactionHash || account;
    const expectedPriceWei = type === 'listing' ? parseEthPriceToWei(price).toString() : '';
    setConfirmation(null);
    setTransaction({ type, id, account, expectedPriceWei, phase: 'simulating', hash: '', message: '' });

    try {
      let request;
      if (['register', 'listing'].includes(type) && tradingRestrictedForRecord(record)) {
        throw new Error('This Ethscription belongs to the preservation archive and cannot be registered or listed for trading here. No transaction was sent.');
      }
      if (type === 'register') request = buildDepositTransaction(account, id);
      else if (type === 'withdraw') request = buildWithdrawTransaction(account, id, {
        directCreation: record.custody?.custodyKind === 'direct_creation',
      });
      else if (type === 'listing') request = buildCreateListingTransaction(account, id, price);
      else if (type === 'cancel-listing') request = buildCancelListingTransaction(account, id);
      else if (type === 'claim') request = buildClaimTransaction(account);
      else throw new Error('Unsupported marketplace action.');
      const hash = await simulateAndSendTransaction(provider, request);
      setTransaction({ type, id, account, expectedPriceWei, phase: 'mining', hash, message: '' });
      await waitForTransactionReceipt(provider, hash);
      setPageKeys({ directPageKey: '', escrowPageKey: '' });
      setPageHistory({ direct: [], escrow: [] });
      setInventoryView(type === 'withdraw' ? 'direct' : 'escrow');
      if (type === 'claim') {
        await refresh({ quiet: true });
        setTransaction({ type, id, account, phase: 'complete', hash, message: '' });
      } else {
        setTransaction({ type, id, account, expectedPriceWei, phase: 'reconciling', reconcileStartedAt: Date.now(), hash, message: '' });
      }
    } catch (transactionError) {
      setTransaction((current) => ({
        type,
        id,
        account,
        expectedPriceWei,
        phase: 'error',
        hash: current?.hash || '',
        message: friendlyTransactionError(transactionError),
      }));
    }
  };

  const withdrawAction = (record) => {
    if (market?.localPreview) return { disabled: true, label: 'READ-ONLY PREVIEW', hint: 'Live custody is shown here. Withdrawals are disabled in this local review.' };
    if (error || loading) return { disabled: true, label: 'CHECKING WALLET DATA', hint: 'Waiting for a successful live wallet check.' };
    if (transactionBusy) return { disabled: true, label: 'TRANSACTION IN PROGRESS', hint: 'Complete the active wallet operation first.' };
    if (!record.custody?.verified) {
      const indexerSyncing = ['indexer_lagging', 'indexer_unavailable'].includes(record.custody?.status);
      const cooldownRemaining = Number(record.custody?.cooldownRemaining || 0);
      return {
        disabled: true,
        label: cooldownRemaining > 0 ? `FINALIZING · ${cooldownRemaining} BLOCK${cooldownRemaining === 1 ? '' : 'S'}` : indexerSyncing ? 'SYNCING OWNERSHIP' : 'VERIFYING CUSTODY',
        hint: cooldownRemaining > 0
          ? `Ethereum requires ${cooldownRemaining} more confirmation block${cooldownRemaining === 1 ? '' : 's'}. Ethscribe checks again automatically.`
          : indexerSyncing
            ? 'Ownership is unchanged. Ethscribe checks the official ownership index again automatically.'
            : record.custody?.reason || 'Contract and indexer custody must agree first.',
      };
    }
    if (!onMainnet) return { disabled: true, label: 'SWITCH TO MAINNET', hint: 'Withdrawals use Ethereum mainnet.' };
    if (!market?.transactionsEnabled || !market?.exitsEnabled) return { disabled: true, label: 'WITHDRAW UI LOCKED', hint: 'The tested transaction interface has not been operationally enabled.' };
    return {
      disabled: false,
      label: 'WITHDRAW TO THIS WALLET',
      hint: 'Returns this Ethscription from the Ethscri.be market contract to your wallet.',
      onClick: () => openConfirmation('withdraw', record),
    };
  };

  const registerAction = (record) => {
    if (tradingRestrictedForRecord(record)) return { disabled: true, label: 'ARCHIVAL RECORD', hint: 'This preservation record is not available for trading.' };
    if (market?.localPreview) return { disabled: true, label: 'READ-ONLY PREVIEW', hint: 'Trading registration is disabled in this local review.' };
    if (error || loading) return { disabled: true, label: 'CHECKING WALLET DATA', hint: 'Waiting for a successful live wallet check.' };
    if (hasDepositSelectorCollision(record.transactionHash)) return { disabled: true, label: 'TRADING UNAVAILABLE', hint: 'This Ethscription ID conflicts with a reserved market action.' };
    if (transactionBusy) return { disabled: true, label: 'TRANSACTION IN PROGRESS', hint: 'Complete the active wallet operation first.' };
    if (!onMainnet) return { disabled: true, label: 'SWITCH TO MAINNET', hint: 'Trading registration uses Ethereum mainnet.' };
    if (!market?.intakeEnabled) return { disabled: true, label: 'REGISTRATION UNAVAILABLE', hint: 'Market intake or official ownership data is temporarily unavailable.' };
    return { disabled: false, label: 'REGISTER FOR SALE', hint: 'One-time step. After confirmation, Ethscribe waits for five Ethereum blocks and verifies official ownership automatically.', onClick: () => openConfirmation('register', record) };
  };

  const listingAction = (record) => {
    if (tradingRestrictedForRecord(record)) return { disabled: true, hint: 'This preservation record is not available for trading.', onClick: () => {} };
    if (market?.localPreview) return { disabled: true, hint: 'This is a live listing. Price changes are disabled in the local review.', onClick: () => {} };
    if (error || loading) return { disabled: true, hint: 'Waiting for a successful live wallet check.', onClick: () => {} };
    if (record.listing == null) return { disabled: true, hint: 'Listing state is temporarily unavailable. Refresh before setting a price.', onClick: () => {} };
    if (transactionBusy) return { disabled: true, hint: 'Complete the active wallet operation first.', onClick: () => {} };
    if (!onMainnet) return { disabled: true, hint: 'Listings use Ethereum mainnet.', onClick: () => switchToMainnet() };
    if (!market?.intakeEnabled) return { disabled: true, hint: 'New and updated listings are temporarily unavailable.', onClick: () => {} };
    return {
      disabled: false,
      hint: 'A sale sends 95% to your claimable balance and 5% to the Ethscribe treasury.',
      onClick: (price) => openConfirmation('listing', record, { price }),
    };
  };

  const cancelListingAction = (record) => {
    if (error || loading) return { disabled: true, onClick: () => {} };
    if (transactionBusy) return { disabled: true, onClick: () => {} };
    if (!onMainnet) return { disabled: true, onClick: () => switchToMainnet() };
    if (!market?.transactionsEnabled || !market?.exitsEnabled) return { disabled: true, onClick: () => {} };
    return { disabled: false, onClick: () => openConfirmation('cancel-listing', record) };
  };

  const claimableWei = inventory?.claimableWei;
  const claimableKnown = typeof claimableWei === 'string' && /^\d+$/.test(claimableWei);
  const hasClaimableCredit = claimableKnown && BigInt(claimableWei) > 0n;
  const formattedClaimableCredit = claimableKnown ? formatWeiAsEth(claimableWei, 6) : '—';
  const claimDisabled = Boolean(
    error || loading || transactionBusy
    || !claimableKnown
    || !hasClaimableCredit
    || (onMainnet && !market?.transactionsEnabled),
  );
  const claimButtonLabel = !claimableKnown
    ? loading ? 'CHECKING BALANCE…' : 'BALANCE UNAVAILABLE'
    : !hasClaimableCredit
      ? 'NOTHING TO CLAIM'
      : !onMainnet
        ? 'SWITCH TO MAINNET TO CLAIM'
        : !market?.transactionsEnabled
          ? 'CLAIM TEMPORARILY UNAVAILABLE'
          : `CLAIM ${formattedClaimableCredit} ETH`;

  const claimCredit = () => {
    if (!onMainnet) {
      switchToMainnet();
      return;
    }
    openConfirmation('claim');
  };

  return (
    <div className="wallet-page">
      {header}
      <main id="main-content" tabIndex={-1}>
        <section className="wallet-hero">
          <div>
            <p className="kicker"><span /> Researcher inventory</p>
            <h1>Field wallet.</h1>
            <p>View Ethscriptions in your wallet and manage artifacts held by the Ethscribe marketplace.</p>
          </div>
        </section>

        <section className="wallet-identity">
          {!account ? (
            <div className="wallet-empty-action"><p className="kicker"><span /> Wallet not connected</p><h2>Connect to inspect your artifacts.</h2><p>This read-only view requests no signature and sends no transaction.</p><button className="primary-action" type="button" onClick={connectWallet}>Connect wallet <ArrowIcon /></button></div>
          ) : (
            <>
              {!onMainnet && <div className="wallet-network-notice"><p>Marketplace actions use Ethereum mainnet.</p><button className="primary-action" type="button" onClick={switchToMainnet}>Switch to Ethereum <ArrowIcon /></button></div>}

              <TransactionStatus transaction={transaction} countdown={reconcileRefreshIn} onDismiss={() => setTransaction(null)} />
              {inventoryView === 'escrow' && hasPendingCustody && transaction?.phase !== 'reconciling' && (
                <div className="wallet-processing-notice" role="status"><div><span>FINALIZING MARKET UPDATE</span><strong>Ethereum or the official ownership index is still catching up.</strong></div><p>Ethscribe checks again automatically in {autoRefreshIn || 0}s. No action is required.</p></div>
              )}

              <div className="wallet-inventory-section">
                <div className="wallet-inventory-title">
                  <div><span>01</span><h2>Your Ethscriptions</h2></div>
                  <div className="wallet-inventory-summary"><strong>{loading ? '—' : `${visibleRecords.length}${visibleHasMore ? '+' : ''}`}</strong><button className="wallet-refresh" type="button" onClick={() => refresh()} disabled={loading}>{loading ? 'CHECKING…' : 'REFRESH'}</button></div>
                </div>
                {error && <p className="wallet-read-error" role="alert">{error}</p>}
                <div className={`wallet-proceeds${hasClaimableCredit ? ' has-credit' : ''}`} aria-label="Claimable marketplace credit">
                  <div>
                    <span>CLAIMABLE MARKETPLACE CREDIT</span>
                    <strong>{claimableKnown ? `${formattedClaimableCredit} ETH` : loading ? 'CHECKING…' : 'UNAVAILABLE'}</strong>
                    <small>{isFeeRecipient
                      ? 'Ethscribe marketplace fees and any sale proceeds accumulate here until you claim them.'
                      : 'Your sale proceeds accumulate here until you claim them.'}</small>
                  </div>
                  <button type="button" disabled={claimDisabled} onClick={claimCredit}>{claimButtonLabel} <ArrowIcon /></button>
                </div>
                <div className="wallet-inventory-tabs" role="tablist" aria-label="Ethscription location" onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === 'Home' ? 'escrow' : event.key === 'End' ? 'direct' : inventoryView === 'escrow' ? 'direct' : 'escrow';
                  setInventoryView(next);
                  document.getElementById(`wallet-tab-${next}`)?.focus();
                }}>
                  <button id="wallet-tab-escrow" type="button" role="tab" aria-controls="wallet-inventory-panel" tabIndex={inventoryView === 'escrow' ? 0 : -1} aria-selected={inventoryView === 'escrow'} className={inventoryView === 'escrow' ? 'active' : ''} onClick={() => setInventoryView('escrow')}>MARKETPLACE CUSTODY <span>{escrow.length}{inventory?.pagination?.escrowHasMore ? '+' : ''}</span></button>
                  <button id="wallet-tab-direct" type="button" role="tab" aria-controls="wallet-inventory-panel" tabIndex={inventoryView === 'direct' ? 0 : -1} aria-selected={inventoryView === 'direct'} className={inventoryView === 'direct' ? 'active' : ''} onClick={() => setInventoryView('direct')}>MY WALLET <span>{direct.length}{inventory?.pagination?.directlyOwnedHasMore ? '+' : ''}</span></button>
                </div>
                {!loading && visibleRecords.length === 0 && !error && <p className="wallet-empty-record">{inventoryView === 'escrow' ? 'No Ethscriptions from this wallet are currently verified in marketplace custody.' : 'The official indexer reports no Ethscriptions directly held by this address.'}</p>}
                <div className="wallet-inventory-grid" id="wallet-inventory-panel" role="tabpanel" aria-labelledby={`wallet-tab-${inventoryView}`} tabIndex={0}>{visibleRecords.map((record) => (
                  <InventoryCard
                    key={record.transactionHash}
                    record={record}
                    assignment={inventoryView === 'escrow' ? findingForRecord(record) : undefined}
                    assignmentState={findingIndexState}
                    extraCatalogue={extraCatalogue}
                    extraExpeditions={extraExpeditions}
                    tradingRestricted={tradingRestrictedForRecord(record)}
                    action={inventoryView === 'escrow' ? withdrawAction(record) : null}
                    marketControls={inventoryView === 'escrow' && record.custody?.verified ? (
                      tradingRestrictedForRecord(record) ? (
                        record.listing?.active ? <div className="wallet-market-actions"><button className="secondary-market-action" type="button" disabled={cancelListingAction(record).disabled} onClick={cancelListingAction(record).onClick}>CANCEL LISTING</button></div> : null
                      ) :
                      <MarketplaceControls
                        record={record}
                        registerAction={registerAction(record)}
                        listingAction={listingAction(record)}
                        cancelAction={cancelListingAction(record)}
                      />
                    ) : null}
                  />
                ))}</div>
                {(visibleHistory.length > 0 || visibleHasMore) && (
                  <div className="wallet-pagination" aria-label="Inventory pagination">
                    <button type="button" onClick={showPreviousInventoryPage} disabled={loading || visibleHistory.length === 0}>PREVIOUS</button>
                    <span>PAGE {visibleHistory.length + 1} · UP TO {inventory?.pagination?.maximumResultsPerSection || 50} ITEMS</span>
                    <button type="button" onClick={showNextInventoryPage} disabled={loading || !visibleHasMore || !visibleNextPageKey}>NEXT</button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

      </main>
      {footer}
      {confirmation && (
        <div className="wallet-confirmation-backdrop" role="presentation" onMouseDown={() => setConfirmation(null)}>
          <section className="wallet-confirmation" role="dialog" aria-modal="true" aria-labelledby="wallet-confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setConfirmation(null)} aria-label="Close">×</button>
            <p className="kicker"><span /> Marketplace action</p>
            <h2 id="wallet-confirmation-title">{{
              register: 'Register this Ethscription for sale?',
              listing: confirmation.record?.listing?.active ? 'Update this listing?' : 'List this Ethscription?',
              'cancel-listing': 'Cancel this listing?',
              withdraw: 'Withdraw this Ethscription?',
              claim: 'Claim your marketplace credit?',
            }[confirmation.type]}</h2>
            <p>{{
              register: 'This one-time transaction links the now-known Ethscription ID to your marketplace deposit. The artifact remains in custody; after verification, you can set its price separately.',
              listing: `Creates a public fixed-price listing for ${confirmation.price} ETH. A completed sale credits 95% to you and 5% to the Ethscribe treasury.`,
              'cancel-listing': 'Removes the fixed-price listing. The Ethscription remains safely in marketplace custody.',
              withdraw: confirmation.record?.listing?.active
                ? 'Returns this Ethscription to your wallet and automatically cancels its active listing.'
                : 'Returns this Ethscription from the market contract to your connected wallet.',
              claim: 'Transfers this wallet’s accumulated seller proceeds or marketplace fees to the connected wallet.',
            }[confirmation.type]}</p>
            <dl>
              {confirmation.record && <div><dt>ETHSCRIPTION</dt><dd><code>{confirmation.record.transactionHash}</code></dd></div>}
              {confirmation.type === 'listing' && <div><dt>FIXED PRICE</dt><dd>{confirmation.price} ETH</dd></div>}
              <div><dt>{confirmation.type === 'register' ? 'MARKET CONTRACT' : 'CONNECTED WALLET'}</dt><dd><code>{confirmation.type === 'register' ? MARKET_ADDRESS : account}</code></dd></div>
              <div><dt>ETH VALUE</dt><dd>0 ETH · GAS ONLY</dd></div>
            </dl>
            <button className="primary-action" type="button" onClick={executeConfirmedTransaction}>
              Simulate + open wallet <ArrowIcon />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
