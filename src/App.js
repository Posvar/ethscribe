import { useEffect, useState } from 'react';
import './App.css';
import DocsPage from './DocsPage';
import WalletPage from './WalletPage';
import XpmPreview from './XpmPreview';
import { artifactById, huntStats, lostArtifact, timelineEvents } from './huntData';

const EXPEDITION_PATH = '/expeditions/lost-pixels-of-satoshi';
const referenceImage =
  'https://raw.githubusercontent.com/lugaxker/nakamoto-archive/main/src/bitcoin530.png';

const processSteps = [
  { number: '01', title: 'Define the target', body: 'A hunt begins with a culturally significant artifact and a precise definition of what counts.' },
  { number: '02', title: 'Follow the source', body: 'Researchers work from release archives, source commits, and contemporaneous records—not visual resemblance.' },
  { number: '03', title: 'Prove the bytes', body: 'Exact decoded bytes are matched by hash. A line ending, metadata rewrite, or reconstruction is a different artifact.' },
  { number: '04', title: 'Preserve the record', body: 'Verified files, evidence, and ownership enter a permanent public catalogue anchored to Ethereum.' },
];

const proposals = [
  { eyebrow: 'PRE-INTERNET SOFTWARE', title: 'The Desktop Before the Web', description: 'Recover formative icons, cursors, and interface assets from early personal computing.' },
  { eyebrow: 'WEB HISTORY', title: 'The First PNG', description: 'Trace the earliest surviving Portable Network Graphics files back to their exact sources.' },
  { eyebrow: 'INTERNET CULTURE', title: 'Before Emoji', description: 'Find the tiny images and glyphs that taught networked culture how to feel.' },
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

function walletLabel(account, walletState) {
  if (account) return shortAddress(account);
  return walletState === 'connecting' ? 'Connecting…' : 'Connect Wallet';
}

function SiteHeader({ account, walletState, connectWallet, expedition = false, docs = false, wallet = false }) {
  const awayFromHome = expedition || docs || wallet;
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
          <a href={awayFromHome ? '/#method' : '#method'}>Method</a>
          <a className={expedition ? 'nav-active' : ''} href={awayFromHome ? '/#expeditions' : '#expeditions'} aria-current={expedition ? 'page' : undefined}>Expeditions</a>
          <a href={awayFromHome ? '/#propose' : '#propose'}>Propose</a>
          <a className={docs ? 'nav-active' : ''} href="/docs" aria-current={docs ? 'page' : undefined}>Docs</a>
        </nav>
        {account ? (
          <a className={`wallet-button desktop-wallet${wallet ? ' wallet-active' : ''}`} href="/wallet" aria-current={wallet ? 'page' : undefined}>
            <WalletIcon />
            {walletLabel(account, walletState)}
          </a>
        ) : (
          <button className="wallet-button desktop-wallet" type="button" onClick={connectWallet}>
            <WalletIcon />
            {walletLabel(account, walletState)}
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
                <span>{walletLabel(account, walletState)}</span>
                <ArrowIcon />
              </a>
            ) : (
              <button className="mobile-wallet-action" type="button" onClick={connectFromMenu}>
                <WalletIcon />
                <span>{walletLabel(account, walletState)}</span>
                <ArrowIcon />
              </button>
            )}
            <a href={awayFromHome ? '/#mission' : '#mission'} onClick={closeMenu}>Mission</a>
            <a href={awayFromHome ? '/#method' : '#method'} onClick={closeMenu}>Method</a>
            <a className={expedition ? 'nav-active' : ''} href={awayFromHome ? '/#expeditions' : '#expeditions'} onClick={closeMenu}>Expeditions</a>
            <a href={awayFromHome ? '/#propose' : '#propose'} onClick={closeMenu}>Propose</a>
            <a className={docs ? 'nav-active' : ''} href="/docs" onClick={closeMenu}>Docs</a>
          </nav>
        )}
      </header>
      {expedition && (
        <nav className="expedition-context-bar" aria-label="Current expedition">
          <a href="/#expeditions">EXPEDITIONS</a><span>└─</span><a href={EXPEDITION_PATH} aria-current="page">EXPEDITION 001: THE LOST PIXELS OF SATOSHI</a>
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

function ArtifactDetail({ artifact, onDocumentRecovery }) {
  const [chainRecord, setChainRecord] = useState(null);
  const [recordState, setRecordState] = useState(artifact.ethscriptionId ? 'loading' : 'idle');
  const statusCopy = {
    secured: 'ETHSCRIBED · VERIFIED MATCH',
    open: 'KNOWN BYTES · NEEDS ETHSCRIBING',
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
        {artifact.status !== 'lost' && (
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
            </dl>
          </section>

          <section className="artifact-record-section">
            <h4><span>02</span> Hashing</h4>
            <dl className="artifact-record-grid">
              <RecordFact label="DECODED RAW FILE SHA-256" value={artifact.sha256} className="record-fact-wide" />
            </dl>
            <p className="record-section-note">This is the canonical Ethscribe artifact identity. It compares the decoded file bytes independently of MIME type or Data URI wrapper.</p>
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

        {artifact.status === 'open' && (
          <div className="contract-placeholder">
            <span>ETHSCRIBE + SUBMIT</span>
            <p>The immutable V1 contract is deployed and source-verified on Ethereum mainnet. Submission stays unavailable while the contract is deliberately paused and the transaction experience is completed.</p>
            <strong>CONTRACT DEPLOYED · WRITES PAUSED</strong>
          </div>
        )}

        <div className="artifact-links">
          <a href={artifact.sourceUrl} target="_blank" rel="noreferrer">Inspect primary source <ArrowIcon /></a>
          {artifact.status === 'lost' && (
            <button type="button" onClick={onDocumentRecovery}>Document a possible recovery <ArrowIcon /></button>
          )}
        </div>

        {artifact.status === 'lost' && (
          <p className="precontract-explainer">PRE-CONTRACT NOTEBOOK · This currently saves a private lead in your browser. It does not publish, validate, or ethscribe the candidate.</p>
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
        <p className="section-intro">Every expedition defines its evidence standard before the hunt begins. Known hashes can be verified automatically; unknown history stays unresolved until the source evidence is strong enough.</p>
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

function HomePage({ account, walletState, connectWallet, openParticipation }) {
  return (
    <div className="site-shell home-page">
      <SiteHeader account={account} walletState={walletState} connectWallet={connectWallet} />
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
            <img src={referenceImage} alt="Satoshi Nakamoto’s surviving 2010 Bitcoin source artwork" />
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

        <section className="next-section" id="propose">
          <div className="section-heading compact">
            <div><p className="kicker"><span /> Future fieldwork</p><h2>Digital history is bigger than the web.</h2></div>
            <button type="button" className="text-action proposal-button" onClick={() => openParticipation('proposal')}>Propose an expedition <ArrowIcon /></button>
          </div>
          <div className="proposal-grid">
            {proposals.map((proposal, index) => (
              <article key={proposal.title}><div className="proposal-meta"><span>{proposal.eyebrow}</span><span>0{index + 2}</span></div><h3>{proposal.title}</h3><p>{proposal.description}</p><span className="under-consideration">UNDER CONSIDERATION</span></article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ExpeditionPage({ account, walletState, connectWallet, openParticipation }) {
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
      <SiteHeader account={account} walletState={walletState} connectWallet={connectWallet} expedition />
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
              <img src={referenceImage} alt="Satoshi Nakamoto’s surviving 2010 Bitcoin source artwork" />
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
              <p className="progress-sync-note">CURATED MANIFEST TODAY · DEPLOYED MARKET READS LIVE · WRITES PAUSED</p>
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
                          <ArtifactDetail artifact={selectedArtifact} onDocumentRecovery={() => openParticipation('finding')} />
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
              <XpmPreview source={artifactById('june-32-xpm').previewUrl} label="Live browser-decoded preview of Satoshi’s June 2010 32-pixel XPM" />
              <span>LIVE CLIENT-SIDE DECODE</span>
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
            <button type="button" className="primary-action dark" onClick={() => openParticipation('finding')}>Document a possible recovery <ArrowIcon /></button>
          </div>
        </section>
      </main>
      <SiteFooter expedition />
    </div>
  );
}

function SiteFooter({ expedition = false }) {
  return (
    <footer>
      <img src="/icon.svg" alt="Ethscribe" /><p>Find the bytes. Establish the provenance. Own the artifact.</p>
      <div><a href="/">Mission</a><a href={expedition ? '#timeline' : EXPEDITION_PATH}>Expedition 001</a><a href="/docs">Docs</a><a href="https://docs.ethscriptions.com/" target="_blank" rel="noreferrer">Protocol</a></div><span>© 2026 ETHSCRIBE</span>
    </footer>
  );
}

function App() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState('');
  const [walletState, setWalletState] = useState('idle');
  const [modal, setModal] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const isExpedition = pathname === EXPEDITION_PATH;
  const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
  const isWallet = pathname === '/wallet';

  useEffect(() => {
    if (isDocs) return;
    document.title = isWallet
      ? 'Wallet — Ethscribe'
      : isExpedition
        ? 'The Lost Pixels of Satoshi — Ethscribe Expedition 001'
        : 'Ethscribe — Ownable Digital Archaeology';
  }, [isDocs, isExpedition, isWallet]);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return undefined;

    ethereum.request({ method: 'eth_accounts' }).then((accounts) => setAccount(accounts?.[0] || '')).catch(() => {});
    ethereum.request({ method: 'eth_chainId' }).then(setChainId).catch(() => {});
    const handleAccountsChanged = (accounts) => setAccount(accounts?.[0] || '');
    const handleChainChanged = (nextChainId) => setChainId(nextChainId || '');
    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.on?.('chainChanged', handleChainChanged);
    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setModal('wallet');
      return '';
    }

    try {
      setWalletState('connecting');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const nextAccount = accounts?.[0] || '';
      setAccount(nextAccount);
      window.ethereum.request({ method: 'eth_chainId' }).then(setChainId).catch(() => {});
      setWalletState('idle');
      return nextAccount;
    } catch (error) {
      setWalletState('idle');
      if (error?.code !== 4001) setModal('wallet-error');
      return '';
    }
  };

  const switchToMainnet = async () => {
    if (!window.ethereum) {
      setModal('wallet');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }],
      });
      setChainId('0x1');
    } catch (error) {
      if (error?.code !== 4001) setModal('network-error');
    }
  };

  const openParticipation = async (type) => {
    const activeAccount = account || (await connectWallet());
    if (activeAccount) {
      setSavedMessage('');
      setModal(type);
    }
  };

  const saveLocalDraft = (event, type) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const storageKey = `ethscribe:${type}:drafts`;

    try {
      const existing = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
      const drafts = Array.isArray(existing) ? existing : [];
      drafts.push({ ...formData, wallet: account, savedAt: new Date().toISOString() });
      window.localStorage.setItem(storageKey, JSON.stringify(drafts));
      setSavedMessage('Draft saved on this device. Nothing was published or submitted onchain.');
      event.currentTarget.reset();
    } catch {
      setSavedMessage('This browser could not save the draft. Copy your notes before closing.');
    }
  };

  const pageProps = { account, walletState, connectWallet, openParticipation };
  const headerProps = { account, walletState, connectWallet };

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
              header={<SiteHeader {...headerProps} wallet />}
              footer={<SiteFooter />}
            />
          : isExpedition ? <ExpeditionPage {...pageProps} /> : <HomePage {...pageProps} />}
      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section className="participation-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">×</button>

            {modal === 'wallet' && <><p className="kicker"><span /> Wallet required</p><h2 id="modal-title">Bring an Ethereum wallet.</h2><p>Ethscribe uses a wallet as your researcher identity. Install a browser wallet, then return to connect—no funds or signatures are requested by this preview.</p><a className="primary-action" href="https://ethereum.org/en/wallets/find-wallet/" target="_blank" rel="noreferrer">Find a wallet <ArrowIcon /></a></>}
            {modal === 'wallet-error' && <><p className="kicker"><span /> Connection error</p><h2 id="modal-title">The wallet did not connect.</h2><p>Check that your wallet is unlocked and connected to this browser, then try again.</p><button className="primary-action" type="button" onClick={connectWallet}>Try again <ArrowIcon /></button></>}
            {modal === 'network-error' && <><p className="kicker"><span /> Network change failed</p><h2 id="modal-title">Ethereum mainnet was not selected.</h2><p>The wallet view remains read-only, but marketplace transactions will require Ethereum mainnet. Switch networks in your wallet and try again.</p><button className="primary-action" type="button" onClick={switchToMainnet}>Try again <ArrowIcon /></button></>}

            {modal === 'finding' && (
              <><p className="kicker"><span /> Pre-contract recovery notebook</p><h2 id="modal-title">Document a possible recovery.</h2>
                <p>The target is the original `bitcoin20x20.png`, not a reconstruction. Until the contract and public evidence workflow launch, this form only saves a private, wallet-associated draft in this browser. It does not submit a finding to Ethscribe.</p>
                <form onSubmit={(event) => saveLocalDraft(event, 'finding')}>
                  <label>Archive or primary-source URL<input name="source" type="url" placeholder="https://archive.example/source" required /></label>
                  <label>Chain of custody<textarea name="evidence" rows="5" placeholder="Where were the bytes found, who preserved them, and how can another researcher reproduce the discovery?" required /></label>
                  <label>Candidate SHA-256, if available<input name="hash" type="text" placeholder="64 hexadecimal characters" pattern="[a-fA-F0-9]{64}" /></label>
                  <button className="primary-action" type="submit">Save private draft <ArrowIcon /></button>
                </form>
              </>
            )}

            {modal === 'proposal' && (
              <><p className="kicker"><span /> Expedition notebook</p><h2 id="modal-title">Propose the next hunt.</h2><p>Strong expeditions name a culturally important artifact, define an exact target, and begin with credible primary sources. This pre-contract preview saves only to this device.</p>
                <form onSubmit={(event) => saveLocalDraft(event, 'proposal')}>
                  <label>Expedition title<input name="title" type="text" placeholder="The first…" required /></label>
                  <label>What should researchers find?<textarea name="target" rows="3" placeholder="Describe the exact digital artifacts." required /></label>
                  <label>Starting source<input name="source" type="url" placeholder="https://…" required /></label>
                  <button className="primary-action" type="submit">Save private draft <ArrowIcon /></button>
                </form>
              </>
            )}

            {savedMessage && <p className="saved-message" role="status">{savedMessage}</p>}
            {account && modal !== 'wallet' && modal !== 'wallet-error' && modal !== 'network-error' && <p className="connected-as">RESEARCHER {shortAddress(account)}</p>}
          </section>
        </div>
      )}
    </>
  );
}

export default App;
