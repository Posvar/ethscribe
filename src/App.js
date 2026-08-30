import { useEffect, useState } from 'react';
import './App.css';
import XpmPreview from './XpmPreview';
import { artifactById, artifacts, huntStats, lostArtifact, timelineEvents } from './huntData';

const referenceImage =
  'https://raw.githubusercontent.com/lugaxker/nakamoto-archive/main/src/bitcoin530.png';

const securedArtifacts = artifacts.filter((artifact) => artifact.status === 'secured');

const processSteps = [
  { number: '01', title: 'Follow the source', body: 'Start with a release archive, source commit, or contemporaneous post—not a visual resemblance.' },
  { number: '02', title: 'Recover the bytes', body: 'Preserve the original file exactly. A line ending or metadata rewrite creates a different artifact.' },
  { number: '03', title: 'Ethscribe it', body: 'Put the exact bytes on Ethereum. Ethscribe identifies the decoded file independently of its wrapper.' },
  { number: '04', title: 'Enter the record', body: 'A verified match fills a known slot. A lost artifact requires a reproducible chain of custody.' },
];

const proposals = [
  { eyebrow: 'WEB HISTORY', title: 'The first PNG', description: 'Trace the earliest surviving Portable Network Graphics files back to their source.' },
  { eyebrow: 'SOFTWARE RELICS', title: 'Browser Wars', description: 'Recover the icons and interface fragments that once fought for the desktop.' },
  { eyebrow: 'INTERNET CULTURE', title: 'Before Emoji', description: 'Find the tiny images and glyphs that taught the early web how to feel.' },
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

function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : 'UNKNOWN';
}

function formatBytes(bytes) {
  return bytes ? `${bytes.toLocaleString('en-US')} bytes` : 'Unknown';
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

function ArtifactDetail({ artifact, onPrepareFinding }) {
  const statusCopy = {
    secured: 'SECURED ONCHAIN',
    open: 'KNOWN BYTES · COLLECTION GAP',
    lost: 'ATTESTED · BYTES LOST',
  };

  return (
    <article className={`artifact-detail detail-${artifact.status}`} aria-live="polite">
      <div className="artifact-detail-visual">
        <ArtifactPreview artifact={artifact} />
        <span className="evidence-grade">EVIDENCE {artifact.evidence}</span>
      </div>
      <div className="artifact-detail-copy">
        <div className="detail-heading">
          <div><p>{artifact.date} / {artifact.release}</p><h3>{artifact.filename}</h3></div>
          <span className={`artifact-state state-${artifact.status}`}>{statusCopy[artifact.status]}</span>
        </div>
        <p className="artifact-note">{artifact.note}</p>
        <dl className="artifact-facts">
          <div><dt>FORMAT</dt><dd>{artifact.format}</dd></div>
          <div><dt>DIMENSIONS</dt><dd>{artifact.dimensions}</dd></div>
          <div><dt>RAW SIZE</dt><dd>{formatBytes(artifact.bytes)}</dd></div>
          <div><dt>SHA-256</dt><dd title={artifact.sha256 || 'Unknown'}>{shortHash(artifact.sha256)}</dd></div>
          <div><dt>KECCAK-256</dt><dd title={artifact.keccak256 || 'Unknown'}>{shortHash(artifact.keccak256)}</dd></div>
          <div><dt>ETHSCRIPTION</dt><dd>{artifact.ethscriptionNumber ? `#${artifact.ethscriptionNumber}` : 'Not in this collection'}</dd></div>
        </dl>
        {artifact.format === 'XPM' && (
          <div className="artifact-prefix"><span>CANONICAL DATA URI</span><code>data:image/x-xpixmap;base64,&lt;exact XPM bytes&gt;</code></div>
        )}
        <div className="artifact-links">
          <a href={artifact.sourceUrl} target="_blank" rel="noreferrer">Inspect primary source <ArrowIcon /></a>
          {artifact.ethscriptionId && (
            <a href={`https://ethscriptions.com/ethscriptions/${artifact.ethscriptionId}`} target="_blank" rel="noreferrer">View Ethscription <ArrowIcon /></a>
          )}
          {artifact.status === 'lost' && (
            <button type="button" onClick={onPrepareFinding}>Prepare a recovery lead <ArrowIcon /></button>
          )}
        </div>
      </div>
    </article>
  );
}

function App() {
  const [account, setAccount] = useState('');
  const [walletState, setWalletState] = useState('idle');
  const [modal, setModal] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [selectedArtifactId, setSelectedArtifactId] = useState(lostArtifact.id);
  const selectedArtifact = artifactById(selectedArtifactId) || lostArtifact;

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return undefined;

    ethereum.request({ method: 'eth_accounts' }).then((accounts) => setAccount(accounts?.[0] || '')).catch(() => {});
    const handleAccountsChanged = (accounts) => setAccount(accounts?.[0] || '');
    ethereum.on?.('accountsChanged', handleAccountsChanged);
    return () => ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
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
      setWalletState('idle');
      return nextAccount;
    } catch (error) {
      setWalletState('idle');
      if (error?.code !== 4001) setModal('wallet-error');
      return '';
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
      setSavedMessage('Lead saved on this device. No transaction was submitted.');
      event.currentTarget.reset();
    } catch {
      setSavedMessage('This browser could not save the lead. Copy your notes before closing.');
    }
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Ethscribe home"><img src="/ethscribe.svg" alt="Ethscribe" /></a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#hunt">Active Hunt</a><a href="#timeline">Timeline</a><a href="#collection">Collection</a><a href="#method">Method</a>
        </nav>
        <button className="wallet-button" type="button" onClick={connectWallet}>
          <WalletIcon />
          {account ? shortAddress(account) : walletState === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker"><span /> Ownable digital archaeology</p>
            <h1>Unearth the bytes that built the internet.</h1>
            <p className="hero-intro">The first expedition maps Satoshi’s icon workshop—seven exact files secured, fifteen known gaps, and one attachment genuinely lost to history.</p>
            <div className="hero-actions">
              <a className="primary-action" href="#hunt">Enter the Genesis Hunt <ArrowIcon /></a>
              <a className="text-action" href="#timeline">Explore the evidence</a>
            </div>
          </div>

          <div className="hero-artifact" aria-label="The Lost Pixels of Satoshi artifact preview">
            <div className="artifact-label top-label"><span>FIELD NOTE 001</span><span>08 FEB 2010</span></div>
            <div className="artifact-stage lost-stage">
              <span className="registration-mark mark-one">+</span><span className="registration-mark mark-two">+</span>
              <img src={referenceImage} alt="Satoshi Nakamoto’s surviving 2010 Bitcoin source artwork" />
              <div className="lost-file-stamp"><strong>bitcoin20x20.png</strong><span>ATTACHMENT MISSING</span></div>
            </div>
            <div className="artifact-label bottom-label">
              <div><span>EXPEDITION</span><strong>THE LOST PIXELS OF SATOSHI</strong></div>
              <div><span>STATUS</span><strong className="status-dot">ONE OPEN MYSTERY</strong></div>
            </div>
          </div>
        </section>

        <section className="ticker" aria-label="Ethscribe principles">
          <div>ONE RAW-BYTE IDENTITY</div><span>✦</span><div>MANY POSSIBLE WRAPPERS</div><span>✦</span><div>VERIFIABLE SOURCES</div><span>✦</span><div>PERMANENT PROVENANCE</div>
        </section>

        <section className="hunt-section" id="hunt">
          <div className="section-heading">
            <div><p className="kicker"><span /> Genesis expedition · Satoshi’s workshop</p><h2>The Lost Pixels of Satoshi</h2></div>
            <div className="hunt-status"><span>HUNT 001</span><strong>CATALOGUE LIVE</strong></div>
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
              <dl className="progress-breakdown">
                <div><dt>SECURED</dt><dd>{huntStats.secured}</dd></div><div><dt>KNOWN GAPS</dt><dd>{huntStats.open}</dd></div>
                <div><dt>LOST LEADS</dt><dd>{huntStats.lost}</dd></div><div><dt>MAPPED COMPONENTS</dt><dd>{huntStats.components}</dd></div>
              </dl>
            </article>
          </div>

          <div className="hunt-lanes">
            <article><span className="lane-index">01 / COMPLETION</span><h3>Known bytes</h3><p>Fifteen exact files remain outside this collection, but their authoritative bytes are public. These are deterministic accession slots: decode, hash, match.</p><strong>A finite completion race</strong></article>
            <article className="lost-lane"><span className="lane-index">02 / ARCHAEOLOGY</span><h3>Lost bytes</h3><p>One file is named in a contemporaneous post but has no verified surviving copy. Popularity cannot recover it; only primary-source provenance can.</p><strong>The real hunt</strong></article>
          </div>

          <section className="timeline-section" id="timeline" aria-labelledby="timeline-title">
            <div className="timeline-heading">
              <div><p className="card-index">EXHIBITION TIMELINE / 2008–2010</p><h3 id="timeline-title">From no icon to a missing one.</h3></div>
              <p>Select a file to inspect its exact-byte record. Green is secured, white is a known gap, and red marks evidence without bytes.</p>
            </div>

            <div className="artifact-timeline">
              {timelineEvents.map((event) => (
                <article className={`timeline-event event-${event.state || 'artifacts'}`} key={event.id}>
                  <div className="timeline-marker"><span /></div>
                  <div className="timeline-event-copy">
                    <time>{event.date}</time><h4>{event.title}</h4><p>{event.copy}</p>
                    {event.artifactIds.length > 0 && (
                      <div className="artifact-chips">
                        {event.artifactIds.map((artifactId) => {
                          const artifact = artifactById(artifactId);
                          return (
                            <button className={`artifact-chip chip-${artifact.status}`} type="button" key={artifact.id} aria-pressed={selectedArtifactId === artifact.id} onClick={() => setSelectedArtifactId(artifact.id)}>
                              <span>{artifact.format}</span><strong>{artifact.filename}</strong>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <ArtifactDetail artifact={selectedArtifact} onPrepareFinding={() => openParticipation('finding')} />
          </section>

          <section className="xpm-lab" aria-labelledby="xpm-title">
            <div className="xpm-lab-preview">
              <XpmPreview source={artifactById('june-32-xpm').previewUrl} label="Live browser-decoded preview of Satoshi’s June 2010 32-pixel XPM" />
              <span>LIVE CLIENT-SIDE DECODE</span>
            </div>
            <div className="xpm-lab-copy">
              <p className="card-index">BYTE LAB / X PIXMAP</p><h3 id="xpm-title">The browser cannot see it. Ethscribe can.</h3>
              <p>XPM is C-style text containing a palette and pixel rows. Modern browsers do not natively display it as an image, and its media type is not registered by IANA. The conventional inscription header is still valid:</p>
              <code>data:image/x-xpixmap;base64,&lt;base64 of the exact .xpm file&gt;</code>
              <p>Ethscribe preserves and hashes the original XPM bytes, then decodes those bytes into a canvas preview in the browser. The preview is derived; it never replaces the artifact.</p>
              <strong>Do not open and resave the source. CRLF line-ending conversion changes the hash.</strong>
            </div>
          </section>

          <div className="hunt-callout">
            <div><span className="callout-number">1</span><p>attested artifact has no verified surviving bytes</p></div>
            <button type="button" className="primary-action dark" onClick={() => openParticipation('finding')}>Prepare a recovery lead <ArrowIcon /></button>
          </div>
        </section>

        <section className="method-section" id="method">
          <div className="section-heading compact">
            <div><p className="kicker"><span /> The field method</p><h2>History deserves proof.</h2></div>
            <p className="section-intro">Known hashes can be verified automatically. Unknown history remains explicitly unresolved until evidence—not wallet count—establishes the bytes.</p>
          </div>
          <div className="process-grid">
            {processSteps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}
          </div>
          <div className="principle-note">
            <strong>ONE FILE IDENTITY. MANY ONCHAIN WRAPPERS.</strong>
            <p>Ethereum establishes inscription history and ownership. Ethscribe separately hashes the decoded raw file, so a MIME change, alternate Data URI, or ESIP-6 duplicate cannot impersonate a new historical artifact.</p>
          </div>
        </section>

        <section className="collection-section" id="collection">
          <div className="section-heading inverse">
            <div><p className="kicker"><span /> Founder collection</p><h2>Seven exact files. Already secured.</h2></div>
            <p className="section-intro">Four archived PNGs and three canonical ICO containers match their historical sources byte for byte. Fourteen extracted ICO frames remain mapped as components, not separate releases.</p>
          </div>

          <div className="collection-catalog">
            {securedArtifacts.map((artifact, index) => (
              <a className="accession-card" href={`https://ethscriptions.com/ethscriptions/${artifact.ethscriptionId}`} target="_blank" rel="noreferrer" key={artifact.id}>
                <div className="accession-preview"><ArtifactPreview artifact={artifact} /><span>{String(index + 1).padStart(2, '0')}</span></div>
                <div><p>{artifact.date} / {artifact.format}</p><h3>{artifact.filename}</h3><code>{shortHash(artifact.sha256)}</code><strong>ETHSCRIPTION #{artifact.ethscriptionNumber}</strong></div>
              </a>
            ))}
          </div>

          <div className="component-note"><span>14 / 14 COMPONENTS MAPPED</span><p>The individually extracted ICO frames are valuable specimens. They nest beneath their canonical container and do not inflate the exhibition’s completion score.</p></div>
        </section>

        <section className="next-section" id="next">
          <div className="section-heading compact">
            <div><p className="kicker"><span /> Future fieldwork</p><h2>What should we hunt next?</h2></div>
            <button type="button" className="text-action proposal-button" onClick={() => openParticipation('proposal')}>Propose an expedition <ArrowIcon /></button>
          </div>
          <div className="proposal-grid">
            {proposals.map((proposal, index) => (
              <article key={proposal.title}><div className="proposal-meta"><span>{proposal.eyebrow}</span><span>0{index + 2}</span></div><h3>{proposal.title}</h3><p>{proposal.description}</p><span className="under-consideration">UNDER CONSIDERATION</span></article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <img src="/ethscribe.svg" alt="Ethscribe" /><p>Recover the artifact. Prove the bytes. Preserve the history.</p>
        <div><a href="https://docs.ethscriptions.com/" target="_blank" rel="noreferrer">Protocol</a><a href="#timeline">Timeline</a><a href="#collection">Collection</a></div><span>© 2026 ETHSCRIBE</span>
      </footer>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section className="participation-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">×</button>

            {modal === 'wallet' && <><p className="kicker"><span /> Wallet required</p><h2 id="modal-title">Bring an Ethereum wallet.</h2><p>Ethscribe uses a wallet as your researcher identity. Install a browser wallet, then return to connect—no funds or signatures are requested on this preview.</p><a className="primary-action" href="https://ethereum.org/en/wallets/find-wallet/" target="_blank" rel="noreferrer">Find a wallet <ArrowIcon /></a></>}
            {modal === 'wallet-error' && <><p className="kicker"><span /> Connection error</p><h2 id="modal-title">The wallet did not connect.</h2><p>Check that your wallet is unlocked and connected to this browser, then try again.</p><button className="primary-action" type="button" onClick={connectWallet}>Try again <ArrowIcon /></button></>}

            {modal === 'finding' && (
              <><p className="kicker"><span /> Recovery notebook</p><h2 id="modal-title">Document a lead.</h2>
                <p>The target is the original `bitcoin20x20.png`, not a reconstruction. Record where the candidate bytes came from and how another researcher can reproduce the chain of custody. This preview saves only to this device.</p>
                <form onSubmit={(event) => saveLocalDraft(event, 'finding')}>
                  <label>Archive or primary-source URL<input name="source" type="url" placeholder="https://archive.example/source" required /></label>
                  <label>Chain of custody<textarea name="evidence" rows="5" placeholder="Where were the bytes found, who preserved them, and why should this be the original attachment?" required /></label>
                  <label>Candidate SHA-256, if available<input name="hash" type="text" placeholder="64 hexadecimal characters" pattern="[a-fA-F0-9]{64}" /></label>
                  <button className="primary-action" type="submit">Save private lead <ArrowIcon /></button>
                </form>
              </>
            )}

            {modal === 'proposal' && (
              <><p className="kicker"><span /> Expedition notebook</p><h2 id="modal-title">Propose the next hunt.</h2><p>Strong expeditions name a culturally important artifact, define an exact target, and begin with credible primary sources. This preview saves only to this device.</p>
                <form onSubmit={(event) => saveLocalDraft(event, 'proposal')}>
                  <label>Expedition title<input name="title" type="text" placeholder="The first…" required /></label>
                  <label>What should researchers find?<textarea name="target" rows="3" placeholder="Describe the exact digital artifacts." required /></label>
                  <label>Starting source<input name="source" type="url" placeholder="https://…" required /></label>
                  <button className="primary-action" type="submit">Save private draft <ArrowIcon /></button>
                </form>
              </>
            )}

            {savedMessage && <p className="saved-message" role="status">{savedMessage}</p>}
            {account && modal !== 'wallet' && modal !== 'wallet-error' && <p className="connected-as">RESEARCHER {shortAddress(account)}</p>}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
