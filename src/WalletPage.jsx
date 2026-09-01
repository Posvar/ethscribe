import { useCallback, useEffect, useRef, useState } from 'react';
import XpmPreview from './XpmPreview';
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

function formatWeiAsEth(value, maximumDecimals = 4) {
  try {
    const wei = BigInt(value || 0);
    const whole = wei / 10n ** 18n;
    const fraction = (wei % 10n ** 18n).toString().padStart(18, '0').slice(0, maximumDecimals).replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole.toString();
  } catch {
    return '—';
  }
}

function TransactionStatus({ transaction, onDismiss }) {
  if (!transaction) return null;
  const action = {
    deposit: 'Deposit',
    register: 'Trading registration',
    listing: 'Listing',
    'cancel-listing': 'Listing cancellation',
    withdraw: 'Withdrawal',
    claim: 'Marketplace balance claim',
  }[transaction.type] || 'Transaction';
  const completeMessage = {
    deposit: 'Custody verified. The official indexer and active contract deposit agree after the cooldown.',
    register: 'Trading enabled. Contract registration and verified custody now agree.',
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
      {(transaction.phase === 'complete' || transaction.phase === 'error') && <button type="button" onClick={onDismiss}>DISMISS</button>}
    </div>
  );
}

function TextAssetPreview({ source, label }) {
  const [preview, setPreview] = useState({ state: 'loading', text: '' });

  useEffect(() => {
    const controller = new AbortController();

    fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Text preview returned ${response.status}`);
        return response.text();
      })
      .then((text) => setPreview({ state: 'ready', text }))
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
  const mimetype = (record.mimetype || '').toLowerCase();
  const mediaType = mimetype.split(';')[0].trim();
  const label = `Ethscription #${record.ethscriptionNumber ?? ''}`.trim();

  if (!source) {
    return <div className="wallet-asset-fallback"><span>PREVIEW UNAVAILABLE</span><strong>{record.mimetype || 'UNKNOWN MEDIA'}</strong></div>;
  }
  if (['image/x-xpixmap', 'image/x-xpm', 'image/xpm', 'text/x-xpm'].includes(mediaType)) {
    return <XpmPreview source={source} label={`${label} XPM preview`} className="wallet-asset-xpm" />;
  }
  if (mediaType.startsWith('image/')) {
    return <img src={source} alt={`${label} preview`} loading="lazy" />;
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
        <div><span>MARKETPLACE</span><strong>NOT ENABLED FOR TRADING</strong></div>
        <p>This direct-to-vault artifact is safely held, but needs one registration transaction before it can be listed.</p>
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

function InventoryCard({ record, escrow = false, action = null, marketControls = null }) {
  const custody = record.custody;
  const indexerSyncing = ['indexer_lagging', 'indexer_unavailable'].includes(custody?.status);
  const custodyLabel = custody?.verified
    ? 'VERIFIED IN MARKET CUSTODY'
    : custody?.status === 'cooldown'
      ? 'CONFIRMING CUSTODY'
      : indexerSyncing
        ? 'INDEXER SYNCING'
        : 'CUSTODY CHECK PENDING';

  return (
    <article className="wallet-inventory-card">
      <div className="wallet-asset-preview"><AssetPreview record={record} /></div>
      <div className="wallet-card-heading">
        <p>{record.mimetype || 'UNKNOWN MEDIA'}</p>
        <span className={custody?.verified ? 'custody-verified' : 'custody-unverified'}>
          {escrow ? custodyLabel : 'IN MY WALLET'}
        </span>
      </div>
      <h3>Ethscription #{record.ethscriptionNumber ?? '—'}</h3>
      <dl>
        <div><dt>ETHSCRIPTION ID</dt><dd><a href={`https://ethscriptions.com/ethscriptions/${record.transactionHash}`} target="_blank" rel="noreferrer">{shortAddress(record.transactionHash)}</a></dd></div>
        <div><dt>ETHSCRIBED</dt><dd>{formatDate(record.blockTimestamp)}</dd></div>
      </dl>
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
  walletName,
  ensName,
  header,
  footer,
}) {
  const [status, setStatus] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [inventoryView, setInventoryView] = useState('escrow');
  const [pageKeys, setPageKeys] = useState({ directPageKey: '', escrowPageKey: '' });
  const [pageHistory, setPageHistory] = useState({ direct: [], escrow: [] });
  const [addressCopied, setAddressCopied] = useState(false);
  const previousAccount = useRef(account);
  const copyResetTimer = useRef(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) {
      setLoading(true);
      setError('');
    }

    try {
      if (account) {
        const nextInventory = await fetchWalletInventory(account, pageKeys);
        setInventory(nextInventory);
        setStatus(nextInventory.market);
        return nextInventory;
      } else {
        const nextStatus = await fetchMarketStatus();
        setStatus(nextStatus);
        setInventory(null);
        return { market: nextStatus, directlyOwned: [], escrow: [] };
      }
    } catch {
      if (!quiet) {
        setError('The live Ethereum or Ethscriptions read service is temporarily unavailable. No custody claim is being shown as verified.');
      }
      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [account, pageKeys]);

  useEffect(() => {
    if (previousAccount.current === account) return;
    previousAccount.current = account;
    setPageKeys({ directPageKey: '', escrowPageKey: '' });
    setPageHistory({ direct: [], escrow: [] });
    setInventoryView('escrow');
    setAddressCopied(false);
  }, [account]);

  useEffect(() => () => clearTimeout(copyResetTimer.current), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!account || loading || status?.indexer?.healthy !== false || transaction?.phase === 'reconciling') return undefined;
    const timer = setTimeout(() => refresh({ quiet: true }), 12_000);
    return () => clearTimeout(timer);
  }, [account, inventory?.checkedAt, loading, refresh, status?.checkedAt, status?.indexer?.healthy, transaction?.phase]);

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

      if (transaction.type === 'deposit' && escrowMatch?.custody?.verified) {
        setTransaction((current) => current?.id === transaction.id ? { ...current, phase: 'complete', message: '' } : current);
        return;
      }
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
        deposit: escrowMatch?.custody?.reason || 'Waiting for the official indexer to report the market as current owner.',
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

  const copyAddress = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
    } catch {
      const copyField = document.createElement('textarea');
      copyField.value = account;
      copyField.setAttribute('readonly', '');
      copyField.style.position = 'fixed';
      copyField.style.opacity = '0';
      document.body.appendChild(copyField);
      copyField.select();
      document.execCommand('copy');
      copyField.remove();
    }
    setAddressCopied(true);
    clearTimeout(copyResetTimer.current);
    copyResetTimer.current = setTimeout(() => setAddressCopied(false), 2_000);
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
    setRiskAccepted(false);
    setConfirmation({ type, record, ...details });
  };

  const executeConfirmedTransaction = async () => {
    if (!confirmation || !account) return;
    const { type, record, price } = confirmation;
    const id = record?.transactionHash || account;
    const expectedPriceWei = type === 'listing' ? parseEthPriceToWei(price).toString() : '';
    setConfirmation(null);
    setTransaction({ type, id, account, expectedPriceWei, phase: 'simulating', hash: '', message: '' });

    try {
      let request;
      if (type === 'deposit' || type === 'register') request = buildDepositTransaction(account, id);
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

  const depositAction = (record) => {
    if (hasDepositSelectorCollision(record.transactionHash)) {
      return { disabled: true, label: 'UNSUPPORTED ID', hint: 'This ID conflicts with a reserved market action and cannot use the standard deposit path.' };
    }
    if (transactionBusy) return { disabled: true, label: 'TRANSACTION IN PROGRESS', hint: 'Complete the active wallet operation first.' };
    if (!onMainnet) return { disabled: true, label: 'SWITCH TO MAINNET', hint: 'Marketplace transactions use Ethereum mainnet.' };
    if (!market?.transactionsEnabled) return { disabled: true, label: 'DEPOSIT TEST LOCKED', hint: 'The operational transaction gate remains closed.' };
    if (market?.paused) return { disabled: true, label: 'MARKET PAUSED', hint: 'The owner must deliberately open the controlled deposit window.' };
    if (!market?.intakeEnabled) return { disabled: true, label: 'DEPOSIT TEMPORARILY UNAVAILABLE', hint: 'Official ownership data is refreshing. Your Ethscription is unchanged; refresh before trying again.' };
    return { disabled: false, label: 'DEPOSIT FOR CUSTODY ONLY', hint: 'Does not submit this artifact to an expedition. Use Expedition preflight for a Finding.', onClick: () => openConfirmation('deposit', record) };
  };

  const withdrawAction = (record) => {
    if (transactionBusy) return { disabled: true, label: 'TRANSACTION IN PROGRESS', hint: 'Complete the active wallet operation first.' };
    if (!record.custody?.verified) {
      const indexerSyncing = ['indexer_lagging', 'indexer_unavailable'].includes(record.custody?.status);
      return {
        disabled: true,
        label: indexerSyncing ? 'INDEXER SYNCING' : 'WAITING FOR VERIFICATION',
        hint: indexerSyncing
          ? 'Ownership is unchanged. Withdrawal unlocks automatically when the official index catches up.'
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
    if (hasDepositSelectorCollision(record.transactionHash)) return { disabled: true, label: 'TRADING UNAVAILABLE', hint: 'This Ethscription ID conflicts with a reserved market action.' };
    if (transactionBusy) return { disabled: true, label: 'TRANSACTION IN PROGRESS', hint: 'Complete the active wallet operation first.' };
    if (!onMainnet) return { disabled: true, label: 'SWITCH TO MAINNET', hint: 'Trading registration uses Ethereum mainnet.' };
    if (!market?.intakeEnabled) return { disabled: true, label: 'ENABLE TRADING UNAVAILABLE', hint: 'Market intake or official ownership data is temporarily unavailable.' };
    return { disabled: false, label: 'ENABLE TRADING', hint: 'Registers this vault-held Ethscription with the market. It does not list the artifact yet.', onClick: () => openConfirmation('register', record) };
  };

  const listingAction = (record) => {
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
    transactionBusy
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
      <main>
        <section className="wallet-hero">
          <div>
            <p className="kicker"><span /> Researcher inventory</p>
            <h1>Field wallet.</h1>
            <p>View your Ethscriptions—deposit into or withdraw from the Ethscribe marketplace.</p>
          </div>
        </section>

        <section className="wallet-identity">
          {!account ? (
            <div className="wallet-empty-action"><p className="kicker"><span /> Wallet not connected</p><h2>Connect to inspect your artifacts.</h2><p>This read-only view requests no signature and sends no transaction.</p><button className="primary-action" type="button" onClick={connectWallet}>Connect wallet <ArrowIcon /></button></div>
          ) : (
            <>
              <div className="wallet-section-heading wallet-account-heading">
                <div>
                  <p className="kicker"><span /> Connected with {walletName || 'Ethereum wallet'}</p>
                  <h2>{ensName || shortAddress(account)}</h2>
                  <div className="wallet-address-line">
                    <a href={`https://etherscan.io/address/${account}`} target="_blank" rel="noreferrer">{shortAddress(account)}</a>
                    <button type="button" onClick={copyAddress}>{addressCopied ? 'COPIED' : 'COPY ADDRESS'}</button>
                  </div>
                </div>
                {!onMainnet && <button className="primary-action" type="button" onClick={switchToMainnet}>Switch to Ethereum <ArrowIcon /></button>}
              </div>

              <TransactionStatus transaction={transaction} onDismiss={() => setTransaction(null)} />

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
                    <small>Seller proceeds and marketplace fees accumulate here until this wallet claims them.</small>
                  </div>
                  <button type="button" disabled={claimDisabled} onClick={claimCredit}>{claimButtonLabel} <ArrowIcon /></button>
                </div>
                <div className="wallet-inventory-tabs" role="tablist" aria-label="Ethscription location">
                  <button type="button" role="tab" aria-selected={inventoryView === 'escrow'} className={inventoryView === 'escrow' ? 'active' : ''} onClick={() => setInventoryView('escrow')}>MARKETPLACE CUSTODY <span>{escrow.length}{inventory?.pagination?.escrowHasMore ? '+' : ''}</span></button>
                  <button type="button" role="tab" aria-selected={inventoryView === 'direct'} className={inventoryView === 'direct' ? 'active' : ''} onClick={() => setInventoryView('direct')}>MY WALLET <span>{direct.length}{inventory?.pagination?.directlyOwnedHasMore ? '+' : ''}</span></button>
                </div>
                {!loading && visibleRecords.length === 0 && !error && <p className="wallet-empty-record">{inventoryView === 'escrow' ? 'No Ethscriptions from this wallet are currently verified in marketplace custody.' : 'The official indexer reports no Ethscriptions directly held by this address.'}</p>}
                <div className="wallet-inventory-grid">{visibleRecords.map((record) => (
                  <InventoryCard
                    key={record.transactionHash}
                    record={record}
                    escrow={inventoryView === 'escrow'}
                    action={inventoryView === 'escrow' ? withdrawAction(record) : depositAction(record)}
                    marketControls={inventoryView === 'escrow' && record.custody?.verified ? (
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
                    <button type="button" onClick={showPreviousInventoryPage} disabled={visibleHistory.length === 0}>PREVIOUS</button>
                    <span>PAGE {visibleHistory.length + 1} · UP TO {inventory?.pagination?.maximumResultsPerSection || 50} ITEMS</span>
                    <button type="button" onClick={showNextInventoryPage} disabled={!visibleHasMore || !visibleNextPageKey}>NEXT</button>
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
              deposit: 'Deposit this Ethscription?',
              register: 'Enable trading for this Ethscription?',
              listing: confirmation.record?.listing?.active ? 'Update this listing?' : 'List this Ethscription?',
              'cancel-listing': 'Cancel this listing?',
              withdraw: 'Withdraw this Ethscription?',
              claim: 'Claim your marketplace credit?',
            }[confirmation.type]}</h2>
            <p>{{
              deposit: 'Transfers this Ethscription into the market contract. It is not listed for sale until you set a price.',
              register: 'Registers this direct-to-vault Ethscription for trading while it remains in marketplace custody. You will set a price separately.',
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
              <div><dt>{['deposit', 'register'].includes(confirmation.type) ? 'MARKET CONTRACT' : 'CONNECTED WALLET'}</dt><dd><code>{['deposit', 'register'].includes(confirmation.type) ? MARKET_ADDRESS : account}</code></dd></div>
              <div><dt>ETH VALUE</dt><dd>0 ETH · GAS ONLY</dd></div>
            </dl>
            {confirmation.type === 'deposit' && (
              <label className="wallet-risk-confirmation">
                <input type="checkbox" checked={riskAccepted} onChange={(event) => setRiskAccepted(event.target.checked)} />
                <span>I confirm this is a disposable, low-value test artifact and understand the contract has not received an independent audit.</span>
              </label>
            )}
            <button className="primary-action" type="button" disabled={confirmation.type === 'deposit' && !riskAccepted} onClick={executeConfirmedTransaction}>
              Simulate + open wallet <ArrowIcon />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
