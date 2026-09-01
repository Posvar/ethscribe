import { useCallback, useEffect, useRef, useState } from 'react';
import EthscribeWorkbench from './EthscribeWorkbench';
import XpmPreview from './XpmPreview';
import { artifacts, lostArtifact } from './huntData';
import { fetchMarketStatus, fetchWalletInventory } from './marketApi';
import {
  MAINNET_CHAIN_ID,
  MARKET_ADDRESS,
  MARKET_DEPLOYMENT_BLOCK,
  MARKET_DEPLOYMENT_DOCS_PATH,
  MARKET_ETHERSCAN_URL,
} from './marketConfig';
import {
  buildDepositTransaction,
  buildWithdrawTransaction,
  friendlyTransactionError,
  hasDepositSelectorCollision,
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

const expeditionTargets = [...artifacts.filter((artifact) => artifact.status === 'open'), lostArtifact];

function TransactionStatus({ transaction, onDismiss }) {
  if (!transaction) return null;
  const action = transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal';
  const copy = {
    simulating: 'Simulating against Ethereum mainnet. Your wallet opens only if the transaction is expected to succeed.',
    mining: 'Transaction submitted. Waiting for an Ethereum receipt.',
    reconciling: transaction.message || 'Ethereum confirmed the transaction. Waiting for the official indexer and contract record to agree.',
    complete: transaction.type === 'deposit'
      ? 'Custody verified. The official indexer and active contract deposit agree after the cooldown.'
      : 'Withdrawal verified. The official indexer reports the artifact back in this wallet.',
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

function AssetPreview({ record }) {
  const source = record.transactionHash ? `/api/ethscriptions/media/${record.transactionHash}` : '';
  const mimetype = (record.mimetype || '').toLowerCase();
  const label = `Ethscription #${record.ethscriptionNumber ?? ''}`.trim();

  if (!source) {
    return <div className="wallet-asset-fallback"><span>PREVIEW UNAVAILABLE</span><strong>{record.mimetype || 'UNKNOWN MEDIA'}</strong></div>;
  }
  if (['image/x-xpixmap', 'image/x-xpm', 'image/xpm', 'text/x-xpm'].includes(mimetype)) {
    return <XpmPreview source={source} label={`${label} XPM preview`} className="wallet-asset-xpm" />;
  }
  if (mimetype.startsWith('image/')) {
    return <img src={source} alt={`${label} preview`} loading="lazy" />;
  }
  if (mimetype.startsWith('audio/')) {
    return <div className="wallet-asset-audio"><span>AUDIO ETHSCRIPTION</span><audio controls preload="none" src={source}>Your browser cannot play this audio Ethscription.</audio></div>;
  }
  if (mimetype.startsWith('video/')) {
    return <video controls preload="metadata" src={source}>Your browser cannot play this video Ethscription.</video>;
  }
  return <div className="wallet-asset-fallback"><span>DIGITAL ARTIFACT</span><strong>{record.mimetype || 'UNKNOWN MEDIA'}</strong></div>;
}

function InventoryCard({ record, escrow = false, action = null }) {
  const custody = record.custody;
  const custodyLabel = custody?.verified
    ? 'VERIFIED IN MARKET CUSTODY'
    : custody?.status === 'cooldown'
      ? 'CONFIRMING CUSTODY'
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
  openAccountModal,
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
  const [preflightTargetId, setPreflightTargetId] = useState('');
  const [preflightSource, setPreflightSource] = useState('upload');
  const [preflightEthscriptionId, setPreflightEthscriptionId] = useState('');
  const [inventoryView, setInventoryView] = useState('escrow');
  const [pageKeys, setPageKeys] = useState({ directPageKey: '', escrowPageKey: '' });
  const [pageHistory, setPageHistory] = useState({ direct: [], escrow: [] });
  const previousAccount = useRef(account);

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
    setPreflightEthscriptionId('');
  }, [account]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      if (transaction.type === 'withdraw' && directMatch && !escrowMatch) {
        setTransaction((current) => current?.id === transaction.id ? { ...current, phase: 'complete', message: '' } : current);
        return;
      }

      const message = transaction.type === 'deposit'
        ? escrowMatch?.custody?.reason || 'Waiting for the official indexer to report the market as current owner.'
        : 'Waiting for the official indexer to report this wallet as current owner.';
      setTransaction((current) => current?.id === transaction.id ? { ...current, message } : current);
      timer = setTimeout(reconcile, 12_000);
    };

    reconcile();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [account, refresh, transaction?.account, transaction?.id, transaction?.phase, transaction?.reconcileStartedAt, transaction?.type]);

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

  const openConfirmation = (type, record) => {
    setRiskAccepted(false);
    setConfirmation({ type, record });
  };

  const executeConfirmedTransaction = async () => {
    if (!confirmation || !account) return;
    const { type, record } = confirmation;
    const id = record.transactionHash;
    setConfirmation(null);
    setTransaction({ type, id, account, phase: 'simulating', hash: '', message: '' });

    try {
      const request = type === 'deposit'
        ? buildDepositTransaction(account, id)
        : buildWithdrawTransaction(account, id, {
          directCreation: record.custody?.custodyKind === 'direct_creation',
        });
      const hash = await simulateAndSendTransaction(provider, request);
      setTransaction({ type, id, account, phase: 'mining', hash, message: '' });
      await waitForTransactionReceipt(provider, hash);
      setPageKeys({ directPageKey: '', escrowPageKey: '' });
      setPageHistory({ direct: [], escrow: [] });
      setInventoryView(type === 'deposit' ? 'escrow' : 'direct');
      setTransaction({ type, id, account, phase: 'reconciling', reconcileStartedAt: Date.now(), hash, message: '' });
    } catch (transactionError) {
      setTransaction((current) => ({
        type,
        id,
        account,
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
    if (!record.custody?.verified) return { disabled: true, label: 'WAITING FOR VERIFICATION', hint: record.custody?.reason || 'Contract and indexer custody must agree first.' };
    if (!onMainnet) return { disabled: true, label: 'SWITCH TO MAINNET', hint: 'Withdrawals use Ethereum mainnet.' };
    if (!market?.transactionsEnabled || !market?.exitsEnabled) return { disabled: true, label: 'WITHDRAW UI LOCKED', hint: 'The tested transaction interface has not been operationally enabled.' };
    return {
      disabled: false,
      label: 'WITHDRAW TO THIS WALLET',
      hint: 'Returns this Ethscription from the Ethscri.be market contract to your wallet.',
      onClick: () => openConfirmation('withdraw', record),
    };
  };

  return (
    <div className="wallet-page">
      {header}
      <main>
        <section className="wallet-hero">
          <div>
            <p className="kicker"><span /> Researcher inventory</p>
            <h1>Your field wallet.</h1>
            <p>Inspect Ethscriptions held by your address and independently reconcile anything deposited with the Ethscribe marketplace.</p>
          </div>
          <div className="wallet-contract-seal">
            <span>ETHSCRI.BE MARKET</span>
            <strong>{market?.paused === false ? 'ACTIVE' : 'PAUSED'}</strong>
            <small>MAINNET · BLOCK {MARKET_DEPLOYMENT_BLOCK.toLocaleString('en-US')}</small>
          </div>
        </section>

        <section className="wallet-market-status" aria-labelledby="market-status-title">
          <div className="wallet-section-heading">
            <div><p className="kicker"><span /> Live verification</p><h2 id="market-status-title">Marketplace status</h2></div>
            <button className="wallet-refresh" type="button" onClick={() => refresh()} disabled={loading}>{loading ? 'CHECKING…' : 'REFRESH'}</button>
          </div>

          {error ? <p className="wallet-read-error" role="alert">{error}</p> : (
            <div className="market-status-grid" aria-busy={loading}>
              <div><span>CONTRACT</span><strong>{market?.deployed ? 'DEPLOYED' : loading ? 'CHECKING…' : 'UNAVAILABLE'}</strong><a href={MARKET_ETHERSCAN_URL} target="_blank" rel="noreferrer">{shortAddress(MARKET_ADDRESS)}</a></div>
              <div><span>TRANSACTION UI</span><strong>{market?.transactionsEnabled ? 'PILOT READY' : 'LOCKED'}</strong><small>{!market?.transactionsEnabled ? 'Operational gate is closed' : market?.paused ? 'Intake paused · exits available' : 'Intake and exits enabled'}</small></div>
              <div><span>OFFICIAL INDEXER</span><strong>{market?.indexer?.healthy ? 'CURRENT' : loading ? 'CHECKING…' : 'TEMPORARILY UNAVAILABLE'}</strong><small>{market?.indexer?.blocksBehind != null ? `${market.indexer.blocksBehind} block${market.indexer.blocksBehind === 1 ? '' : 's'} behind` : 'Deposits wait for the next successful check'}</small></div>
              <div><span>MARKET FEE</span><strong>{market?.feeBps != null ? `${market.feeBps / 100}%` : '—'}</strong><a href={MARKET_DEPLOYMENT_DOCS_PATH}>Deployment record</a></div>
            </div>
          )}
        </section>

        <section className="wallet-identity">
          {!account ? (
            <div className="wallet-empty-action"><p className="kicker"><span /> Wallet not connected</p><h2>Connect to inspect your artifacts.</h2><p>This read-only view requests no signature and sends no transaction.</p><button className="primary-action" type="button" onClick={connectWallet}>Connect wallet <ArrowIcon /></button></div>
          ) : (
            <>
              <div className="wallet-section-heading wallet-account-heading">
                <div><p className="kicker"><span /> Connected with {walletName || 'Ethereum wallet'}</p><h2>{shortAddress(account)}</h2><a href={`https://etherscan.io/address/${account}`} target="_blank" rel="noreferrer">View address on Etherscan</a></div>
                <div className="wallet-account-actions">
                  {openAccountModal && <button className="wallet-manage" type="button" onClick={openAccountModal}>MANAGE WALLET</button>}
                  {!onMainnet && <button className="primary-action" type="button" onClick={switchToMainnet}>Switch to Ethereum <ArrowIcon /></button>}
                </div>
              </div>

              <TransactionStatus transaction={transaction} onDismiss={() => setTransaction(null)} />

              <div className={`wallet-pilot-gate ${market?.transactionsEnabled ? 'pilot-ready' : ''}`}>
                <span>CUSTODY PILOT</span>
                <strong>{market?.transactionsEnabled ? market?.paused ? 'TRANSACTIONS READY · INTAKE PAUSED' : 'CONTROLLED INTAKE OPEN' : 'TRANSACTION CONTROLS LOCKED'}</strong>
                <p>Deposits require the operational gate, an unpaused contract, Ethereum mainnet, and a current official indexer. Verified withdrawals remain contract-available during a pause.</p>
              </div>

              <section className="wallet-expedition-preflight" aria-labelledby="wallet-preflight-title">
                <div className="wallet-preflight-heading">
                  <div><span>EXPEDITION SUBMISSION</span><h2 id="wallet-preflight-title">Test before you deposit.</h2></div>
                  <p>Run read-only checks against a local file or an Ethscription already in your wallet. Testing sends no transaction.</p>
                </div>
                <div className="wallet-preflight-source" role="group" aria-label="Choose what to test">
                  <button type="button" className={preflightSource === 'upload' ? 'active' : ''} onClick={() => { setPreflightSource('upload'); setPreflightEthscriptionId(''); }}>UPLOAD A FILE</button>
                  <button type="button" className={preflightSource === 'wallet' ? 'active' : ''} onClick={() => setPreflightSource('wallet')}>ETHSCRIPTION IN MY WALLET</button>
                </div>
                {preflightSource === 'wallet' && (
                  <label className="wallet-target-select">
                    <span>MY ETHSCRIPTION</span>
                    <select value={preflightEthscriptionId} onChange={(event) => setPreflightEthscriptionId(event.target.value)}>
                      <option value="">Choose an Ethscription in your wallet</option>
                      {direct.map((record) => <option value={record.transactionHash} key={record.transactionHash}>Ethscription #{record.ethscriptionNumber} · {record.mimetype || 'unknown media'}</option>)}
                    </select>
                    <small>{direct.length > 0 ? 'Only Ethscriptions currently held by this wallet appear here.' : 'No Ethscriptions on this inventory page are held directly by your wallet.'}</small>
                  </label>
                )}
                <label className="wallet-target-select">
                  <span>EXPEDITION 001 TARGET</span>
                  <select value={preflightTargetId} onChange={(event) => setPreflightTargetId(event.target.value)}>
                    <option value="">Choose a target to test</option>
                    {expeditionTargets.map((target) => <option value={target.id} key={target.id}>{target.date} · {target.filename} · {target.release}</option>)}
                  </select>
                  <small>The expected hash and source remain sealed while an exact-byte target is open.</small>
                </label>
                {preflightTargetId && (preflightSource === 'upload' || preflightEthscriptionId) && (
                  <EthscribeWorkbench
                    key={`${preflightTargetId}-${preflightSource}-${preflightEthscriptionId}`}
                    mode="target"
                    artifact={expeditionTargets.find((target) => target.id === preflightTargetId)}
                    existingEthscriptionId={preflightSource === 'wallet' ? preflightEthscriptionId : ''}
                    account={account}
                    chainId={chainId}
                    connectWallet={connectWallet}
                    switchToMainnet={switchToMainnet}
                    provider={provider}
                  />
                )}
              </section>

              <div className="wallet-inventory-section">
                <div className="wallet-inventory-title"><div><span>01</span><h2>Your Ethscriptions</h2></div><strong>{loading ? '—' : `${visibleRecords.length}${visibleHasMore ? '+' : ''}`}</strong></div>
                <div className="wallet-inventory-tabs" role="tablist" aria-label="Ethscription location">
                  <button type="button" role="tab" aria-selected={inventoryView === 'escrow'} className={inventoryView === 'escrow' ? 'active' : ''} onClick={() => setInventoryView('escrow')}>MARKETPLACE CUSTODY <span>{escrow.length}{inventory?.pagination?.escrowHasMore ? '+' : ''}</span></button>
                  <button type="button" role="tab" aria-selected={inventoryView === 'direct'} className={inventoryView === 'direct' ? 'active' : ''} onClick={() => setInventoryView('direct')}>MY WALLET <span>{direct.length}{inventory?.pagination?.directlyOwnedHasMore ? '+' : ''}</span></button>
                </div>
                {!loading && visibleRecords.length === 0 && !error && <p className="wallet-empty-record">{inventoryView === 'escrow' ? 'No Ethscriptions from this wallet are currently verified in marketplace custody.' : 'The official indexer reports no Ethscriptions directly held by this address.'}</p>}
                <div className="wallet-inventory-grid">{visibleRecords.map((record) => <InventoryCard key={record.transactionHash} record={record} escrow={inventoryView === 'escrow'} action={inventoryView === 'escrow' ? withdrawAction(record) : depositAction(record)} />)}</div>
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

        <section className="custody-method">
          <p className="kicker"><span /> Fail-closed custody</p>
          <h2>Two records must agree.</h2>
          <p>An artifact is shown as verified in marketplace custody only when the official Ethscriptions indexer names the market as current owner and the connected wallet as previous owner. Existing-ID deposits must also have an active contract record; direct-to-vault creations must name that same wallet as creator and the market as initial owner. Both paths wait through the five-block safety window.</p>
        </section>
      </main>
      {footer}
      {confirmation && (
        <div className="wallet-confirmation-backdrop" role="presentation" onMouseDown={() => setConfirmation(null)}>
          <section className="wallet-confirmation" role="dialog" aria-modal="true" aria-labelledby="wallet-confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setConfirmation(null)} aria-label="Close">×</button>
            <p className="kicker"><span /> Controlled custody pilot</p>
            <h2 id="wallet-confirmation-title">{confirmation.type === 'deposit' ? 'Deposit this Ethscription?' : 'Withdraw this Ethscription?'}</h2>
            <p>{confirmation.type === 'deposit'
              ? 'A successful zero-ETH transaction transfers the complete Ethscription to the immutable market contract for custody only. It does not create an expedition Finding. A transaction receipt alone is not proof of custody; Ethscribe will wait for the official indexer and contract record to agree.'
              : 'The vault will return the Ethscription to this connected wallet after confirming it as the previous owner. This exit remains available while market intake is paused.'}</p>
            <dl>
              <div><dt>ETHSCRIPTION</dt><dd><code>{confirmation.record.transactionHash}</code></dd></div>
              <div><dt>{confirmation.type === 'deposit' ? 'DESTINATION' : 'RECIPIENT'}</dt><dd><code>{confirmation.type === 'deposit' ? MARKET_ADDRESS : account}</code></dd></div>
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
