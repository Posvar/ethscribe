import { useCallback, useEffect, useState } from 'react';
import { fetchMarketStatus, fetchWalletInventory } from './marketApi';
import {
  MAINNET_CHAIN_ID,
  MARKET_ADDRESS,
  MARKET_DEPLOYMENT_BLOCK,
  MARKET_DEPLOYMENT_DOCS_PATH,
  MARKET_ETHERSCAN_URL,
} from './marketConfig';

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

function InventoryCard({ record, escrow = false }) {
  const custody = record.custody;
  const custodyLabel = custody?.verified
    ? 'VERIFIED IN MARKET CUSTODY'
    : (custody?.status || 'not_verified').replace(/_/g, ' ').toUpperCase();

  return (
    <article className="wallet-inventory-card">
      <div className="wallet-card-heading">
        <p>{record.mimetype || 'UNKNOWN MEDIA'}</p>
        <span className={custody?.verified ? 'custody-verified' : 'custody-unverified'}>
          {escrow ? custodyLabel : 'DIRECTLY OWNED'}
        </span>
      </div>
      <h3>Ethscription #{record.ethscriptionNumber ?? '—'}</h3>
      <dl>
        <div><dt>ETHSCRIPTION ID</dt><dd><a href={`https://etherscan.io/tx/${record.transactionHash}`} target="_blank" rel="noreferrer">{shortAddress(record.transactionHash)}</a></dd></div>
        <div><dt>CONTENT SHA-256</dt><dd><code>{record.contentSha || 'Unavailable'}</code></dd></div>
        <div><dt>ETHSCRIBED</dt><dd>{formatDate(record.blockTimestamp)}</dd></div>
        <div><dt>CURRENT OWNER</dt><dd><a href={`https://etherscan.io/address/${record.currentOwner}`} target="_blank" rel="noreferrer">{shortAddress(record.currentOwner)}</a></dd></div>
      </dl>
      {escrow && <p className="custody-reason">{custody?.reason || 'Custody could not be independently reconciled.'}</p>}
      <a className="wallet-record-link" href={`https://ethscriptions.com/ethscriptions/${record.transactionHash}`} target="_blank" rel="noreferrer">Open official record <ArrowIcon /></a>
    </article>
  );
}

export default function WalletPage({
  account,
  chainId,
  connectWallet,
  switchToMainnet,
  header,
  footer,
}) {
  const [status, setStatus] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (account) {
        const nextInventory = await fetchWalletInventory(account);
        setInventory(nextInventory);
        setStatus(nextInventory.market);
      } else {
        setStatus(await fetchMarketStatus());
        setInventory(null);
      }
    } catch {
      setError('The live Ethereum or Ethscriptions read service is temporarily unavailable. No custody claim is being shown as verified.');
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const market = inventory?.market || status;
  const onMainnet = !chainId || chainId.toLowerCase() === MAINNET_CHAIN_ID;
  const direct = inventory?.directlyOwned || [];
  const escrow = inventory?.escrow || [];

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
            <span>MARKET V1</span>
            <strong>{market?.paused === false ? 'ACTIVE' : 'PAUSED'}</strong>
            <small>MAINNET · BLOCK {MARKET_DEPLOYMENT_BLOCK.toLocaleString('en-US')}</small>
          </div>
        </section>

        <section className="wallet-market-status" aria-labelledby="market-status-title">
          <div className="wallet-section-heading">
            <div><p className="kicker"><span /> Live verification</p><h2 id="market-status-title">Marketplace status</h2></div>
            <button className="wallet-refresh" type="button" onClick={refresh} disabled={loading}>{loading ? 'CHECKING…' : 'REFRESH'}</button>
          </div>

          {error ? <p className="wallet-read-error" role="alert">{error}</p> : (
            <div className="market-status-grid" aria-busy={loading}>
              <div><span>CONTRACT</span><strong>{market?.deployed ? 'DEPLOYED' : loading ? 'CHECKING…' : 'UNAVAILABLE'}</strong><a href={MARKET_ETHERSCAN_URL} target="_blank" rel="noreferrer">{shortAddress(MARKET_ADDRESS)}</a></div>
              <div><span>MARKET WRITES</span><strong>{market?.writesEnabled ? 'ENABLED' : 'DISABLED'}</strong><small>{market?.paused ? 'Contract is deliberately paused' : 'Requires healthy contract + indexer'}</small></div>
              <div><span>OFFICIAL INDEXER</span><strong>{market?.indexer?.healthy ? 'CURRENT' : loading ? 'CHECKING…' : 'NOT VERIFIED'}</strong><small>{market?.indexer?.blocksBehind != null ? `${market.indexer.blocksBehind} block${market.indexer.blocksBehind === 1 ? '' : 's'} behind` : 'Status unavailable'}</small></div>
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
                <div><p className="kicker"><span /> Connected researcher</p><h2>{shortAddress(account)}</h2><a href={`https://etherscan.io/address/${account}`} target="_blank" rel="noreferrer">View address on Etherscan</a></div>
                {!onMainnet && <button className="primary-action" type="button" onClick={switchToMainnet}>Switch to Ethereum <ArrowIcon /></button>}
              </div>

              <div className="wallet-inventory-section">
                <div className="wallet-inventory-title"><div><span>01</span><h2>Directly owned</h2></div><strong>{loading ? '—' : direct.length}</strong></div>
                {!loading && direct.length === 0 && !error && <p className="wallet-empty-record">The official indexer reports no Ethscriptions directly owned by this address.</p>}
                <div className="wallet-inventory-grid">{direct.map((record) => <InventoryCard key={record.transactionHash} record={record} />)}</div>
                {inventory?.pagination?.directlyOwnedHasMore && <p className="wallet-limit-note">Showing the newest {inventory.pagination.maximumResultsPerSection} records.</p>}
              </div>

              <div className="wallet-inventory-section">
                <div className="wallet-inventory-title"><div><span>02</span><h2>Marketplace custody</h2></div><strong>{loading ? '—' : escrow.length}</strong></div>
                {!loading && escrow.length === 0 && !error && <p className="wallet-empty-record">No active market deposits from this address passed the candidate lookup. Nothing is represented as escrowed.</p>}
                <div className="wallet-inventory-grid">{escrow.map((record) => <InventoryCard key={record.transactionHash} record={record} escrow />)}</div>
                {inventory?.pagination?.escrowHasMore && <p className="wallet-limit-note">Showing the newest {inventory.pagination.maximumResultsPerSection} records.</p>}
              </div>
            </>
          )}
        </section>

        <section className="custody-method">
          <p className="kicker"><span /> Fail-closed custody</p>
          <h2>Two records must agree.</h2>
          <p>An artifact is shown as verified in marketplace custody only when the official Ethscriptions indexer names the market as current owner and the depositor as previous owner, the contract reports an active matching deposit, and the five-block cooldown has elapsed. A lag, mismatch, or failed read produces no verified badge.</p>
        </section>
      </main>
      {footer}
    </div>
  );
}
