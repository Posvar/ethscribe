import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './refinements.css';
import DocsPage from './DocsPage';
import ExpeditionCard from './ExpeditionCard';
import EthscribeWorkbench from './EthscribeWorkbench';
import RecognizedArtifactDeposit from './RecognizedArtifactDeposit';
import { matchesArtifactRecord } from './artifactIdentity';
import XpmPreview from './XpmPreview';
import { artifactById, artifacts, huntStats, lostArtifact, timelineEvents } from './huntData';
import { fetchVerifiedFindings, mergeVerifiedFindings, reconcileFindingSnapshot, retainPublishedFinding, statsForArtifacts } from './findingApi';
import { fetchArtifactMarket, fetchWalletInventory } from './marketApi';
import { MAINNET_CHAIN_ID, MARKET_ADDRESS } from './marketConfig';
import {
  buildBuyTransaction,
  friendlyTransactionError,
  simulateAndSendTransaction,
  waitForTransactionReceipt,
} from './marketTransactions';
import { useEthscribeWallet } from './useEthscribeWallet';

// Unreleased research pages and their reference bytes are absent from builds.
// These optional files also stay out of the public repository until approved.
const localExpeditionModules = import.meta.env.DEV ? import.meta.glob('./localExpeditions.jsx') : {};
const loadLocalExpedition = localExpeditionModules['./localExpeditions.jsx'];
const LocalExpedition = loadLocalExpedition ? lazy(loadLocalExpedition) : null;
const LocalExpeditionCards = loadLocalExpedition ? lazy(() => loadLocalExpedition().then(module => ({ default: module.LocalExpeditionCards }))) : null;
const EburpExpedition = lazy(() => import('./EburpExpedition.jsx'));
const EburpCard = lazy(() => import('./EburpExpedition.jsx').then(module => ({ default: module.EburpCard })));
const EburpWallet = lazy(() => import('./EburpWallet'));

const loadSoundExpedition = () => Promise.all([import('./SoundExpeditionPage'), import('./soundExpedition')]);
const SoundExpedition = lazy(() => loadSoundExpedition().then(([ui, data]) => ({
  default: function SoundExpeditionView({ headerProps, pageProps, findings, findingIndexState }) {
    const targets = useMemo(() => mergeVerifiedFindings(data.soundExpedition.targets, findings), [findings]);
    const expedition = { ...data.soundExpedition, targets };
    return <ui.default
      expedition={expedition}
      findingIndexState={findingIndexState}
      onFindingPublished={pageProps.onFindingPublished}
      renderSubmission={({ artifact, onClose, onFindingPublished }) => <TargetSubmission {...pageProps} artifact={artifact} onClose={onClose} onFindingPublished={onFindingPublished} />}
      renderMarket={({ artifact }) => <ArtifactMarketPanel {...pageProps} artifact={artifact} />}
      header={<SiteHeader {...headerProps} expedition expeditionMeta={{ ...expedition, path: `/expeditions/${expedition.slug}` }} />}
      footer={<SiteFooter />}
    />;
  },
})));
const SoundExpeditionDirectoryCard = lazy(() => loadSoundExpedition().then(([ui, data]) => ({
  default: function SoundDirectoryCard({ findings }) {
    const targets = useMemo(() => mergeVerifiedFindings(data.soundExpedition.targets, findings), [findings]);
    return <ui.SoundExpeditionCard expedition={{ ...data.soundExpedition, targets }} />;
  },
})));

const EXPEDITION_PATH = '/expeditions/lost-pixels-of-satoshi';
const SOUND_EXPEDITION_ID = 'youve-got-history';
const SOUND_EXPEDITION_PATH = `/expeditions/${SOUND_EXPEDITION_ID}`;
const referenceImage = artifactById('new-png-48').previewUrl;

const processSteps = [
  { number: '01', title: 'Define the target', body: 'A hunt begins with a culturally significant artifact and a precise definition of what counts.' },
  { number: '02', title: 'Follow the source', body: 'Researchers work from release archives, source commits, and contemporaneous records—not visual resemblance.' },
  { number: '03', title: 'Prove the bytes', body: 'Exact decoded bytes are matched by hash. A line ending, metadata rewrite, or reconstruction is a different artifact.' },
  { number: '04', title: 'Preserve the record', body: 'The catalogue brings the file and its evidence together. Its Ethscription records creation and transfers on Ethereum.' },
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

function formatWeiAsEth(value) {
  try {
    const wei = BigInt(value || 0);
    const whole = wei / 10n ** 18n;
    const fraction = (wei % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '');
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

function SiteHeader({ account, walletState, walletName, ensName, connectWallet, openAccountModal, expedition = false, expeditionMeta = null, expeditions = false, docs = false, wallet = false }) {
  const awayFromHome = expedition || expeditions || docs || wallet;
  const expeditionsActive = expedition || expeditions;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
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
      <a className="skip-link" href="#main-content" onClick={() => {
        const main = document.querySelector('main');
        main?.focus();
      }}>Skip to content</a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Ethscribe home"><img src="/newicon.svg" alt="" /><span className="brand-wordmark">ETHSCRI.BE</span></a>
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
          ref={menuToggle}
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
          <a href="/expeditions">EXPEDITIONS</a><span>└─</span><a href={expeditionMeta?.path || EXPEDITION_PATH} aria-current="page">{expeditionMeta ? `EXPEDITION ${expeditionMeta.id}: ${expeditionMeta.title.toUpperCase()}` : 'EXPEDITION 001: THE LOST PIXELS OF SATOSHI'}</a>
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
            aria-label={`Open field note for ${artifact.filename}, ${artifact.status === 'secured' ? 'Ethscribed' : 'not yet Ethscribed'}, ${artifact.date}`}
            title={`${artifact.filename} · ${artifact.date} · ${artifact.release}`}
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
        <button type="button" aria-pressed={source === 'upload'} className={source === 'upload' ? 'active' : ''} onClick={() => chooseSource('upload')}>UPLOAD EXACT FILE</button>
        <button type="button" aria-pressed={source === 'existing'} className={source === 'existing' ? 'active' : ''} onClick={() => chooseSource('existing')}>USE EXISTING ETHSCRIPTION</button>
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
          key={`${artifact.expeditionId || 'lost-pixels-of-satoshi'}-${artifact.id}-${source}-${selectedEthscriptionId}-${account}`}
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

function ArtifactMarketPanel({ artifact, account, chainId, connectWallet, switchToMainnet, provider, onRecord, readOnlyArtifact = false }) {
  const [snapshot, setSnapshot] = useState(null);
  const [marketState, setMarketState] = useState(artifact.ethscriptionId ? 'loading' : 'idle');
  const [purchase, setPurchase] = useState(null);
  const requestVersion = useRef(0);
  const activeAsset = useRef(artifact.ethscriptionId);
  const activeSession = useRef('');
  activeAsset.current = artifact.ethscriptionId;
  activeSession.current = `${account?.toLowerCase() || ''}:${chainId?.toLowerCase() || ''}`;

  const loadMarket = useCallback(async ({ quiet = false } = {}) => {
    if (!artifact.ethscriptionId) return null;
    const version = ++requestVersion.current;
    if (!quiet) setMarketState('loading');
    try {
      const nextSnapshot = await fetchArtifactMarket(artifact.ethscriptionId);
      if (version !== requestVersion.current || activeAsset.current !== artifact.ethscriptionId) return null;
      if (!matchesArtifactRecord(nextSnapshot.ethscription, artifact)) throw new Error('Artifact record or payload mismatch');
      setSnapshot(nextSnapshot);
      setMarketState('ready');
      onRecord?.(nextSnapshot.ethscription);
      return nextSnapshot;
    } catch {
      if (version === requestVersion.current) {
        setSnapshot(null);
        setMarketState('error');
        onRecord?.(null);
      }
      return null;
    }
  }, [artifact.ethscriptionId, artifact.recordProtocolSha256, onRecord]);

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
      requestVersion.current += 1;
      clearInterval(timer);
    };
  }, [artifact.ethscriptionId, loadMarket]);

  const listing = snapshot?.listing;
  const liveListing = Boolean(listing?.active && !listing?.expired);
  const custodyVerified = Boolean(snapshot?.custody?.verified);
  const seller = snapshot?.seller;
  const isSeller = Boolean(account && seller && account.toLowerCase() === seller.toLowerCase());
  const hasCurrentRecord = snapshot?.ethscription?.transactionHash?.toLowerCase() === artifact.ethscriptionId?.toLowerCase();
  const inMarketplace = hasCurrentRecord && snapshot?.ethscription?.currentOwner?.toLowerCase() === MARKET_ADDRESS.toLowerCase();
  const inLegacyEburpVault = artifact.collectionGroup === 'core'
    && snapshot?.ethscription?.currentOwner?.toLowerCase() === '0x719a411555ec93a896cf64dc07db72883fb57144';
  const onMainnet = chainId?.toLowerCase() === MAINNET_CHAIN_ID;
  const transactionBusy = purchase && ['simulating', 'mining', 'settling'].includes(purchase.phase);

  useEffect(() => {
    setPurchase((current) => current?.phase === 'review' ? null : current);
  }, [account, chainId, listing?.priceWei, listing?.listingNonce]);

  useEffect(() => {
    if (purchase?.phase !== 'settling' || !purchase.buyer) return;
    if (snapshot?.ethscription?.currentOwner?.toLowerCase() === purchase.buyer.toLowerCase()) {
      setPurchase((current) => ({ ...current, phase: 'complete', message: 'Purchase confirmed. The official ownership record now shows your wallet.' }));
    }
  }, [snapshot, purchase?.phase, purchase?.buyer]);

  const buyListing = async () => {
    if (readOnlyArtifact || !account || !seller || !liveListing || !custodyVerified || marketState !== 'ready' || transactionBusy
      || snapshot?.market?.transactionsEnabled === false || snapshot?.market?.intakeEnabled === false || snapshot?.market?.paused) return;
    const session = activeSession.current;
    setPurchase({ phase: 'simulating', hash: '', message: '' });
    try {
      const fresh = await loadMarket({ quiet: true });
      if (session !== activeSession.current) {
        setPurchase({ phase: 'error', hash: '', message: 'The connected wallet or network changed. No purchase was sent. Review the listing again with the wallet you want to use.' });
        return;
      }
      if (!fresh || !fresh.custody?.verified || fresh.market?.transactionsEnabled === false || fresh.market?.intakeEnabled === false || fresh.market?.paused
        || !fresh.listing?.active || fresh.listing?.expired
        || fresh.seller?.toLowerCase() !== seller.toLowerCase()
        || fresh.listing.listingNonce !== listing.listingNonce || fresh.listing.priceWei !== listing.priceWei) {
        setPurchase({ phase: 'error', hash: '', message: 'The listing changed or could not be verified. No purchase was sent. Review the current listing before trying again.' });
        return;
      }
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
      setPurchase({ phase: 'settling', hash, buyer: account, message: 'Purchase confirmed on Ethereum. The ownership index is catching up; we check again every 15 seconds. No further transaction is needed.' });
      await loadMarket({ quiet: true });
    } catch (purchaseError) {
      setPurchase((current) => ({
        phase: 'error',
        hash: current?.hash || '',
        message: friendlyTransactionError(purchaseError),
      }));
    }
  };

  const action = (() => {
    if (!artifact.ethscriptionId || marketState !== 'ready') return null;
    if (!liveListing) {
      if (isSeller && inMarketplace) return <a className="artifact-market-action" href="/wallet">MANAGE IN FIELD WALLET <ArrowIcon /></a>;
      if (!account && hasCurrentRecord) return <button className="artifact-market-action" type="button" onClick={connectWallet}>CONNECT WALLET TO MANAGE <ArrowIcon /></button>;
      return null;
    }
    if (isSeller) return <a className="artifact-market-action" href="/wallet">MANAGE IN FIELD WALLET <ArrowIcon /></a>;
    if (marketState !== 'ready' || !custodyVerified || snapshot?.market?.transactionsEnabled === false
      || snapshot?.market?.intakeEnabled === false || snapshot?.market?.paused || purchase?.phase === 'complete') return null;
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

  if (readOnlyArtifact) {
    return <div className="artifact-market-note" role="status">
      {marketState === 'loading' ? 'Checking the current ownership record…' : marketState === 'error'
        ? <><p>Current ownership could not be verified. No historical wallet snapshot is shown in its place.</p><button className="artifact-market-retry" type="button" onClick={() => loadMarket()}>Retry ownership check</button></>
        : 'Burned Archive · preserved for the record, not offered for trading.'}
    </div>;
  }

  return (
    <section className={`artifact-market-card${liveListing ? ' has-listing' : ''}`} aria-label="Marketplace listing">
      <div className="artifact-market-heading">
        <span>MARKETPLACE</span>
        <strong>{marketState === 'loading' ? 'CHECKING LISTING…' : marketState === 'error' ? 'LISTING UNAVAILABLE' : liveListing ? 'ACTIVE LISTING' : 'NOT LISTED'}</strong>
      </div>
      {marketState === 'error' ? (
        <div className="artifact-market-note" role="status"><p>We couldn’t refresh ownership and listing details. Transactions are disabled until current records are available.</p><button className="artifact-market-retry" type="button" onClick={() => loadMarket()}>Retry listing check</button></div>
      ) : marketState === 'loading' && !snapshot ? <p className="artifact-market-note" role="status">Reading the current price and custody record…</p> : liveListing ? (
        <>
          <div className="artifact-market-price"><strong>{formatWeiAsEth(listing.priceWei)} ETH</strong><span>FIXED PRICE</span></div>
          <dl>
            <div><dt>SELLER</dt><dd><a href={`https://etherscan.io/address/${seller}`} target="_blank" rel="noreferrer">{shortAddress(seller)}</a></dd></div>
            <div><dt>CUSTODY</dt><dd>{custodyVerified ? 'VERIFIED IN MARKET' : 'VERIFYING…'}</dd></div>
          </dl>
          {!custodyVerified && <p className="artifact-market-note">{snapshot?.custody?.reason || 'Contract custody and the official ownership index are still reconciling.'} Ethscribe checks again automatically; purchase unlocks only after both records agree.</p>}
          {action}
          {snapshot?.market?.localPreview && <p className="artifact-market-note">Live listing · read-only local preview. No purchases can be sent from this preview.</p>}
          {!snapshot?.market?.localPreview && (snapshot?.market?.paused || snapshot?.market?.intakeEnabled === false) && <p className="artifact-market-note">Purchases are temporarily unavailable. This listing will be checked again automatically.</p>}
        </>
      ) : (
        <>
          <p className="artifact-market-note">{isSeller && inMarketplace
            ? 'This artifact is in your marketplace custody, but not listed for sale. Set a price or withdraw it from Field Wallet.'
            : 'This artifact is already Ethscribed, but not listed for sale.'}</p>
          {!account && hasCurrentRecord && <p className="artifact-market-note">Own this artifact? Connect its current wallet to deposit or manage it.</p>}
          {action}
        </>
      )}
      {inLegacyEburpVault && <p className="artifact-market-note">This Ethscription is still held by the original EBURP vault. It must be withdrawn to your wallet through that vault’s supported flow before you can deposit it here. Connecting a wallet does not transfer control of the old vault.</p>}
      <RecognizedArtifactDeposit
        artifact={artifact}
        snapshot={marketState === 'ready' ? snapshot : null}
        account={account}
        chainId={chainId}
        provider={provider}
        switchToMainnet={switchToMainnet}
        onDeposited={() => loadMarket({ quiet: true })}
      />
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
  const [indexedRecord, setIndexedRecord] = useState(null);
  const hasFinding = Boolean(artifact.ethscriptionId);
  const creator = indexedRecord?.creator || artifact.creator;
  const createdAt = indexedRecord?.blockTimestamp > 0
    ? `${new Date(indexedRecord.blockTimestamp * 1000).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC`
    : artifact.ethscribedAt;
  const statusCopy = {
    secured: 'ETHSCRIBED · VERIFIED MATCH',
    open: 'OPEN HUNT · NEEDS ETHSCRIBING',
    lost: 'ORIGINAL BYTES UNKNOWN',
  };

  return (
    <article className={`artifact-detail detail-${artifact.status}`}>
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
            <p>We know the filename and description from Satoshi’s post, but not the original file. Bring an archived copy and evidence of where it came from. A matching size or appearance alone is not proof.</p>
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
            onRecord={setIndexedRecord}
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
                <p>Find your candidate in the historical source, then test it here for free. We compare its exact bytes to our reference file without revealing the answer. The reference hash becomes public after an accepted Finding.</p>
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
              <RecordFact label="ETHSCRIBED" value={createdAt} unknown="See creation transaction" />
              <div className="record-fact">
                <dt>ETHSCRIBING WALLET</dt>
                <dd>{creator ? <a href={`https://etherscan.io/address/${creator}`} target="_blank" rel="noreferrer">{creator}</a> : 'See creation transaction'}</dd>
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
        <p className="section-intro">A lookalike is not the original file. We follow primary sources, compare exact bytes, and keep an open question open when the evidence is not yet there.</p>
      </div>
      <div className="process-grid">
        {processSteps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}
      </div>
      <div className="principle-note">
        <strong>FIRST COME. FIRST SCRIBE.</strong>
        <p>The Ethscriptions protocol recognizes that exact payload only once—not Ethereum itself. We also compare the underlying file bytes of submitted Findings, so a different file wrapper does not earn a second place in the same target. Owning an Ethscription does not grant copyright or erase other copies of the file.</p>
      </div>
    </section>
  );
}

function HomePage({ account, walletState, walletName, ensName, connectWallet, openAccountModal, resolvedStats = huntStats }) {
  return (
    <div className="site-shell home-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} ensName={ensName} connectWallet={connectWallet} openAccountModal={openAccountModal} />
      <main id="main-content" tabIndex={-1}>
        <section className="hero mission-hero">
          <div className="hero-copy">
            <p className="kicker"><span /> Ownable digital archaeology</p>
            <h1>Find the bytes. Establish the provenance. Own the artifact.</h1>
            <p className="hero-intro">Some files deserve more than a forgotten folder. Recover the exact bytes behind digital history, establish where they came from, and preserve them as ownable artifacts on Ethereum.</p>
            <p className="hero-experiment">An open experiment in collecting digital history. Hunt for Satoshi’s lost pixels or the original sounds of going online.</p>
            <div className="hero-actions">
              <a className="primary-action" href="/expeditions">Explore expeditions <ArrowIcon /></a>
              <a className="text-action" href="/docs">New here? Learn how Ethscribe works <ArrowIcon /></a>
            </div>
          </div>

          <div className="mission-index" aria-label="A digital artifact moving from discovery to verified record">
            <div className="index-heading"><span>FROM FILE TO ARTIFACT</span><span>THE FIELD METHOD</span></div>
            <div className="index-object object-source"><span>01 / DISCOVER</span><strong>ORIGINAL SOURCE</strong><code>archive · disk · code · network</code></div>
            <div className="index-connector">↓</div>
            <div className="index-object object-proof"><span>02 / AUTHENTICATE</span><strong>BYTE-PERFECT MATCH</strong><code>same bytes · documented source</code></div>
            <div className="index-connector">↓</div>
            <div className="index-object object-record"><span>03 / FIRST SCRIBE</span><strong>OWNABLE ARTIFACT</strong><code>one canonical Ethscription</code></div>
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
            <article><span>01</span><h3>Hunt together</h3><p>Explore old releases, abandoned websites, and surviving archives. Each expedition gives you a specific piece of digital history to look for.</p></article>
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
            <p>Before Bitcoin had its familiar orange logo, Satoshi was drawing pixels. Recover the exact files from his first two icon systems—and help track down one original PNG that is still missing.</p>
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

function ExpeditionsPage({ account, walletState, walletName, ensName, connectWallet, openAccountModal, resolvedStats = huntStats, soundFindings }) {
  return (
    <div className="site-shell expeditions-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} ensName={ensName} connectWallet={connectWallet} openAccountModal={openAccountModal} expeditions />
      <main id="main-content" tabIndex={-1}>
        <section className="expeditions-index-hero">
          <div><p className="kicker"><span /> Public fieldwork</p><h1>Expeditions</h1></div>
          <div className="expeditions-index-actions">
            <p>Focused hunts for historically significant files—defined before the search, verified byte by byte, and preserved as singular onchain artifacts.</p>
            <a className="primary-action" href="#live-expeditions">Explore the active hunts <ArrowIcon /></a>
          </div>
        </section>

        <section className="expedition-index-list" id="live-expeditions" aria-label="Live expeditions">
          <Suspense fallback={<p role="status">Loading Expedition 002…</p>}><SoundExpeditionDirectoryCard findings={soundFindings} /></Suspense>
          <ExpeditionCard number="001" title="The Lost Pixels of Satoshi" path={EXPEDITION_PATH}
            era="BITCOIN · 2008–2010"
            description="Complete the exact-file record behind Satoshi’s first two Bitcoin icon systems—and recover one attested PNG whose original bytes remain lost."
            recognized={resolvedStats.secured} total={resolvedStats.known} lost={resolvedStats.lost}
            visual={<img src={referenceImage} alt="Satoshi Nakamoto’s secured 2010 Bitcoin icon" />} />
        </section>

        <Suspense fallback={<p role="status">Loading the completed collection…</p>}><EburpCard /></Suspense>
        {import.meta.env.DEV && LocalExpeditionCards && <Suspense fallback={<p role="status">Loading local previews…</p>}><LocalExpeditionCards /></Suspense>}

      </main>
      <SiteFooter />
    </div>
  );
}

function ExpeditionPage({ account, walletState, walletName, ensName, connectWallet, openAccountModal, chainId, switchToMainnet, provider, resolvedArtifacts = artifacts, resolvedStats = huntStats, findingIndexState, onFindingPublished }) {
  const requestedArtifactId = new URLSearchParams(window.location.search).get('artifact');
  const artifactForId = (id) => (id === lostArtifact.id ? lostArtifact : resolvedArtifacts.find((artifact) => artifact.id === id));
  const [selectedArtifactId, setSelectedArtifactId] = useState(
    artifactForId(requestedArtifactId) ? requestedArtifactId : null,
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [copyState, setCopyState] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEvents = timelineEvents.map((event) => ({
    ...event,
    artifactIds: event.artifactIds.filter((id) => {
      const artifact = artifactForId(id);
      return artifact && (filter === 'all' || artifact.status === filter)
        && (!normalizedQuery || `${artifact.filename} ${artifact.format} ${artifact.date} ${artifact.release} ${event.title} ${event.copy}`.toLowerCase().includes(normalizedQuery));
    }),
  })).filter((event) => event.artifactIds.length || (filter === 'all' && !normalizedQuery && !timelineEvents.find((original) => original.id === event.id).artifactIds.length));
  const visibleTargetCount = filteredEvents.reduce((total, event) => total + event.artifactIds.length, 0);

  useEffect(() => {
    if (!artifactForId(requestedArtifactId)) return undefined;

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`record-${requestedArtifactId}`)?.scrollIntoView?.({ block: 'start' });
    }, 0);

    return () => window.clearTimeout(scrollTimer);
  }, [requestedArtifactId]);

  const selectArtifact = (artifactId) => {
    const nextArtifactId = selectedArtifactId === artifactId ? null : artifactId;
    setSelectedArtifactId(nextArtifactId);
    setCopyState('');
    const nextUrl = new URL(window.location.href);
    if (nextArtifactId) nextUrl.searchParams.set('artifact', nextArtifactId);
    else nextUrl.searchParams.delete('artifact');
    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextArtifactId ? `#record-${nextArtifactId}` : '#timeline'}`);
  };

  const openArtifactFromGrid = (artifactId) => {
    setFilter('all');
    setQuery('');
    setCopyState('');
    setSelectedArtifactId(artifactId);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('artifact', artifactId);
    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}#record-${artifactId}`);
    window.setTimeout(() => {
      const record = document.getElementById(`record-${artifactId}`);
      record?.scrollIntoView?.({ block: 'start' });
      record?.focus({ preventScroll: true });
    }, 0);
  };

  const copyRecordLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('artifact', selectedArtifactId);
      url.hash = `record-${selectedArtifactId}`;
      await navigator.clipboard.writeText(url.toString());
      setCopyState('Link copied');
    } catch { setCopyState('Copy the link from your address bar'); }
  };

  return (
    <div className="site-shell expedition-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} ensName={ensName} connectWallet={connectWallet} openAccountModal={openAccountModal} expedition />
      <main id="main-content" tabIndex={-1}>
        <section className="expedition-hero" id="expedition">
          <div className="expedition-hero-copy">
            <p className="page-breadcrumb"><a href="/">ETHSCRIBE</a><span>/</span>EXPEDITION 001</p>
            <p className="kicker"><span /> Active digital archaeology hunt</p>
            <h1>The Lost Pixels of Satoshi</h1>
            <p>Before the orange logo, there were Satoshi’s hand-tuned pixels. Hunt down 22 original files from his first two Bitcoin icon systems. Each target seeks one first Ethscription of the exact historical file—not a recreation.</p>
            <div className="expedition-hero-brief">
              <p><strong>{resolvedStats.secured} / {resolvedStats.known}</strong><span>KNOWN FILES ETHSCRIBED</span><progress className="expedition-progress" value={resolvedStats.secured} max={resolvedStats.known} aria-label="Known files Ethscribed" /></p>
              <p><strong>PLUS ONE LOST ORIGINAL</strong><span>Satoshi’s attested 20 × 20 transparent PNG remains the expedition’s open archaeological mystery. <a href={`?artifact=${lostArtifact.id}#record-${lostArtifact.id}`} onClick={(event) => { event.preventDefault(); openArtifactFromGrid(lostArtifact.id); }}>Investigate the missing PNG →</a></span></p>
            </div>
            {findingIndexState === 'error' && <p className="index-notice" role="status">Live Findings are temporarily unavailable. This is the last available catalogue, not a complete current count. We’ll check again automatically.</p>}
            <a className="primary-action" href="#timeline">Open the field record <ArrowIcon /></a>
          </div>
          <ExpeditionCorpusGrid resolvedArtifacts={resolvedArtifacts} onOpenArtifact={openArtifactFromGrid} />
        </section>

        <section className="hunt-section expedition-record-section">
          <section className="timeline-section" id="timeline" aria-labelledby="timeline-title">
            <div className="timeline-heading">
              <div><p className="card-index">EXPEDITION TIMELINE / 2008–2010</p><h2 id="timeline-title">Every target, in context.</h2></div>
              <p><strong>Green files are already Ethscribed.</strong> White files are still open in our catalogue. Choose a target to read its story, test your discovery, or see a live listing. Green marks a verified match—not necessarily a file held by the marketplace.</p>
            </div>

            <div className="timeline-legend" aria-label="Timeline status legend">
              <span className="legend-secured">ETHSCRIBED</span><span className="legend-open">NOT YET ETHSCRIBED</span>
            </div>

            <div className="timeline-tools">
              <label className="timeline-search">FIND A TARGET<input type="search" placeholder="Filename, format, release, or year" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              <div className="timeline-filters" role="group" aria-label="Filter timeline targets">
                {[
                  ['all', 'All targets'], ['open', 'Still hunting'], ['secured', 'Ethscribed'], ['lost', 'Lost bytes'],
                ].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
              </div>
            </div>
            <p className="timeline-results" role="status">{visibleTargetCount} {visibleTargetCount === 1 ? 'target' : 'targets'}{filter === 'all' && !normalizedQuery ? ' · 22 known files + 1 lost original' : visibleTargetCount === 1 ? ' matches your view' : ' match your view'}</p>

            <div className="artifact-timeline">
              {filteredEvents.map((event) => {
                const selectedInEvent = event.artifactIds.includes(selectedArtifactId);
                const selectedArtifact = selectedInEvent ? artifactForId(selectedArtifactId) : null;

                return (
                  <article className="timeline-event" key={event.id}>
                    <div className="timeline-marker"><span /></div>
                    <div className="timeline-event-content">
                      <div className="timeline-event-copy">
                        <time>{event.date}</time><h3>{event.title}</h3><p>{event.copy}</p>
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
                        <div className="timeline-expanded" id={`record-${selectedArtifact.id}`} tabIndex={-1}>
                          <div className="record-toolbar"><button type="button" onClick={copyRecordLink}>Copy target link</button><span role="status">{copyState}</span><button type="button" onClick={() => selectArtifact(selectedArtifact.id)}>Close record ×</button></div>
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
              {!filteredEvents.length && <div className="timeline-empty"><p>No targets match this view. Try a filename such as bitcoin20.xpm or a format such as PNG.</p><button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Show all targets</button></div>}
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
      <img src="/newicon.svg" alt="Ethscribe" /><p>Find the bytes. Establish the provenance. Own the artifact.</p>
      <a className="footer-docs-link" href="/docs">Docs</a><span>© 2026 ETHSCRIBE</span>
    </footer>
  );
}

function NotFoundPage({ header }) {
  return <div className="site-shell">{header}<main id="main-content" tabIndex={-1} className="not-found"><p className="kicker"><span /> No record at this address</p><h1>This trail ends here.</h1><p>The page may have moved. The active expedition and field manual are good places to pick up the search.</p><a className="primary-action" href="/expeditions">Explore expeditions <ArrowIcon /></a></main><SiteFooter /></div>;
}

function App() {
  const walletSession = useEthscribeWallet();
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const [verifiedFindings, setVerifiedFindings] = useState([]);
  const [findingIndexState, setFindingIndexState] = useState('idle');
  const [soundFindings, setSoundFindings] = useState([]);
  const [soundFindingIndexState, setSoundFindingIndexState] = useState('idle');
  const pendingPublishedFindings = useRef(new Map());
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
    let fetching = false;
    setFindingIndexState('loading');
    const refresh = () => {
      if (fetching || document.visibilityState === 'hidden') return;
      fetching = true;
      fetchVerifiedFindings()
      .then((records) => {
        if (active) {
          setVerifiedFindings(reconcileFindingSnapshot(records, pendingPublishedFindings.current));
          setFindingIndexState('ready');
        }
      })
      .catch(() => {
        // The immutable manifest remains usable when the public Finding index is unavailable.
        if (active) setFindingIndexState('error');
      }).finally(() => { fetching = false; });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [pathname]);

  useEffect(() => {
    if (!['/expeditions', '/wallet', SOUND_EXPEDITION_PATH].includes(pathname)) return undefined;
    let active = true;
    let fetching = false;
    setSoundFindingIndexState('loading');
    const refresh = () => {
      if (fetching || document.visibilityState === 'hidden') return;
      fetching = true;
      fetchVerifiedFindings(fetch, SOUND_EXPEDITION_ID)
        .then((records) => {
          if (!active) return;
          setSoundFindings(reconcileFindingSnapshot(records, pendingPublishedFindings.current, SOUND_EXPEDITION_ID));
          setSoundFindingIndexState('ready');
        })
        .catch(() => { if (active) setSoundFindingIndexState('error'); })
        .finally(() => { fetching = false; });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [pathname]);

  const allVerifiedFindings = useMemo(() => [...verifiedFindings, ...soundFindings], [verifiedFindings, soundFindings]);
  const walletFindingIndexState = [findingIndexState, soundFindingIndexState].includes('error') ? 'error'
    : [findingIndexState, soundFindingIndexState].every(state => state === 'ready') ? 'ready' : 'loading';

  const recordPublishedFinding = (finding) => {
    if (!finding?.findingId) return;
    const expeditionId = finding.expeditionId || 'lost-pixels-of-satoshi';
    if (!['lost-pixels-of-satoshi', SOUND_EXPEDITION_ID].includes(expeditionId)) return;
    retainPublishedFinding(pendingPublishedFindings.current, finding);
    if (finding.expeditionId === SOUND_EXPEDITION_ID) {
      setSoundFindings((current) => [finding, ...current.filter((item) => item.findingId !== finding.findingId)]);
      setSoundFindingIndexState('ready');
      return;
    }
    setVerifiedFindings((current) => [finding, ...current.filter((item) => item.findingId !== finding.findingId)]);
    setFindingIndexState('ready');
  };
  const [modal, setModal] = useState(null);
  const isExpedition = pathname === EXPEDITION_PATH;
  const isLegacyProposalPath = pathname === '/expeditions/propose';
  const isLegacyCreationPath = pathname === '/ethscribe';
  const isExpeditions = pathname === '/expeditions' || isLegacyProposalPath || isLegacyCreationPath;
  const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
  const isWallet = pathname === '/wallet';
  const isSoundExpedition = pathname === SOUND_EXPEDITION_PATH;
  const localExpeditionSlug = import.meta.env.DEV && LocalExpedition && ['/expeditions/browser-wars', '/expeditions/skin-deep'].includes(pathname) ? pathname.split('/').pop() : null;
  const isEburp = pathname === '/expeditions/eburp';
  const notFound = pathname !== '/' && !isExpedition && !isExpeditions && !isDocs && !isWallet && !isSoundExpedition && !localExpeditionSlug && !isEburp;

  useEffect(() => {
    if (isLegacyProposalPath || isLegacyCreationPath) window.history.replaceState({}, '', '/expeditions');
  }, [isLegacyProposalPath, isLegacyCreationPath]);

  useEffect(() => {
    if (isDocs || localExpeditionSlug || isEburp) return;
    document.title = isSoundExpedition ? 'You’ve Got History — Ethscribe Expedition 002' : notFound ? 'Page not found — Ethscribe' : isWallet
      ? 'Wallet — Ethscribe'
      : isExpeditions
        ? 'Expeditions — Ethscribe'
      : isExpedition
        ? 'The Lost Pixels of Satoshi — Ethscribe Expedition 001'
        : 'Ethscribe — Ownable Digital Archaeology';
  }, [isDocs, isExpedition, isExpeditions, isWallet, notFound, isSoundExpedition, localExpeditionSlug, isEburp]);

  useEffect(() => {
    if (!modal) return undefined;
    const previousFocus = document.activeElement;
    const dialog = document.querySelector('.participation-modal');
    dialog?.querySelector('button')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setModal(null);
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button, a[href]')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus?.(); };
  }, [modal]);

  const switchToMainnet = async () => {
    try {
      await walletSession.switchToMainnet();
      setModal(null);
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
    findingIndexState,
    onFindingPublished: recordPublishedFinding,
    soundFindings,
  };
  const headerProps = { account, walletState, walletName, ensName, connectWallet, openAccountModal };

  return (
    <>
      {import.meta.env.DEV && import.meta.env.MODE !== 'test' && <div className="local-review-notice" role="note"><strong>LOCAL REVIEW</strong> · Live public data. Byte checks work; publishing and transactions are disabled. The live site is unchanged.</div>}
      {isEburp ? <Suspense fallback={<div className="site-shell"><SiteHeader {...headerProps} expeditions /><main id="main-content" tabIndex={-1}><p role="status">Loading Expedition 000…</p></main></div>}>
        <EburpExpedition
          renderHeader={meta => <SiteHeader {...headerProps} expedition expeditionMeta={{ ...meta, id: meta.number }} />}
          footer={<SiteFooter />}
          renderMarket={({ artifact, onRecord }) => <ArtifactMarketPanel {...pageProps} artifact={artifact} onRecord={onRecord} />}
          renderOwnership={({ artifact, onRecord }) => <ArtifactMarketPanel {...pageProps} artifact={artifact} onRecord={onRecord} readOnlyArtifact />}
        />
      </Suspense> : localExpeditionSlug ? <Suspense fallback={<div className="site-shell"><SiteHeader {...headerProps} expeditions /><main id="main-content" tabIndex={-1}><p role="status">Loading local expedition…</p></main></div>}><LocalExpedition slug={localExpeditionSlug} renderHeader={meta => <SiteHeader {...headerProps} expedition expeditionMeta={{ ...meta, id: meta.number }} />} footer={<SiteFooter />} /></Suspense> : isSoundExpedition ? <Suspense fallback={<div className="site-shell"><SiteHeader {...headerProps} expeditions /><main id="main-content" tabIndex={-1}><p role="status">Loading Expedition 002…</p></main></div>}><SoundExpedition headerProps={headerProps} pageProps={pageProps} findings={soundFindings} findingIndexState={soundFindingIndexState} /></Suspense> : notFound ? <NotFoundPage header={<SiteHeader {...headerProps} expeditions />} /> : isDocs
        ? <DocsPage header={<SiteHeader {...pageProps} docs />} footer={<SiteFooter />} />
        : isWallet
          ? <Suspense fallback={<div className="site-shell"><SiteHeader {...headerProps} wallet /><main id="main-content" tabIndex={-1}><p role="status">Loading Field Wallet…</p></main></div>}><EburpWallet
              account={account}
              chainId={chainId}
              connectWallet={connectWallet}
              switchToMainnet={switchToMainnet}
              provider={provider}
              resolvedFindings={allVerifiedFindings}
              findingIndexState={walletFindingIndexState}
              header={<SiteHeader {...headerProps} wallet />}
              footer={<SiteFooter />}
            /></Suspense>
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
