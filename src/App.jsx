import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import DocsPage from './DocsPage';
import EthscribeWorkbench from './EthscribeWorkbench';
import WalletPage from './WalletPage';
import XpmPreview from './XpmPreview';
import { artifactById, artifacts, huntStats, lostArtifact, timelineEvents } from './huntData';
import { fetchVerifiedFindings, mergeVerifiedFindings, statsForArtifacts } from './findingApi';
import { fetchArtifactMarket, fetchWalletInventory } from './marketApi';
import { MAINNET_CHAIN_ID } from './marketConfig';
import {
  buildBuyTransaction,
  friendlyTransactionError,
  simulateAndSendTransaction,
  waitForTransactionReceipt,
} from './marketTransactions';
import { useEthscribeWallet } from './useEthscribeWallet';

const EXPEDITION_PATH = '/expeditions/lost-pixels-of-satoshi';
const referenceImage = artifactById('new-png-48').previewUrl;

const processSteps = [
  { number: '01', title: 'Define the target', body: 'A hunt begins with a culturally significant artifact and a precise definition of what counts.' },
  { number: '02', title: 'Follow the source', body: 'Researchers work from release archives, source commits, and contemporaneous records—not visual resemblance.' },
  { number: '03', title: 'Prove the bytes', body: 'Exact decoded bytes are matched by hash. A line ending, metadata rewrite, or reconstruction is a different artifact.' },
  { number: '04', title: 'Preserve the record', body: 'Verified files, evidence, and ownership enter a permanent public catalogue anchored to Ethereum.' },
];

function ArrowIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 4l5 5-5 5" /></svg>;
}

function WalletIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 5.5h13v10h-13zM2.5 5.5 5 3h10.5v2.5M12 9h5.5v4H12z" /></svg>;
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
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

function formatBytes(bytes) {
  return bytes ? `${bytes.toLocaleString('en-US')} bytes` : 'Unknown';
}

function isSmallArtifact(artifact) {
  const dimensions = artifact.dimensions?.match(/\d+/g)?.map(Number) || [];
  return dimensions.length > 0 && Math.max(...dimensions.slice(0, 2)) <= 80;
}

function walletLabel(account, walletState, walletName, ensName) {
  const identity = ensName || shortAddress(account);
  if (account) return walletName ? `${walletName} · ${identity}` : identity;
  return walletState === 'connecting' ? 'Connecting…' : 'Connect Wallet';
}

function SiteHeader({ account, walletState, walletName, ensName, connectWallet, openAccountModal, expedition = false, expeditions = false, docs = false, wallet = false }) {
  const awayFromHome = expedition || expeditions || docs || wallet;
  const expeditionsActive = expedition || expeditions;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const connectFromMenu = async () => {
    closeMenu();
    await connectWallet();
  };

  return (
    <div className="header-stack">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Ethscribe home"><img src="/icon.svg" alt="" /><span className="brand-wordmark">ETHSCRI.BE</span></a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href={awayFromHome ? '/#mission' : '#mission'}>Mission</a>
          <a className={expeditionsActive ? 'nav-active' : ''} href="/expeditions" aria-current={expeditionsActive ? 'page' : undefined}>Expeditions</a>
          <a className={wallet ? 'nav-active' : ''} href="/wallet" aria-current={wallet ? 'page' : undefined}>Wallet</a>
        </nav>
        {account ? (
          <button className="wallet-button desktop-wallet" type="button" onClick={openAccountModal} aria-label="Manage connected wallet">
            <WalletIcon />
            {walletLabel(account, walletState, walletName, ensName)}
          </button>
        ) : (
          <button className="wallet-button desktop-wallet" type="button" onClick={connectWallet}>
            <WalletIcon />
            {walletLabel(account, walletState, walletName, ensName)}
          </button>
        )}
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span /><span /><span />
        </button>
        {menuOpen && (
          <nav className="mobile-menu" id="mobile-navigation" aria-label="Mobile navigation">
            {account ? (
              <button className="mobile-wallet-action" type="button" onClick={() => { closeMenu(); openAccountModal?.(); }}>
                <WalletIcon />
                <span>{walletLabel(account, walletState, walletName, ensName)}</span>
                <ArrowIcon />
              </button>
            ) : (
              <button className="mobile-wallet-action" type="button" onClick={connectFromMenu}>
                <WalletIcon />
                <span>{walletLabel(account, walletState, walletName, ensName)}</span>
                <ArrowIcon />
              </button>
            )}
            <a href={awayFromHome ? '/#mission' : '#mission'} onClick={closeMenu}>Mission</a>
            <a className={expeditionsActive ? 'nav-active' : ''} href="/expeditions" onClick={closeMenu}>Expeditions</a>
            <a className={wallet ? 'nav-active' : ''} href="/wallet" onClick={closeMenu}>Wallet</a>
          </nav>
        )}
      </header>
      {expedition && (
        <nav className="expedition-context-bar" aria-label="Current expedition">
          <a href="/expeditions">EXPEDITIONS</a><span>└─</span><a href={EXPEDITION_PATH} aria-current="page">EXPEDITION 001: THE LOST PIXELS OF SATOSHI</a>
        </nav>
      )}
    </div>
  );
}

function ArtifactPreview({ artifact, className = '' }) {
  if (artifact.status === 'lost') {
    return (
      <div className={`lost-preview ${className}`} aria-label="Lost artifact; no verified preview exists">
        <span>?</span><small>NO VERIFIED BYTES</small>
      </div>
    );
  }

  if (artifact.status === 'open') {
    return (
      <div className={`sealed-preview ${className}`} aria-label="Open hunt target; preview sealed until accession">
        <span>?</span><strong>TARGET SEALED</strong><small>FIND THE EXACT FILE</small>
      </div>
    );
  }

  if (artifact.format === 'XPM') {
    return <XpmPreview source={artifact.previewUrl} label={`${artifact.filename} decoded preview`} className={className} />;
  }

  return <div className={`file-preview ${className}`}><img src={artifact.previewUrl} alt={`${artifact.filename} historical artifact`} /></div>;
}

function ArtifactGridPreview({ artifact }) {
  if (artifact.status !== 'secured' || !artifact.previewUrl) return <span className="corpus-slot-open">+</span>;
  if (artifact.format === 'XPM') {
    return <XpmPreview source={artifact.previewUrl} label={`${artifact.filename} decoded preview`} />;
  }
  return <img src={artifact.previewUrl} alt="" />;
}

function ExpeditionCorpusGrid({ resolvedArtifacts, onOpenArtifact }) {
  return (
    <div className="expedition-corpus" aria-label="Twenty-two artifact targets in Expedition 001">
      <div className="corpus-grid-heading"><span>22 BYTE-PERFECT TARGETS</span><strong>FIRST COME · FIRST SCRIBE</strong></div>
      <div className="corpus-grid">
        {resolvedArtifacts.map((artifact, index) => (
          <button
            className={`corpus-slot slot-${artifact.status}`}
            type="button"
            key={artifact.id}
            onClick={() => onOpenArtifact(artifact.id)}
            aria-label={`Open field note for ${artifact.filename}, ${artifact.status === 'secured' ? 'Ethscribed' : 'not yet Ethscribed'}`}
          >
            <span className="corpus-slot-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="corpus-slot-visual"><ArtifactGridPreview artifact={artifact} /></span>
            <span className="corpus-slot-name">{artifact.filename}</span>
            <span className="corpus-slot-state">{artifact.status === 'secured' ? 'ETHSCRIBED' : 'OPEN'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecordFact({ label, value, unknown = 'Unknown until the original bytes are recovered', className = '' }) {
  return (
    <div className={`record-fact ${className}`}>
      <dt>{label}</dt>
      <dd className={!value ? 'unknown-hash' : ''}>{value || unknown}</dd>
    </div>
  );
}

function TargetSubmission({ artifact, account, chainId, connectWallet, switchToMainnet, provider, onFindingPublished, onClose }) {
  const [source, setSource] = useState('upload');
  const [selectedEthscriptionId, setSelectedEthscriptionId] = useState('');
  const [ownedRecords, setOwnedRecords] = useState([]);
  const [inventoryState, setInventoryState] = useState('idle');

  useEffect(() => {
    if (source !== 'existing' || !account) return undefined;
    let active = true;
    setInventoryState('loading');

    fetchWalletInventory(account)
      .then((inventory) => {
        if (!active) return;
        const records = [
          ...(inventory.escrow || [])
            .filter((record) => record.custody?.verified)
            .map((record) => ({ ...record, location: 'MARKETPLACE CUSTODY' })),
          ...(inventory.directlyOwned || [])
            .map((record) => ({ ...record, location: 'MY WALLET' })),
        ];
        const unique = records.filter((record, index) => records.findIndex(
          (candidate) => candidate.transactionHash?.toLowerCase() === record.transactionHash?.toLowerCase(),
        ) === index);
        setOwnedRecords(unique);
        setInventoryState('ready');
      })
      .catch(() => {
        if (active) setInventoryState('error');
      });

    return () => { active = false; };
  }, [account, source]);

  const chooseSource = (nextSource) => {
    setSource(nextSource);
    setSelectedEthscriptionId('');
  };

  return (
    <section className="target-submission" aria-labelledby={`submission-title-${artifact.id}`}>
      <div className="target-submission-heading">
        <div><span>FINDING WORKFLOW</span><h3 id={`submission-title-${artifact.id}`}>Test your candidate.</h3></div>
        <p>Upload the historical file or select an Ethscription you already control. Nothing is submitted until its bytes pass this target’s check.</p>
        <button className="target-submission-close" type="button" onClick={onClose}>CLOSE</button>
      </div>
      <div className="target-submission-source" role="group" aria-label="Choose a Finding source">
        <button type="button" className={source === 'upload' ? 'active' : ''} onClick={() => chooseSource('upload')}>UPLOAD EXACT FILE</button>
        <button type="button" className={source === 'existing' ? 'active' : ''} onClick={() => chooseSource('existing')}>USE EXISTING ETHSCRIPTION</button>
      </div>

      {source === 'existing' && !account && (
        <div className="target-submission-connect">
          <p>Connect the wallet that owns the Ethscription or deposited it into marketplace custody.</p>
          <button className="primary-action" type="button" onClick={connectWallet}>Connect wallet <ArrowIcon /></button>
        </div>
      )}

      {source === 'existing' && account && (
        <label className="target-ethscription-picker">
          <span>EXISTING ETHSCRIPTION</span>
          <select value={selectedEthscriptionId} onChange={(event) => setSelectedEthscriptionId(event.target.value)} disabled={inventoryState === 'loading'}>
            <option value="">{inventoryState === 'loading' ? 'Loading your Ethscriptions…' : 'Choose an Ethscription'}</option>
            {ownedRecords.map((record) => (
              <option value={record.transactionHash} key={record.transactionHash}>
                Ethscription #{record.ethscriptionNumber} · {record.mimetype || 'unknown media'} · {record.location}
              </option>
            ))}
          </select>
          <small>{inventoryState === 'error'
            ? 'Your Ethscriptions could not be loaded from the official index. Try this path again shortly.'
            : inventoryState === 'ready' && ownedRecords.length === 0
              ? 'No eligible Ethscriptions were found in this wallet or its verified marketplace custody.'
              : 'Includes directly held Ethscriptions and artifacts already verified in marketplace custody.'}</small>
        </label>
      )}

      {(source === 'upload' || selectedEthscriptionId) && (
        <EthscribeWorkbench
          key={`${artifact.id}-${source}-${selectedEthscriptionId}`}
          mode="target"
          artifact={artifact}
          existingEthscriptionId={source === 'existing' ? selectedEthscriptionId : ''}
          account={account}
          chainId={chainId}
          connectWallet={connectWallet}
          switchToMainnet={switchToMainnet}
          provider={provider}
          onFindingPublished={onFindingPublished}
        />
      )}
    </section>
  );
}

function ArtifactMarketPanel({ artifact, account, chainId, connectWallet, switchToMainnet, provider }) {
  const [snapshot, setSnapshot] = useState(null);
  const [marketState, setMarketState] = useState(artifact.ethscriptionId ? 'loading' : 'idle');
  const [purchase, setPurchase] = useState(null);

  const loadMarket = useCallback(async ({ quiet = false } = {}) => {
    if (!artifact.ethscriptionId) return null;
    if (!quiet) setMarketState('loading');
    try {
      const nextSnapshot = await fetchArtifactMarket(artifact.ethscriptionId);
      setSnapshot(nextSnapshot);
      setMarketState('ready');
      return nextSnapshot;
    } catch {
      if (!quiet) setMarketState('error');
      return null;
    }
  }, [artifact.ethscriptionId]);

  useEffect(() => {
    let active = true;
    let timer;

    if (!artifact.ethscriptionId) {
      setSnapshot(null);
      setMarketState('idle');
      return () => {};
    }

    loadMarket().then(() => {
      if (active) timer = setInterval(() => loadMarket({ quiet: true }), 15_000);
    });

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [artifact.ethscriptionId, loadMarket]);

  const listing = snapshot?.listing;
  const liveListing = Boolean(listing?.active && !listing?.expired);
  const custodyVerified = Boolean(snapshot?.custody?.verified);
  const seller = snapshot?.seller;
  const isSeller = Boolean(account && seller && account.toLowerCase() === seller.toLowerCase());
  const onMainnet = chainId?.toLowerCase() === MAINNET_CHAIN_ID;
  const transactionBusy = purchase && ['simulating', 'mining', 'settling'].includes(purchase.phase);

  const buyListing = async () => {
    if (!account || !seller || !liveListing || !custodyVerified) return;
    setPurchase({ phase: 'simulating', hash: '', message: '' });
    try {
      const request = buildBuyTransaction(
        account,
        seller,
        artifact.ethscriptionId,
        listing.listingNonce,
        listing.priceWei,
      );
      const hash = await simulateAndSendTransaction(provider, request);
      setPurchase({ phase: 'mining', hash, message: '' });
      await waitForTransactionReceipt(provider, hash);
      setPurchase({ phase: 'settling', hash, message: 'Purchase confirmed. Updating the public ownership record.' });
      await loadMarket({ quiet: true });
      setPurchase({ phase: 'complete', hash, message: 'Purchase confirmed on Ethereum.' });
    } catch (purchaseError) {
      setPurchase((current) => ({
        phase: 'error',
        hash: current?.hash || '',
        message: friendlyTransactionError(purchaseError),
      }));
    }
  };

  const action = (() => {
    if (!artifact.ethscriptionId) return null;
    if (!liveListing) return null;
    if (isSeller) return <a className="artifact-market-action" href="/wallet">MANAGE IN FIELD WALLET <ArrowIcon /></a>;
    if (!custodyVerified || snapshot?.market?.transactionsEnabled === false) return null;
    if (!account) return <button className="artifact-market-action" type="button" onClick={connectWallet}>CONNECT WALLET TO BUY <ArrowIcon /></button>;
    if (!onMainnet) return <button className="artifact-market-action" type="button" onClick={switchToMainnet}>SWITCH TO ETHEREUM <ArrowIcon /></button>;
    if (purchase?.phase !== 'review') {
      return <button className="artifact-market-action" type="button" disabled={transactionBusy} onClick={() => setPurchase({ phase: 'review', hash: '', message: '' })}>BUY FOR {formatWeiAsEth(listing.priceWei)} ETH <ArrowIcon /></button>;
    }
    return (
      <div className="artifact-market-review">
        <p>Your wallet will send exactly <strong>{formatWeiAsEth(listing.priceWei)} ETH</strong>, plus network gas.</p>
        <div><button type="button" onClick={buyListing}>CONFIRM PURCHASE</button><button type="button" onClick={() => setPurchase(null)}>CANCEL</button></div>
      </div>
    );
  })();

  return (
    <section className={`artifact-market-card${liveListing ? ' has-listing' : ''}`} aria-label="Marketplace listing">
      <div className="artifact-market-heading">
        <span>MARKETPLACE</span>
        <strong>{marketState === 'loading' ? 'CHECKING LISTING…' : marketState === 'error' ? 'LISTING UNAVAILABLE' : liveListing ? 'ACTIVE LISTING' : 'NOT LISTED'}</strong>
      </div>
      {liveListing ? (
        <>
          <div className="artifact-market-price"><strong>{formatWeiAsEth(listing.priceWei)} ETH</strong><span>FIXED PRICE</span></div>
          <dl>
            <div><dt>SELLER</dt><dd><a href={`https://etherscan.io/address/${seller}`} target="_blank" rel="noreferrer">{shortAddress(seller)}</a></dd></div>
            <div><dt>CUSTODY</dt><dd>{custodyVerified ? 'VERIFIED IN MARKET' : 'VERIFYING…'}</dd></div>
          </dl>
          {!custodyVerified && <p className="artifact-market-note">{snapshot?.custody?.reason || 'Contract custody and the official ownership index are still reconciling.'} Ethscribe checks again automatically; purchase unlocks only after both records agree.</p>}
          {action}
        </>
      ) : (
        <p className="artifact-market-note">{artifact.ethscriptionId ? 'No active fixed-price listing is attached to this artifact.' : 'A marketplace listing can begin after the target is recovered, verified, and Ethscribed.'}</p>
      )}
      {purchase && !['review'].includes(purchase.phase) && (
        <div className={`artifact-purchase-status purchase-${purchase.phase}`} role="status">
          <strong>{purchase.phase === 'simulating' ? 'CHECKING PURCHASE' : purchase.phase === 'mining' ? 'WAITING FOR ETHEREUM' : purchase.phase === 'settling' ? 'UPDATING OWNERSHIP' : purchase.phase === 'complete' ? 'PURCHASE CONFIRMED' : 'PURCHASE NOT COMPLETED'}</strong>
          <p>{purchase.message || (purchase.phase === 'simulating' ? 'Checking the live price and expected transaction before opening your wallet.' : 'The transaction is pending in your wallet and on Ethereum.')}</p>
          {purchase.hash && <a href={`https://etherscan.io/tx/${purchase.hash}`} target="_blank" rel="noreferrer">VIEW TRANSACTION</a>}
        </div>
      )}
    </section>
  );
}

function ArtifactDetail({ artifact, account, chainId, connectWallet, switchToMainnet, provider, onFindingPublished }) {
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const hasFinding = Boolean(artifact.ethscriptionId);
  const statusCopy = {
    secured: 'ETHSCRIBED · VERIFIED MATCH',
    open: 'OPEN HUNT · NEEDS ETHSCRIBING',
    lost: 'ORIGINAL BYTES UNKNOWN',
  };

  return (
    <article className={`artifact-detail detail-${artifact.status}`} aria-live="polite">
      <div className="artifact-detail-overview">
        <div className="artifact-detail-visual">
          <ArtifactPreview artifact={artifact} />
          {artifact.status === 'secured' && (
            <p className="display-scale-note">
              {isSmallArtifact(artifact) ? 'PREVIEW ENLARGED WITH NEAREST-NEIGHBOR SCALING' : 'PREVIEW SCALED FOR INSPECTION'}<br />
              NATIVE {artifact.dimensions}
            </p>
          )}
        </div>
        <div className="artifact-detail-summary">
        <div className="detail-heading">
          <div><p>{artifact.date} / {artifact.release}</p><h3>{artifact.filename}</h3></div>
          <span className={`artifact-state state-${artifact.status}`}>{statusCopy[artifact.status]}</span>
        </div>
        <p className="artifact-note">{artifact.note}</p>

        {artifact.status === 'lost' && (
          <div className="unknown-byte-note">
            <strong>This slot has no target hash yet.</strong>
            <p>We know the filename and description from Satoshi’s post, but not the original payload. A candidate becomes meaningful only with a reproducible custody trail.</p>
          </div>
        )}

        {hasFinding ? (
          <ArtifactMarketPanel
            artifact={artifact}
            account={account}
            chainId={chainId}
            connectWallet={connectWallet}
            switchToMainnet={switchToMainnet}
            provider={provider}
          />
        ) : (
          <section className="artifact-target-information">
            <h4><span>01</span> File information</h4>
            <dl className="artifact-record-grid compact-record-grid">
              <RecordFact label="FORMAT" value={artifact.format} />
              <RecordFact label="NATIVE DIMENSIONS" value={artifact.dimensions} />
              <RecordFact label="EXPECTED FILE SIZE" value={artifact.bytes ? formatBytes(artifact.bytes) : null} />
              <RecordFact label="SOURCE CLUE" value={artifact.sourceLabel} className="record-fact-wide" />
            </dl>
            {artifact.validationMode === 'exact' && (
              <div className="sealed-target-note">
                <strong>EXPECTED SHA-256 SEALED WHILE THE HUNT IS OPEN</strong>
                <p>A candidate is hashed locally and checked against the private target commitment. The expected hash is published only after the first accepted Finding.</p>
              </div>
            )}
          </section>
        )}
        </div>
      </div>

      {hasFinding && (
        <div className="artifact-record-shell artifact-found-record">
          <section className="artifact-record-section artifact-file-section">
            <h4><span>01</span> File information</h4>
            <dl className="artifact-record-grid compact-record-grid">
              <RecordFact label="FORMAT" value={artifact.format} />
              <RecordFact label="RAW FILE SIZE" value={formatBytes(artifact.bytes)} />
              <RecordFact label="DECODED RAW FILE SHA-256" value={artifact.sha256} className="record-fact-wide" />
            </dl>
          </section>
          <section className="artifact-record-section artifact-transaction-section">
            <h4><span>02</span> Ethscription transaction</h4>
            <dl className="artifact-record-grid">
              <div className="record-fact record-fact-wide">
                <dt>ETHSCRIPTION ID / CREATION TRANSACTION</dt>
                <dd className="linked-record-value">
                  <a href={`https://etherscan.io/tx/${artifact.ethscriptionId}`} target="_blank" rel="noreferrer">{artifact.ethscriptionId}</a>
                  <span><a href={`https://ethscriptions.com/ethscriptions/${artifact.ethscriptionId}`} target="_blank" rel="noreferrer">View Ethscription <ArrowIcon /></a></span>
                </dd>
              </div>
              <RecordFact label="ETHSCRIBED" value={artifact.ethscribedAt} />
              <div className="record-fact">
                <dt>ETHSCRIBING WALLET</dt>
                <dd>{artifact.creator ? <a href={`https://etherscan.io/address/${artifact.creator}`} target="_blank" rel="noreferrer">{artifact.creator}</a> : 'Unknown'}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {!hasFinding && (
        <div className="artifact-detail-below">
          {!submissionOpen ? (
            <button className="finding-launcher" type="button" aria-expanded="false" onClick={() => setSubmissionOpen(true)}>
              <span>SUBMIT A FINDING</span><strong>Test a file or an Ethscription against this target.</strong><ArrowIcon />
            </button>
          ) : (
            <TargetSubmission
              artifact={artifact}
              account={account}
              chainId={chainId}
              connectWallet={connectWallet}
              switchToMainnet={switchToMainnet}
              provider={provider}
              onFindingPublished={onFindingPublished}
              onClose={() => setSubmissionOpen(false)}
            />
          )}
        </div>
      )}
    </article>
  );
}

function MethodSection() {
  return (
    <section className="method-section" id="method">
      <div className="section-heading compact">
        <div><p className="kicker"><span /> The field method</p><h2>History deserves proof.</h2></div>
        <p className="section-intro">Every expedition defines its evidence standard before the hunt begins. Exact-byte targets use sealed server-side commitments while open; unknown history stays unresolved until the source evidence is strong enough.</p>
      </div>
      <div className="process-grid">
        {processSteps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}
      </div>
      <div className="principle-note">
        <strong>FIRST COME. FIRST SCRIBE.</strong>
        <p>Each target fixes one canonical wrapper around the original bytes. The Ethscriptions protocol recognizes that exact payload only once; Ethscribe also hashes the decoded file so alternate wrappers cannot impersonate a second historical original.</p>
      </div>
    </section>
  );
}

function HomePage({ account, walletState, walletName, ensName, connectWallet, openAccountModal, resolvedStats = huntStats }) {
  return (
    <div className="site-shell home-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} ensName={ensName} connectWallet={connectWallet} openAccountModal={openAccountModal} />
      <main id="top">
        <section className="hero mission-hero">
          <div className="hero-copy">
            <p className="kicker"><span /> Ownable digital archaeology</p>
            <h1>Find the bytes. Establish the provenance. Own the artifact.</h1>
            <p className="hero-intro">Ethscribe turns historically significant digital files into Accessions—recognized, transferable onchain artifacts backed by public evidence. For each expedition’s canonical payload, the protocol recognizes one first inscription: first come, first scribe.</p>
            <div className="hero-actions">
              <a className="primary-action" href={EXPEDITION_PATH}>Enter Expedition 001 <ArrowIcon /></a>
              <a className="text-action" href="/docs">New here? Learn how Ethscribe works <ArrowIcon /></a>
            </div>
          </div>

          <div className="mission-index" aria-label="A digital artifact moving from discovery to verified record">
            <div className="index-heading"><span>ETHSCRIBE FIELD INDEX</span><span>∞ / OPEN</span></div>
            <div className="index-object object-source"><span>01 / DISCOVER</span><strong>ORIGINAL SOURCE</strong><code>archive · disk · code · network</code></div>
            <div className="index-connector">↓</div>
            <div className="index-object object-proof"><span>02 / AUTHENTICATE</span><strong>BYTE-PERFECT MATCH</strong><code>sha256: 7f3a…e921</code></div>
            <div className="index-connector">↓</div>
            <div className="index-object object-record"><span>03 / FIRST SCRIBE</span><strong>OWNABLE ORIGINAL</strong><code>ethereum · provenance · custody</code></div>
            <p>THE ARTIFACT IS THE BYTES.<br />THE STORY IS THE EVIDENCE.</p>
          </div>
        </section>

        <section className="ticker" aria-label="Ethscribe scope">
          <div>PRE-INTERNET SOFTWARE</div><span>✦</span><div>EARLY WEB</div><span>✦</span><div>DIGITAL CULTURE</div><span>✦</span><div>ONCHAIN PROVENANCE</div>
        </section>

        <section className="mission-section" id="mission">
          <div className="section-heading compact mission-heading">
            <div><p className="kicker"><span /> The site mission</p><h2>A living museum built through public hunts.</h2></div>
            <p className="section-intro">Ethscribe organizes focused expeditions around artifacts worth recovering. Researchers follow evidence, exact matches earn a place in the permanent catalogue, and the verified object can become ownable without confusing ownership for historical truth.</p>
          </div>
          <div className="mission-pillars">
            <article><span>01</span><h3>Hunt together</h3><p>Time-boxed expeditions turn open questions and known collection gaps into approachable public fieldwork.</p></article>
            <article><span>02</span><h3>Verify exactly</h3><p>Primary sources establish the story. Raw-byte hashes establish whether the recovered file is the target.</p></article>
            <article><span>03</span><h3>Preserve and own</h3><p>The first canonical inscription becomes the singular onchain artifact. Its owner may change; its byte-perfect identity and provenance remain public.</p></article>
          </div>
        </section>

        <MethodSection />

        <section className="featured-expedition" id="expeditions">
          <div className="featured-visual">
            <img src={referenceImage} alt="Satoshi Nakamoto’s secured 2010 Bitcoin icon" />
          </div>
          <div className="featured-copy">
            <p className="kicker"><span /> Expedition 001 · Active</p>
            <h2>The Lost Pixels of Satoshi</h2>
            <p>The inaugural expedition maps Satoshi’s 2009–2010 icon workshop. Each slot seeks one canonical Ethscription of artwork shaped by Satoshi’s own hand—an exact onchain original that cannot be claimed twice.</p>
            <dl>
              <div><dt>ETHSCRIBED</dt><dd>{resolvedStats.secured}</dd></div>
              <div><dt>KNOWN GAPS</dt><dd>{resolvedStats.open}</dd></div>
              <div><dt>LOST ARTIFACT</dt><dd>{resolvedStats.lost}</dd></div>
            </dl>
            <a className="primary-action" href={EXPEDITION_PATH}>Open the expedition <ArrowIcon /></a>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}

function ExpeditionsPage({ account, walletState, walletName, ensName, connectWallet, openAccountModal, resolvedStats = huntStats }) {
  return (
    <div className="site-shell expeditions-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} ensName={ensName} connectWallet={connectWallet} openAccountModal={openAccountModal} expeditions />
      <main id="top">
        <section className="expeditions-index-hero">
          <div><p className="kicker"><span /> Public fieldwork</p><h1>Expeditions</h1></div>
          <div className="expeditions-index-actions">
            <p>Focused hunts for historically significant files—defined before the search, verified byte by byte, and preserved as singular onchain artifacts.</p>
            <a className="primary-action" href="#live-expeditions">Enter the live expedition <ArrowIcon /></a>
          </div>
        </section>

        <section className="expedition-index-list" id="live-expeditions" aria-label="Live expeditions">
          <p className="card-index expedition-archive-label">LIVE NOW / EXPEDITION 001</p>
          <a className="expedition-index-card" href={EXPEDITION_PATH}>
            <div className="expedition-index-visual"><img src={referenceImage} alt="Satoshi Nakamoto’s secured 2010 Bitcoin icon" /><span>EXPEDITION 001</span></div>
            <div className="expedition-index-copy">
              <div className="expedition-index-meta"><span className="expedition-active-status">ACTIVE</span><span>BITCOIN · 2008–2010</span></div>
              <h3>The Lost Pixels of Satoshi</h3>
              <p>Complete the exact-file record behind Satoshi’s first two Bitcoin icon systems—and recover one attested PNG whose original bytes remain lost.</p>
              <dl>
                <div><dt>ETHSCRIBED</dt><dd>{resolvedStats.secured} / {resolvedStats.known}</dd></div>
                <div><dt>KNOWN-BYTE GAPS</dt><dd>{resolvedStats.open}</dd></div>
                <div><dt>LOST-BYTE TARGETS</dt><dd>{resolvedStats.lost}</dd></div>
              </dl>
              <strong>OPEN EXPEDITION <ArrowIcon /></strong>
            </div>
          </a>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}

function ExpeditionPage({ account, walletState, walletName, ensName, connectWallet, openAccountModal, chainId, switchToMainnet, provider, resolvedArtifacts = artifacts, resolvedStats = huntStats, onFindingPublished }) {
  const requestedArtifactId = new URLSearchParams(window.location.search).get('artifact');
  const artifactForId = (id) => (id === lostArtifact.id ? lostArtifact : resolvedArtifacts.find((artifact) => artifact.id === id));
  const [selectedArtifactId, setSelectedArtifactId] = useState(
    artifactForId(requestedArtifactId) ? requestedArtifactId : lostArtifact.id,
  );

  useEffect(() => {
    if (!artifactForId(requestedArtifactId)) return undefined;

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`record-${requestedArtifactId}`)?.scrollIntoView?.({ block: 'start' });
    }, 0);

    return () => window.clearTimeout(scrollTimer);
  }, [requestedArtifactId]);

  const selectArtifact = (artifactId) => {
    setSelectedArtifactId((current) => {
      const nextArtifactId = current === artifactId ? null : artifactId;
      const nextUrl = new URL(window.location.href);

      if (nextArtifactId) nextUrl.searchParams.set('artifact', nextArtifactId);
      else nextUrl.searchParams.delete('artifact');
      window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

      return nextArtifactId;
    });
  };

  const openArtifactFromGrid = (artifactId) => {
    setSelectedArtifactId(artifactId);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('artifact', artifactId);
    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}#record-${artifactId}`);
    window.setTimeout(() => document.getElementById(`record-${artifactId}`)?.scrollIntoView?.({ block: 'start' }), 0);
  };

  return (
    <div className="site-shell expedition-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} ensName={ensName} connectWallet={connectWallet} openAccountModal={openAccountModal} expedition />
      <main id="top">
        <section className="expedition-hero" id="expedition">
          <div className="expedition-hero-copy">
            <p className="page-breadcrumb"><a href="/">ETHSCRIBE</a><span>/</span>EXPEDITION 001</p>
            <p className="kicker"><span /> Active digital archaeology hunt</p>
            <h1>The Lost Pixels of Satoshi</h1>
            <p>Twenty-two exact files trace Satoshi’s first two Bitcoin icon systems. Each canonical payload has room for one first Ethscription—one ownable, byte-perfect artifact made from Satoshi’s original pixels.</p>
            <div className="expedition-hero-brief">
              <p><strong>{resolvedStats.secured} / {resolvedStats.known}</strong><span>KNOWN FILES SECURED</span></p>
              <p><strong>ONE LOST ORIGINAL</strong><span>Satoshi’s attested 20 × 20 transparent PNG remains the expedition’s open archaeological mystery.</span></p>
            </div>
            <a className="primary-action" href="#timeline">Open the field record <ArrowIcon /></a>
          </div>
          <ExpeditionCorpusGrid resolvedArtifacts={resolvedArtifacts} onOpenArtifact={openArtifactFromGrid} />
        </section>

        <section className="hunt-section expedition-record-section">
          <section className="timeline-section" id="timeline" aria-labelledby="timeline-title">
            <div className="timeline-heading">
              <div><p className="card-index">EXPEDITION TIMELINE / 2008–2010</p><h3 id="timeline-title">Every target, in context.</h3></div>
              <p><strong>Green files are already Ethscribed.</strong> White files still need Ethscribing. Select any file to expand its complete evidence and byte record directly beneath that moment.</p>
            </div>

            <div className="timeline-legend" aria-label="Timeline status legend">
              <span className="legend-secured">ETHSCRIBED</span><span className="legend-open">NOT YET ETHSCRIBED</span>
            </div>

            <div className="artifact-timeline">
              {timelineEvents.map((event) => {
                const selectedInEvent = event.artifactIds.includes(selectedArtifactId);
                const selectedArtifact = selectedInEvent ? artifactForId(selectedArtifactId) : null;

                return (
                  <article className="timeline-event" key={event.id}>
                    <div className="timeline-marker"><span /></div>
                    <div className="timeline-event-content">
                      <div className="timeline-event-copy">
                        <time>{event.date}</time><h4>{event.title}</h4><p>{event.copy}</p>
                        {event.artifactIds.length > 0 && (
                          <div className="artifact-chips">
                            {event.artifactIds.map((artifactId) => {
                              const artifact = artifactForId(artifactId);
                              const isSelected = selectedArtifactId === artifact.id;
                              return (
                                <button className={`artifact-chip chip-${artifact.status}`} type="button" key={artifact.id} aria-expanded={isSelected} aria-controls={`record-${artifact.id}`} onClick={() => selectArtifact(artifact.id)}>
                                  <span>{artifact.format}</span><strong>{artifact.filename}</strong>{artifact.status === 'lost' && <em>BYTES UNKNOWN</em>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {selectedArtifact && (
                        <div className="timeline-expanded" id={`record-${selectedArtifact.id}`}>
                          <ArtifactDetail
                            key={selectedArtifact.id}
                            artifact={selectedArtifact}
                            account={account}
                            chainId={chainId}
                            connectWallet={connectWallet}
                            switchToMainnet={switchToMainnet}
                            provider={provider}
                            onFindingPublished={onFindingPublished}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer id="site-footer">
      <img src="/icon.svg" alt="Ethscribe" /><p>Find the bytes. Establish the provenance. Own the artifact.</p>
      <a className="footer-docs-link" href="/docs">Docs</a><span>© 2026 ETHSCRIBE</span>
    </footer>
  );
}

function App() {
  const walletSession = useEthscribeWallet();
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const [verifiedFindings, setVerifiedFindings] = useState([]);
  const [findingIndexState, setFindingIndexState] = useState('idle');
  const {
    account,
    chainId,
    walletState,
    walletName,
    ensName,
    provider,
    connectWallet,
    openAccountModal,
  } = walletSession;
  const resolvedArtifacts = useMemo(
    () => mergeVerifiedFindings(artifacts, verifiedFindings),
    [verifiedFindings],
  );
  const resolvedStats = useMemo(
    () => statsForArtifacts(resolvedArtifacts, huntStats),
    [resolvedArtifacts],
  );

  useEffect(() => {
    if (!['/', '/expeditions', '/wallet', EXPEDITION_PATH].includes(pathname)) return undefined;
    let active = true;
    setFindingIndexState('loading');
    fetchVerifiedFindings()
      .then((records) => {
        if (active) {
          setVerifiedFindings(records);
          setFindingIndexState('ready');
        }
      })
      .catch(() => {
        // The immutable manifest remains usable when the public Finding index is unavailable.
        if (active) setFindingIndexState('error');
      });
    return () => { active = false; };
  }, [pathname]);

  const recordPublishedFinding = (finding) => {
    if (!finding?.findingId) return;
    setVerifiedFindings((current) => [finding, ...current.filter((item) => item.findingId !== finding.findingId)]);
    setFindingIndexState('ready');
  };
  const [modal, setModal] = useState(null);
  const isExpedition = pathname === EXPEDITION_PATH;
  const isLegacyProposalPath = pathname === '/expeditions/propose';
  const isExpeditions = pathname === '/expeditions' || isLegacyProposalPath;
  const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
  const isWallet = pathname === '/wallet';

  useEffect(() => {
    if (isLegacyProposalPath) window.history.replaceState({}, '', '/expeditions');
  }, [isLegacyProposalPath]);

  useEffect(() => {
    if (isDocs) return;
    document.title = isWallet
      ? 'Wallet — Ethscribe'
      : isExpeditions
        ? 'Expeditions — Ethscribe'
      : isExpedition
        ? 'The Lost Pixels of Satoshi — Ethscribe Expedition 001'
        : 'Ethscribe — Ownable Digital Archaeology';
  }, [isDocs, isExpedition, isExpeditions, isWallet]);

  const switchToMainnet = async () => {
    try {
      await walletSession.switchToMainnet();
    } catch (error) {
      if (error?.code !== 4001) setModal('network-error');
    }
  };

  const pageProps = {
    account,
    walletState,
    walletName,
    ensName,
    openAccountModal,
    connectWallet,
    chainId,
    switchToMainnet,
    provider,
    resolvedArtifacts,
    resolvedStats,
    onFindingPublished: recordPublishedFinding,
  };
  const headerProps = { account, walletState, walletName, ensName, connectWallet, openAccountModal };

  return (
    <>
      {isDocs
        ? <DocsPage header={<SiteHeader {...pageProps} docs />} footer={<SiteFooter />} />
        : isWallet
          ? <WalletPage
              account={account}
              chainId={chainId}
              connectWallet={connectWallet}
              switchToMainnet={switchToMainnet}
              provider={provider}
              resolvedFindings={verifiedFindings}
              findingIndexState={findingIndexState}
              header={<SiteHeader {...headerProps} wallet />}
              footer={<SiteFooter />}
            />
          : isExpeditions
              ? <ExpeditionsPage {...pageProps} />
            : isExpedition ? <ExpeditionPage {...pageProps} /> : <HomePage {...pageProps} />}
      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section className="participation-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">×</button>

            {modal === 'network-error' && <><p className="kicker"><span /> Network change failed</p><h2 id="modal-title">Ethereum mainnet was not selected.</h2><p>The wallet view remains read-only, but marketplace transactions will require Ethereum mainnet. Switch networks in your wallet and try again.</p><button className="primary-action" type="button" onClick={switchToMainnet}>Try again <ArrowIcon /></button></>}

          </section>
        </div>
      )}
    </>
  );
}

export default App;
