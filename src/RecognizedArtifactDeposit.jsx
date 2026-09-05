import { useEffect, useRef, useState } from 'react';
import { fetchArtifactMarket } from './marketApi';
import { MAINNET_CHAIN_ID, MARKET_ADDRESS } from './marketConfig';
import {
  buildDepositTransaction,
  friendlyTransactionError,
  hasDepositSelectorCollision,
  isAddress,
  isEthscriptionId,
  simulateAndSendTransaction,
  waitForTransactionReceipt,
} from './marketTransactions';
import { waitForVerifiedCustody } from './ethscriptionCreation';

const same = (left, right) => typeof left === 'string' && typeof right === 'string'
  && left.length > 0 && left.toLowerCase() === right.toLowerCase();

function pendingKey(id, depositor) {
  return `ethscribe:deposit:${MAINNET_CHAIN_ID}:${MARKET_ADDRESS.toLowerCase()}:${id.toLowerCase()}:${depositor.toLowerCase()}`;
}

function readPending(id, depositor) {
  if (!isEthscriptionId(id) || !isAddress(depositor)) return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(pendingKey(id, depositor)) || 'null');
    return stored && isEthscriptionId(stored.hash) && same(stored.ethscriptionId, id) && same(stored.depositor, depositor)
      ? { hash: stored.hash, ethscriptionId: stored.ethscriptionId, depositor: stored.depositor }
      : null;
  } catch { return null; }
}

function rememberPending(submitted) {
  try { sessionStorage.setItem(pendingKey(submitted.ethscriptionId, submitted.depositor), JSON.stringify(submitted)); }
  catch { /* Transaction tracking still works in memory if browser storage is unavailable. */ }
}

function forgetPending(submitted) {
  try { sessionStorage.removeItem(pendingKey(submitted.ethscriptionId, submitted.depositor)); }
  catch { /* Browser storage may be disabled. */ }
}

function ownedBy(snapshot, id, account) {
  return isEthscriptionId(id) && isAddress(account)
    && same(snapshot?.ethscription?.transactionHash, id)
    && same(snapshot.ethscription.currentOwner, account)
    && !same(account, MARKET_ADDRESS);
}

function intakeIssue(snapshot) {
  const market = snapshot?.market;
  if (market?.localPreview) return 'Review only. Deposit transactions are disabled in this local preview.';
  if (!same(market?.address, MARKET_ADDRESS) || market?.deployed !== true || Number(market?.chainId) !== 1) {
    return 'The marketplace destination could not be verified. Depositing is unavailable until the next successful check.';
  }
  if (market.paused !== false) return 'Marketplace deposits are paused. Your Ethscription remains in your wallet.';
  if (market.indexer?.healthy !== true || market.indexer?.available !== true) {
    return 'The ownership index is catching up. You can review this deposit; sending unlocks when ownership checks are current.';
  }
  if (market.intakeEnabled !== true || market.transactionsEnabled !== true) {
    return 'Marketplace deposits are temporarily unavailable. Your Ethscription remains in your wallet.';
  }
  return '';
}

function ArrowIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 4l5 5-5 5" /></svg>;
}

export default function RecognizedArtifactDeposit({
  artifact, snapshot, account, chainId, provider, switchToMainnet, onDeposited,
}) {
  const id = artifact?.ethscriptionId || '';
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pending, setPending] = useState(() => readPending(id, account));
  const [phase, setPhase] = useState(pending ? 'account-changed' : 'idle');
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const operation = useRef({ version: 0, busy: false, controller: null });
  const identity = `${account?.toLowerCase() || ''}:${chainId?.toLowerCase() || ''}:${id.toLowerCase()}`;
  const identityRef = useRef(identity);
  const previousIdentity = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current.version += 1;
      operation.current.controller?.abort();
    };
  }, []);

  useEffect(() => {
    if (previousIdentity.current === identity) return;
    previousIdentity.current = identity;
    operation.current.version += 1;
    operation.current.controller?.abort();
    setReviewOpen(false);
    const recovered = pending || readPending(id, account);
    if (recovered && !pending) setPending(recovered);
    setPhase(recovered ? 'account-changed' : 'idle');
    setMessage('');
  }, [identity]);

  const onMainnet = chainId?.toLowerCase() === MAINNET_CHAIN_ID;
  const isOwner = ownedBy(snapshot, id, account);
  const busy = ['checking', 'wallet', 'confirming', 'verifying'].includes(phase);
  const collision = hasDepositSelectorCollision(id);
  const issue = collision
    ? 'This Ethscription ID conflicts with a reserved marketplace action and cannot use this deposit path.'
    : intakeIssue(snapshot);
  const pendingWalletMatches = pending && same(pending.depositor, account) && same(pending.ethscriptionId, id);

  const beginOperation = () => {
    operation.current.busy = true;
    const version = ++operation.current.version;
    const controller = new AbortController();
    operation.current.controller = controller;
    const current = () => mounted.current && operation.current.version === version && identityRef.current === identity;
    const requireCurrent = () => {
      if (!current()) throw new Error('The connected wallet or selected artifact changed.');
    };
    return {
      current,
      provider: {
        request: (request) => {
          requireCurrent();
          return provider.request(request);
        },
      },
      fetch: (url, options) => {
        requireCurrent();
        return fetch(url, { ...options, signal: controller.signal });
      },
    };
  };

  const verify = async (submitted, run) => {
    setPhase('confirming');
    setMessage('Deposit submitted. Waiting for Ethereum confirmation. No second transaction is needed.');
    await waitForTransactionReceipt(run.provider, submitted.hash);
    if (!run.current()) return;
    setPhase('verifying');
    setMessage('Ethereum confirmed your deposit. Checking marketplace custody automatically; this can take several blocks.');
    const record = await waitForVerifiedCustody(submitted.depositor, submitted.ethscriptionId, { fetchImpl: run.fetch });
    if (!run.current()) return;
    if (!same(record.transactionHash, submitted.ethscriptionId)
      || !same(record.currentOwner, MARKET_ADDRESS)
      || !same(record.previousOwner, submitted.depositor)) {
      throw new Error('The ownership records have not agreed yet. Recheck this transaction without sending another deposit.');
    }
    setPhase('complete');
    forgetPending(submitted);
    setMessage('Deposit verified. Set a price or withdraw your Ethscription from Field Wallet.');
    // A parent refresh failure does not turn verified custody into a failed deposit.
    try { await onDeposited?.(record); } catch { /* The parent retains its own refresh state. */ }
  };

  const transactionError = (error, run) => {
    if (!run.current()) return;
    if (error.code === 'TRANSACTION_REVERTED') {
      setPending((current) => {
        if (!current) return current;
        forgetPending(current);
        return { ...current, reverted: true };
      });
    }
    setPhase('error');
    setMessage(friendlyTransactionError(error));
  };

  const sendDeposit = async () => {
    if (!reviewOpen || !isOwner || !onMainnet || issue || pending || operation.current.busy || !provider?.request) return;
    const depositor = account;
    const run = beginOperation();
    setPhase('checking');
    setMessage('Refreshing ownership and marketplace availability before opening your wallet.');
    try {
      const fresh = await fetchArtifactMarket(id);
      if (!run.current()) return;
      if (!ownedBy(fresh, id, depositor)) throw new Error('The current ownership record no longer matches this wallet. No deposit transaction was sent.');
      const freshIssue = intakeIssue(fresh);
      if (freshIssue) throw new Error(freshIssue);
      setPhase('wallet');
      setMessage('Review the deposit in your wallet. Only the existing Ethscription is transferred; there is no new inscription.');
      const transaction = buildDepositTransaction(depositor, id);
      const hash = await simulateAndSendTransaction(run.provider, transaction);
      const submitted = { hash, depositor, ethscriptionId: id, filename: artifact.filename };
      // A wallet may return its hash after the user closes this record. Remember
      // only public transaction identifiers so reopening offers verification.
      rememberPending(submitted);
      if (!mounted.current) return;
      setPending(submitted);
      setReviewOpen(false);
      // A wallet prompt may resolve after its connection changes. Keep its hash,
      // but do not verify or update another account's view with that result.
      if (!run.current()) {
        setPhase('account-changed');
        setMessage('');
        return;
      }
      await verify(submitted, run);
    } catch (error) {
      transactionError(error, run);
    } finally {
      operation.current.busy = false;
    }
  };

  const retryVerification = async () => {
    if (!pending || pending.reverted || !pendingWalletMatches || !onMainnet || operation.current.busy || !provider?.request) return;
    const run = beginOperation();
    try { await verify(pending, run); }
    catch (error) { transactionError(error, run); }
    finally { operation.current.busy = false; }
  };

  const changeNetwork = async () => {
    const requestedIdentity = identity;
    try { await switchToMainnet?.(); }
    catch (error) {
      if (mounted.current && identityRef.current === requestedIdentity) {
        setPhase('error');
        setMessage(friendlyTransactionError(error));
      }
    }
  };

  if (!isOwner && !pending) return null;

  return (
    <div className="recognized-deposit">
      {!pending && !reviewOpen && (
        <button className="artifact-market-action" type="button" disabled={collision || busy} onClick={() => { setReviewOpen(true); setPhase('idle'); setMessage(''); }}>
          DEPOSIT INTO MARKETPLACE <ArrowIcon />
        </button>
      )}
      {!pending && !reviewOpen && collision && <p className="artifact-market-note">{issue}</p>}
      {!pending && reviewOpen && (
        <section className="artifact-market-review" aria-label="Review marketplace deposit">
          <strong>Deposit {artifact.filename || 'this Ethscription'}</strong>
          <p>This transfers your existing Ethscription into the marketplace. It does not create a new copy or list it for sale. After verification, you can set a price or withdraw it from Field Wallet.</p>
          <dl>
            <div><dt>ETHSCRIPTION ID</dt><dd><a href={`https://ethscriptions.com/ethscriptions/${id}`} target="_blank" rel="noreferrer"><code>{id}</code></a></dd></div>
            <div><dt>DESTINATION</dt><dd><a href={`https://etherscan.io/address/${MARKET_ADDRESS}`} target="_blank" rel="noreferrer"><code>{MARKET_ADDRESS}</code></a></dd></div>
            <div><dt>COST</dt><dd>0 ETH deposit value · Ethereum gas only. Your wallet shows the gas estimate before approval.</dd></div>
          </dl>
          {issue && <p className="artifact-market-note">{issue}</p>}
          {!onMainnet && !snapshot?.market?.localPreview && <button className="artifact-market-action" type="button" disabled={busy} onClick={changeNetwork}>SWITCH TO ETHEREUM</button>}
          <button className="artifact-market-action" type="button" disabled={Boolean(issue) || !onMainnet || busy || !provider?.request} onClick={sendDeposit}>
            {snapshot?.market?.localPreview ? 'DEPOSITS DISABLED IN LOCAL PREVIEW' : busy ? 'DEPOSIT IN PROGRESS…' : 'CONFIRM DEPOSIT IN WALLET'}
          </button>
          <button type="button" disabled={busy} onClick={() => { setReviewOpen(false); setMessage(''); }}>Cancel</button>
        </section>
      )}
      {message && <p className="artifact-purchase-status" role="status">{message}</p>}
      {pending && (
        <div className="artifact-purchase-status" role="status">
          <a href={`https://etherscan.io/tx/${pending.hash}`} target="_blank" rel="noreferrer">View deposit transaction <ArrowIcon /></a>
          {!pendingWalletMatches && <p>Reconnect the depositing wallet and open this artifact to continue checking its deposit. The transaction has already been submitted.</p>}
          {pendingWalletMatches && !onMainnet && <button type="button" onClick={changeNetwork}>Switch to Ethereum to recheck</button>}
          {pendingWalletMatches && onMainnet && ['error', 'account-changed'].includes(phase) && !pending.reverted && (
            <button type="button" disabled={busy || !provider?.request} onClick={retryVerification}>RECHECK DEPOSIT · NO GAS</button>
          )}
          {pending.reverted && <p>Ethereum reverted this transaction. It did not deposit the Ethscription. Refresh the ownership record before preparing another attempt.</p>}
          {(phase === 'complete' || pending.reverted) && <button type="button" onClick={() => { setPending(null); setPhase('idle'); setMessage(''); }}>Close deposit status</button>}
        </div>
      )}
    </div>
  );
}
