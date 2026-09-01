import { useEffect, useState } from 'react';
import './App.css';
import DocsPage from './DocsPage';
import EthscribeWorkbench from './EthscribeWorkbench';
import WalletPage from './WalletPage';
import XpmPreview from './XpmPreview';
import { artifactById, artifacts, huntStats, lostArtifact, timelineEvents } from './huntData';
import {
  buildExpeditionProposal,
  fetchExpeditionProposals,
  publishExpeditionProposal,
  signExpeditionProposal,
} from './proposalApi';
import { useEthscribeWallet } from './useEthscribeWallet';

const EXPEDITION_PATH = '/expeditions/lost-pixels-of-satoshi';
const referenceImage = artifactById('new-png-48').previewUrl;

const proposalDirections = [
  { eyebrow: 'PRE-INTERNET SOFTWARE', title: 'The Desktop Before the Web', description: 'Recover formative icons, cursors, and interface assets from early personal computing.' },
  { eyebrow: 'WEB HISTORY', title: 'The First PNG', description: 'Trace the earliest surviving Portable Network Graphics files back to their exact sources.' },
  { eyebrow: 'INTERNET CULTURE', title: 'Before Emoji', description: 'Find the tiny images and glyphs that taught networked culture how to feel.' },
];

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

function formatBytes(bytes) {
  return bytes ? `${bytes.toLocaleString('en-US')} bytes` : 'Unknown';
}

function isSmallArtifact(artifact) {
  const dimensions = artifact.dimensions?.match(/\d+/g)?.map(Number) || [];
  return dimensions.length > 0 && Math.max(...dimensions.slice(0, 2)) <= 80;
}

function walletLabel(account, walletState, walletName) {
  if (account) return walletName ? `${walletName} · ${shortAddress(account)}` : shortAddress(account);
  return walletState === 'connecting' ? 'Connecting…' : 'Connect Wallet';
}

function SiteHeader({ account, walletState, walletName, connectWallet, expedition = false, expeditions = false, docs = false, wallet = false, ethscribe = false }) {
  const awayFromHome = expedition || expeditions || docs || wallet || ethscribe;
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
          <a className={ethscribe ? 'nav-active' : ''} href="/ethscribe" aria-current={ethscribe ? 'page' : undefined}>Ethscribe</a>
          <a className={docs ? 'nav-active' : ''} href="/docs" aria-current={docs ? 'page' : undefined}>Docs</a>
        </nav>
        {account ? (
          <a className={`wallet-button desktop-wallet${wallet ? ' wallet-active' : ''}`} href="/wallet" aria-current={wallet ? 'page' : undefined}>
            <WalletIcon />
            {walletLabel(account, walletState, walletName)}
          </a>
        ) : (
          <button className="wallet-button desktop-wallet" type="button" onClick={connectWallet}>
            <WalletIcon />
            {walletLabel(account, walletState, walletName)}
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
              <a className={`mobile-wallet-action${wallet ? ' nav-active' : ''}`} href="/wallet" onClick={closeMenu}>
                <WalletIcon />
                <span>{walletLabel(account, walletState, walletName)}</span>
                <ArrowIcon />
              </a>
            ) : (
              <button className="mobile-wallet-action" type="button" onClick={connectFromMenu}>
                <WalletIcon />
                <span>{walletLabel(account, walletState, walletName)}</span>
                <ArrowIcon />
              </button>
            )}
            <a href={awayFromHome ? '/#mission' : '#mission'} onClick={closeMenu}>Mission</a>
            <a className={expeditionsActive ? 'nav-active' : ''} href="/expeditions" onClick={closeMenu}>Expeditions</a>
            <a className={ethscribe ? 'nav-active' : ''} href="/ethscribe" onClick={closeMenu}>Ethscribe</a>
            <a className={docs ? 'nav-active' : ''} href="/docs" onClick={closeMenu}>Docs</a>
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

function RecordFact({ label, value, unknown = 'Unknown until the original bytes are recovered', className = '' }) {
  return (
    <div className={`record-fact ${className}`}>
      <dt>{label}</dt>
      <dd className={!value ? 'unknown-hash' : ''}>{value || unknown}</dd>
    </div>
  );
}

function ArtifactDetail({ artifact, account, chainId, connectWallet, switchToMainnet, provider }) {
  const [chainRecord, setChainRecord] = useState(null);
  const [recordState, setRecordState] = useState(artifact.ethscriptionId ? 'loading' : 'idle');
  const statusCopy = {
    secured: 'ETHSCRIBED · VERIFIED MATCH',
    open: 'OPEN HUNT · NEEDS ETHSCRIBING',
    lost: 'ORIGINAL BYTES UNKNOWN',
  };
  const creator = chainRecord?.creator || artifact.creator;
  const currentOwner = chainRecord?.current_owner || artifact.currentOwner;

  useEffect(() => {
    let active = true;

    if (!artifact.ethscriptionId || typeof fetch !== 'function') {
      setChainRecord(null);
      setRecordState(artifact.ethscriptionId ? 'fallback' : 'idle');
      return () => { active = false; };
    }

    setChainRecord(null);
    setRecordState('loading');
    fetch(`/api/ethscriptions/${artifact.ethscriptionId}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Ethscriptions API returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        setChainRecord(payload.result || payload);
        setRecordState('live');
      })
      .catch(() => {
        if (active) setRecordState('fallback');
      });

    return () => { active = false; };
  }, [artifact.ethscriptionId]);

  return (
    <article className={`artifact-detail detail-${artifact.status}`} aria-live="polite">
      <div className="artifact-detail-visual">
        <ArtifactPreview artifact={artifact} />
        {artifact.status === 'secured' && (
          <p className="display-scale-note">
            {isSmallArtifact(artifact) ? 'PREVIEW ENLARGED WITH NEAREST-NEIGHBOR SCALING' : 'PREVIEW SCALED FOR INSPECTION'}<br />
            NATIVE {artifact.dimensions}
          </p>
        )}
        <span className="evidence-grade">EVIDENCE {artifact.evidence}</span>
      </div>
      <div className="artifact-detail-copy">
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

        <div className="artifact-record-sections">
          <section className="artifact-record-section">
            <h4><span>01</span> File information</h4>
            <dl className="artifact-record-grid compact-record-grid">
              <RecordFact label="FORMAT" value={artifact.format} />
              <RecordFact label="NATIVE DIMENSIONS" value={artifact.dimensions} />
              <RecordFact label="RAW FILE SIZE" value={formatBytes(artifact.bytes)} />
              <RecordFact label={artifact.status === 'secured' ? 'VERIFIED SOURCE' : 'SOURCE CLUE'} value={artifact.sourceLabel} className="record-fact-wide" />
            </dl>
          </section>

          <section className="artifact-record-section">
            <h4><span>02</span> Hashing</h4>
            {artifact.status === 'secured' ? (
              <>
                <dl className="artifact-record-grid">
                  <RecordFact label="DECODED RAW FILE SHA-256" value={artifact.sha256} className="record-fact-wide" />
                </dl>
                <p className="record-section-note">This is the canonical Ethscribe artifact identity. It compares the decoded file bytes independently of MIME type or Data URI wrapper.</p>
              </>
            ) : artifact.validationMode === 'exact' ? (
              <div className="sealed-target-note">
                <strong>EXPECTED SHA-256 SEALED WHILE THE HUNT IS OPEN</strong>
                <p>Your upload is hashed locally, then checked against the private target commitment by the server. Only match or mismatch returns to the browser. The expected hash and primary source are published with the accepted Accession.</p>
              </div>
            ) : (
              <>
                <dl className="artifact-record-grid">
                  <RecordFact label="DECODED RAW FILE SHA-256" value={null} className="record-fact-wide" />
                </dl>
                <p className="record-section-note">No verified original payload survives, so this target requires a reproducible provenance case rather than an automatic exact-hash match.</p>
              </>
            )}
          </section>

          <section className="artifact-record-section">
            <h4><span>03</span> Ethscription transaction</h4>
            {artifact.ethscriptionId ? (
              <dl className="artifact-record-grid">
                <div className="record-fact record-fact-wide">
                  <dt>ETHSCRIPTION ID / CREATION TRANSACTION</dt>
                  <dd className="linked-record-value">
                    <a href={`https://etherscan.io/tx/${artifact.ethscriptionId}`} target="_blank" rel="noreferrer">{artifact.ethscriptionId}</a>
                    <span><a href={`https://ethscriptions.com/ethscriptions/${artifact.ethscriptionId}`} target="_blank" rel="noreferrer">View Ethscription <ArrowIcon /></a></span>
                  </dd>
                </div>
                <RecordFact label="ETHSCRIBED" value={artifact.ethscribedAt} />
                <RecordFact label="PROTOCOL CONTENT SHA-256 (FULL DATA URI)" value={artifact.contentSha} className="record-fact-wide" />
              </dl>
            ) : (
              <p className="empty-record">No accepted Ethscription is attached to this artifact target yet.</p>
            )}
            {artifact.contentSha && <p className="record-section-note">The protocol content hash identifies the complete UTF-8 Data URI. It is distinct from the decoded-file hash above.</p>}
          </section>

          <section className="artifact-record-section">
            <h4><span>04</span> Ownership</h4>
            {artifact.ethscriptionId ? (
              <>
                <dl className="artifact-record-grid ownership-grid">
                  <div className="record-fact">
                    <dt>CREATOR / ETHSCRIBING WALLET</dt>
                    <dd>{creator ? <a href={`https://etherscan.io/address/${creator}`} target="_blank" rel="noreferrer">{creator}</a> : 'Checking official indexer…'}</dd>
                  </div>
                  <div className="record-fact">
                    <dt>CURRENT OWNER</dt>
                    <dd>{currentOwner ? <a href={`https://etherscan.io/address/${currentOwner}`} target="_blank" rel="noreferrer">{currentOwner}</a> : 'Checking official indexer…'}</dd>
                  </div>
                </dl>
                <p className={`ownership-source ownership-${recordState}`}>
                  {recordState === 'live' ? 'LIVE OWNERSHIP · OFFICIAL ETHSCRIPTIONS INDEXER' : recordState === 'loading' ? 'CHECKING CURRENT OWNERSHIP…' : 'RECORDED OWNERSHIP · LIVE CHECK TEMPORARILY UNAVAILABLE'}
                </p>
              </>
            ) : (
              <p className="empty-record">Ownership begins when a matching file is Ethscribed and accepted into the expedition record.</p>
            )}
          </section>
        </div>

        {artifact.format === 'XPM' && artifact.status !== 'lost' && (
          <div className="artifact-prefix"><span>RECOMMENDED DATA URI</span><code>data:image/x-xpixmap;base64,&lt;exact XPM bytes&gt;</code></div>
        )}

        {(artifact.status === 'open' || artifact.status === 'lost') && (
          <EthscribeWorkbench
            mode="target"
            artifact={artifact}
            account={account}
            chainId={chainId}
            connectWallet={connectWallet}
            switchToMainnet={switchToMainnet}
            provider={provider}
          />
        )}

        {artifact.sourceUrl && (
          <div className="artifact-links">
            <a href={artifact.sourceUrl} target="_blank" rel="noreferrer">{artifact.status === 'lost' ? 'Inspect surviving evidence' : 'Inspect primary source'} <ArrowIcon /></a>
          </div>
        )}
      </div>
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
        <strong>ONE FILE IDENTITY. MANY ONCHAIN WRAPPERS.</strong>
        <p>Ethereum establishes inscription history and ownership. Ethscribe separately hashes the decoded raw file, so a MIME change, alternate Data URI, or compressed wrapper cannot impersonate a new historical artifact.</p>
      </div>
    </section>
  );
}

function HomePage({ account, walletState, walletName, connectWallet }) {
  return (
    <div className="site-shell home-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} connectWallet={connectWallet} />
      <main id="top">
        <section className="hero mission-hero">
          <div className="hero-copy">
            <p className="kicker"><span /> Ownable digital archaeology</p>
            <h1>Find the bytes. Establish the provenance. Own the artifact.</h1>
            <p className="hero-intro">Ethscribe turns historically significant digital files into Accessions—recognized, transferable onchain artifacts backed by public evidence and an auditable chain of custody.</p>
            <div className="hero-actions">
              <a className="primary-action" href="#mission">Explore the mission <ArrowIcon /></a>
              <a className="text-action" href={EXPEDITION_PATH}>Enter Expedition 001</a>
            </div>
          </div>

          <div className="mission-index" aria-label="A digital artifact moving from discovery to verified record">
            <div className="index-heading"><span>ETHSCRIBE FIELD INDEX</span><span>∞ / OPEN</span></div>
            <div className="index-object object-source"><span>01 / DISCOVER</span><strong>ORIGINAL SOURCE</strong><code>archive · disk · code · network</code></div>
            <div className="index-connector">↓</div>
            <div className="index-object object-proof"><span>02 / AUTHENTICATE</span><strong>BYTE-PERFECT MATCH</strong><code>sha256: 7f3a…e921</code></div>
            <div className="index-connector">↓</div>
            <div className="index-object object-record"><span>03 / PRESERVE</span><strong>OWNABLE RECORD</strong><code>ethereum · provenance · custody</code></div>
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
            <article><span>03</span><h3>Preserve and own</h3><p>Ethereum records inscription history and custody while the exhibition preserves context, evidence, and status.</p></article>
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
            <p>The inaugural expedition maps Satoshi’s 2009–2010 icon workshop: seven files already secured, fifteen known-byte gaps ready to ethscribe, and one contemporaneously attested attachment genuinely missing.</p>
            <dl>
              <div><dt>ETHSCRIBED</dt><dd>{huntStats.secured}</dd></div>
              <div><dt>KNOWN GAPS</dt><dd>{huntStats.open}</dd></div>
              <div><dt>LOST ARTIFACT</dt><dd>{huntStats.lost}</dd></div>
            </dl>
            <a className="primary-action" href={EXPEDITION_PATH}>Open the expedition <ArrowIcon /></a>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}

function ExpeditionsPage({ account, walletState, walletName, connectWallet }) {
  return (
    <div className="site-shell expeditions-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} connectWallet={connectWallet} expeditions />
      <main id="top">
        <section className="expeditions-index-hero">
          <div><p className="kicker"><span /> Public fieldwork</p><h1>Expeditions</h1></div>
          <div>
            <p>Focused hunts for historically significant files—defined before the search, verified byte by byte, and preserved as permanent public records.</p>
            <a className="primary-action" href="/expeditions/propose">Propose an expedition <ArrowIcon /></a>
          </div>
        </section>

        <section className="expedition-index-list" aria-label="Expedition archive, newest first">
          <p className="card-index expedition-archive-label">EXPEDITION ARCHIVE / NEWEST FIRST</p>
          <a className="expedition-index-card" href={EXPEDITION_PATH}>
            <div className="expedition-index-visual"><img src={referenceImage} alt="Satoshi Nakamoto’s secured 2010 Bitcoin icon" /><span>EXPEDITION 001</span></div>
            <div className="expedition-index-copy">
              <div className="expedition-index-meta"><span className="expedition-active-status">ACTIVE</span><span>BITCOIN · 2008–2010</span></div>
              <h3>The Lost Pixels of Satoshi</h3>
              <p>Complete the exact-file record behind Satoshi’s first two Bitcoin icon systems—and recover one attested PNG whose original bytes remain lost.</p>
              <dl>
                <div><dt>ETHSCRIBED</dt><dd>{huntStats.secured} / {huntStats.known}</dd></div>
                <div><dt>KNOWN-BYTE GAPS</dt><dd>{huntStats.open}</dd></div>
                <div><dt>LOST-BYTE TARGETS</dt><dd>{huntStats.lost}</dd></div>
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

function formatProposalDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'DATE UNAVAILABLE';
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).toUpperCase();
}

function friendlyProposalError(error) {
  if (error?.code === 4001 || /user rejected|user denied/i.test(error?.message || '')) {
    return 'The proposal signature was cancelled in the wallet. Nothing was published.';
  }
  return error?.message || 'The proposal could not be published.';
}

function ProposeExpeditionPage({ account, walletState, walletName, connectWallet, provider }) {
  const [proposals, setProposals] = useState([]);
  const [listState, setListState] = useState('loading');
  const [submitState, setSubmitState] = useState('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetchExpeditionProposals()
      .then((records) => {
        if (!active) return;
        setProposals(records);
        setListState('ready');
      })
      .catch((error) => {
        if (!active) return;
        setListState('error');
        setSubmitMessage(error.message);
      });
    return () => { active = false; };
  }, []);

  const submitProposal = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setSubmitMessage('');

    try {
      const activeAccount = account || (await connectWallet());
      if (!activeAccount) return;
      setSubmitState('signing');
      const proposal = buildExpeditionProposal({ ...fields, authorAddress: activeAccount });
      const signed = await signExpeditionProposal(provider, activeAccount, proposal);
      setSubmitState('publishing');
      const published = await publishExpeditionProposal(proposal, signed.message, signed.signature);
      setProposals((current) => [published, ...current.filter((item) => item.proposalId !== published.proposalId)]);
      setListState('ready');
      setSubmitState('complete');
      setSubmitMessage('Proposal published to the public expedition notebook.');
      form.reset();
    } catch (error) {
      setSubmitState('error');
      setSubmitMessage(friendlyProposalError(error));
    }
  };

  return (
    <div className="site-shell propose-expedition-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} connectWallet={connectWallet} expeditions />
      <main id="top">
        <section className="proposal-page-hero">
          <div>
            <p className="page-breadcrumb"><a href="/expeditions">EXPEDITIONS</a><span>/</span>PROPOSE</p>
            <p className="kicker"><span /> Community fieldwork</p>
            <h1>Propose the next expedition.</h1>
          </div>
          <p>A compelling expedition starts with a culturally important digital artifact, a bounded exact-file target, and at least one credible place to begin the search.</p>
        </section>

        <section className="proposal-directions" aria-labelledby="proposal-directions-title">
          <div className="section-heading compact">
            <div><p className="kicker"><span /> Possible directions</p><h2 id="proposal-directions-title">Digital history is bigger than the web.</h2></div>
            <p className="section-intro">These are prompts, not a fixed roadmap. The strongest proposal turns a broad theme into a finite set of files whose identity can be investigated and proven.</p>
          </div>
          <div className="proposal-grid">
            {proposalDirections.map((proposal, index) => (
              <article key={proposal.title}>
                <div className="proposal-meta"><span>{proposal.eyebrow}</span><span>0{index + 1}</span></div>
                <h3>{proposal.title}</h3>
                <p>{proposal.description}</p>
                <span className="under-consideration">EXAMPLE DIRECTION</span>
              </article>
            ))}
          </div>
        </section>

        <section className="proposal-notebook" aria-labelledby="proposal-form-title">
          <div className="proposal-form-copy">
            <p className="kicker"><span /> Expedition notebook</p>
            <h2 id="proposal-form-title">Make the case.</h2>
            <p>Submitting costs no gas. Your wallet signs the exact proposal to establish authorship; it does not send a transaction or grant Ethscribe custody of anything.</p>
            <dl>
              <div><dt>GOOD TARGETS</dt><dd>Historically meaningful, exact-file oriented, and bounded enough to finish.</dd></div>
              <div><dt>GOOD SOURCES</dt><dd>Release archives, source repositories, contemporary posts, or verifiable custody trails.</dd></div>
              <div><dt>WHAT HAPPENS NEXT</dt><dd>Proposals enter the public notebook. Publication does not automatically activate an expedition.</dd></div>
            </dl>
          </div>
          <form className="proposal-inline-form" onSubmit={submitProposal}>
            <label>Expedition title<input name="title" type="text" maxLength="120" placeholder="The first…" required /></label>
            <label>What should researchers find?<textarea name="target" rows="4" maxLength="1200" placeholder="Describe the exact digital artifacts and the boundary of the hunt." required /></label>
            <label>Why does it matter?<textarea name="rationale" rows="4" maxLength="1200" placeholder="Explain the historical significance and why people would want to participate." required /></label>
            <label>Starting source<input name="source" type="url" maxLength="2048" placeholder="https://…" required /></label>
            <button className="primary-action" type="submit" disabled={['signing', 'publishing'].includes(submitState)}>
              {submitState === 'signing' ? 'SIGN IN WALLET…' : submitState === 'publishing' ? 'PUBLISHING…' : account ? 'SIGN + PUBLISH PROPOSAL' : 'CONNECT + PUBLISH PROPOSAL'} <ArrowIcon />
            </button>
            {submitMessage && <p className={`proposal-submit-message state-${submitState}`} role="status">{submitMessage}</p>}
            {account && <p className="connected-as">PROPOSER {shortAddress(account)}</p>}
          </form>
        </section>

        <section className="proposal-submissions" aria-labelledby="proposal-submissions-title">
          <div className="proposal-submissions-heading">
            <div><p className="kicker"><span /> Public notebook</p><h2 id="proposal-submissions-title">Proposed expeditions.</h2></div>
            <span>{proposals.length.toString().padStart(2, '0')} SUBMISSION{proposals.length === 1 ? '' : 'S'} · NEWEST FIRST</span>
          </div>
          {listState === 'loading' && <p className="proposal-empty-state">Loading the public notebook…</p>}
          {listState === 'error' && <p className="proposal-empty-state">The public notebook could not be loaded. You can still prepare a proposal and try again.</p>}
          {listState === 'ready' && proposals.length === 0 && <p className="proposal-empty-state">No proposals yet. The first signed submission will appear here.</p>}
          {proposals.length > 0 && (
            <div className="proposal-rows">
              {proposals.map((proposal, index) => (
                <article key={proposal.proposalId}>
                  <div className="proposal-row-index"><span>{String(index + 1).padStart(2, '0')}</span><strong>PROPOSED</strong></div>
                  <div className="proposal-row-main"><h3>{proposal.title}</h3><p>{proposal.target}</p></div>
                  <div className="proposal-row-proof">
                    <span>{formatProposalDate(proposal.submittedAt || proposal.createdAt)}</span>
                    <a href={proposal.source} target="_blank" rel="noreferrer">STARTING SOURCE <ArrowIcon /></a>
                    <a href={`https://etherscan.io/address/${proposal.authorAddress}`} target="_blank" rel="noreferrer">{shortAddress(proposal.authorAddress)} <ArrowIcon /></a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ExpeditionPage({ account, walletState, walletName, connectWallet, chainId, switchToMainnet, provider }) {
  const requestedArtifactId = new URLSearchParams(window.location.search).get('artifact');
  const [selectedArtifactId, setSelectedArtifactId] = useState(
    artifactById(requestedArtifactId) ? requestedArtifactId : lostArtifact.id,
  );

  useEffect(() => {
    if (!artifactById(requestedArtifactId)) return undefined;

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

  return (
    <div className="site-shell expedition-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} connectWallet={connectWallet} expedition />
      <main id="top">
        <section className="expedition-hero" id="expedition">
          <div className="expedition-hero-copy">
            <p className="page-breadcrumb"><a href="/">ETHSCRIBE</a><span>/</span>EXPEDITION 001</p>
            <p className="kicker"><span /> Active digital archaeology hunt</p>
            <h1>The Lost Pixels of Satoshi</h1>
            <p>This expedition—not the whole Ethscribe mission—focuses on the exact files behind Satoshi’s first two Bitcoin icon systems.</p>
            <a className="primary-action" href="#timeline">Open the field record <ArrowIcon /></a>
          </div>
          <div className="hero-artifact" aria-label="The Lost Pixels of Satoshi artifact preview">
            <div className="artifact-label top-label"><span>FIELD NOTE 001</span><span>08 FEB 2010</span></div>
            <div className="artifact-stage lost-stage">
              <span className="registration-mark mark-one">+</span><span className="registration-mark mark-two">+</span>
              <img src={referenceImage} alt="Satoshi Nakamoto’s secured 2010 Bitcoin icon" />
            </div>
            <div className="artifact-label bottom-label">
              <div><span>CORPUS</span><strong>{huntStats.known} KNOWN FILES</strong></div>
              <div><span>STATUS</span><strong className="status-dot">ONE OPEN MYSTERY</strong></div>
            </div>
          </div>
        </section>

        <section className="ticker" aria-label="Expedition principles">
          <div>{huntStats.secured} ETHSCRIBED</div><span>✦</span><div>{huntStats.open} KNOWN-BYTE GAPS</div><span>✦</span><div>1 LOST-BYTE HUNT</div><span>✦</span><div>EXACT MATCHES ONLY</div>
        </section>

        <section className="hunt-section">
          <div className="section-heading">
            <div><p className="kicker"><span /> Expedition brief</p><h2>Find the files. Complete the record.</h2></div>
            <div className="hunt-status"><span>EXPEDITION 001</span><strong>CATALOGUE LIVE</strong></div>
          </div>

          <div className="hunt-overview">
            <article className="source-card lost-source-card">
              <p className="card-index">PRIMARY SOURCE / 08 FEB 2010</p>
              <blockquote>“I’m attaching bitcoin20x20.png, the 20x20 version with full transparency.”</blockquote>
              <p>Satoshi described and attached a hand-tuned PNG of the original BC coin. The post survives. The attachment does not. A recreation, ICO extraction, or visual match cannot fill this slot—the hunt is for the original bytes and their custody trail.</p>
              <a className="source-link" href="https://bitcointalk.org/index.php?topic=45.msg475#msg475" target="_blank" rel="noreferrer">Read Satoshi’s post <ArrowIcon /></a>
            </article>

            <article className="progress-card">
              <p className="card-index">CANONICAL CORPUS / THROUGH v0.3.0</p>
              <div className="progress-fraction"><strong>{huntStats.secured}</strong><span>/ {huntStats.known}</span></div>
              <p className="progress-label">known byte-perfect files secured in this collection</p>
              <div className="progress-track" aria-label={`${huntStats.secured} of ${huntStats.known} artifacts secured`}><span style={{ width: `${(huntStats.secured / huntStats.known) * 100}%` }} /></div>
              <p className="progress-sync-note">CURATED MANIFEST TODAY · LIVE TARGET INTAKE · VERIFIED MARKET CUSTODY</p>
              <dl className="progress-breakdown">
                <div><dt>ETHSCRIBED</dt><dd>{huntStats.secured}</dd></div><div><dt>NEEDS ETHSCRIBING</dt><dd>{huntStats.open}</dd></div>
                <div><dt>BYTES UNKNOWN</dt><dd>{huntStats.lost}</dd></div><div><dt>MAPPED COMPONENTS</dt><dd>{huntStats.components}</dd></div>
              </dl>
            </article>
          </div>

          <div className="hunt-lanes">
            <article><span className="lane-index">01 / ACCESSION</span><h3>Known bytes</h3><p>Fifteen authoritative files are already available from source commits or archives. Their full target hashes appear in the timeline below. The task is to ethscribe the exact bytes and submit the matching record.</p><strong>A finite completion race</strong></article>
            <article className="unknown-lane"><span className="lane-index">02 / RECOVERY</span><h3>Unknown bytes</h3><p>For `bitcoin20x20.png`, no target hash exists because no verified original payload has survived. The task is to recover a candidate and establish its chain of custody.</p><strong>The open archaeological mystery</strong></article>
          </div>

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
                const selectedArtifact = selectedInEvent ? artifactById(selectedArtifactId) : null;

                return (
                  <article className="timeline-event" key={event.id}>
                    <div className="timeline-marker"><span /></div>
                    <div className="timeline-event-content">
                      <div className="timeline-event-copy">
                        <time>{event.date}</time><h4>{event.title}</h4><p>{event.copy}</p>
                        {event.artifactIds.length > 0 && (
                          <div className="artifact-chips">
                            {event.artifactIds.map((artifactId) => {
                              const artifact = artifactById(artifactId);
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
                            artifact={selectedArtifact}
                            account={account}
                            chainId={chainId}
                            connectWallet={connectWallet}
                            switchToMainnet={switchToMainnet}
                            provider={provider}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="xpm-lab" id="byte-lab" aria-labelledby="xpm-title">
            <div className="xpm-lab-preview">
              <div className="sealed-preview" aria-label="XPM target preview sealed during the active hunt">
                <span>?</span><strong>XPM PREVIEW SEALED</strong><small>REVEALED WITH THE ACCESSION</small>
              </div>
              <span>CLIENT-SIDE DECODER READY</span>
            </div>
            <div className="xpm-lab-copy">
              <p className="card-index">BYTE LAB / X PIXMAP</p><h3 id="xpm-title">The browser cannot see it. Ethscribe can.</h3>
              <p>XPM is C-style text containing a palette and pixel rows. Modern browsers do not natively display it as an image. Ethscribe preserves and hashes the original XPM payload, then derives a canvas preview without rewriting the artifact.</p>
              <code>data:image/x-xpixmap;base64,&lt;base64 of the exact .xpm file&gt;</code>
              <strong>Do not open and resave the source. CRLF line-ending conversion changes the hash.</strong>
            </div>
          </section>

          <div className="hunt-callout">
            <div><span className="callout-number">1</span><p>attested artifact has no verified surviving bytes</p></div>
            <a className="primary-action dark" href={`${EXPEDITION_PATH}?artifact=${lostArtifact.id}#record-${lostArtifact.id}`}>Open the recovery target <ArrowIcon /></a>
          </div>
        </section>
      </main>
      <SiteFooter expedition />
    </div>
  );
}

function EthscribePage({ account, walletState, walletName, connectWallet, chainId, switchToMainnet, provider }) {
  const submissionTargets = [...artifacts.filter((artifact) => artifact.status === 'open'), lostArtifact];

  return (
    <div className="site-shell ethscribe-page">
      <SiteHeader account={account} walletState={walletState} walletName={walletName} connectWallet={connectWallet} ethscribe />
      <main id="top">
        <section className="ethscribe-page-hero">
          <div>
            <p className="kicker"><span /> Exact-byte preservation</p>
            <h1>Ethscribe a file directly into the vault.</h1>
          </div>
          <p>Your wallet remains the protocol creator while the immutable market becomes initial owner. Nothing is listed or assigned automatically; after verification, keep it vaulted, withdraw it, or submit it to a compatible expedition.</p>
        </section>
        <EthscribeWorkbench
          mode="personal"
          submissionTargets={submissionTargets}
          account={account}
          chainId={chainId}
          connectWallet={connectWallet}
          switchToMainnet={switchToMainnet}
          provider={provider}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter({ expedition = false }) {
  return (
    <footer>
      <img src="/icon.svg" alt="Ethscribe" /><p>Find the bytes. Establish the provenance. Own the artifact.</p>
      <div><a href="/">Mission</a><a href="/expeditions">Expeditions</a>{expedition && <a href="#timeline">Expedition 001</a>}<a href="/ethscribe">Ethscribe</a><a href="/docs">Docs</a><a href="https://docs.ethscriptions.com/" target="_blank" rel="noreferrer">Protocol</a></div><span>© 2026 ETHSCRIBE</span>
    </footer>
  );
}

function App() {
  const walletSession = useEthscribeWallet();
  const {
    account,
    chainId,
    walletState,
    walletName,
    provider,
    connectWallet,
    openAccountModal,
  } = walletSession;
  const [modal, setModal] = useState(null);
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const isExpedition = pathname === EXPEDITION_PATH;
  const isExpeditions = pathname === '/expeditions';
  const isProposal = pathname === '/expeditions/propose';
  const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
  const isWallet = pathname === '/wallet';
  const isEthscribe = pathname === '/ethscribe';

  useEffect(() => {
    if (isDocs) return;
    document.title = isWallet
      ? 'Wallet — Ethscribe'
      : isEthscribe
        ? 'Ethscribe a File — Ethscribe'
      : isProposal
        ? 'Propose an Expedition — Ethscribe'
      : isExpeditions
        ? 'Expeditions — Ethscribe'
      : isExpedition
        ? 'The Lost Pixels of Satoshi — Ethscribe Expedition 001'
        : 'Ethscribe — Ownable Digital Archaeology';
  }, [isDocs, isEthscribe, isExpedition, isExpeditions, isProposal, isWallet]);

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
    connectWallet,
    chainId,
    switchToMainnet,
    provider,
  };
  const headerProps = { account, walletState, walletName, connectWallet };

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
              walletName={walletName}
              openAccountModal={openAccountModal}
              header={<SiteHeader {...headerProps} wallet />}
              footer={<SiteFooter />}
            />
          : isEthscribe
            ? <EthscribePage {...pageProps} />
            : isProposal
              ? <ProposeExpeditionPage {...pageProps} />
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
