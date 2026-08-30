import { useEffect, useState } from 'react';
import './App.css';

const referenceImage =
  'https://raw.githubusercontent.com/lugaxker/nakamoto-archive/main/src/bitcoin530.png';

const targetFiles = [
  { size: '16 × 16', file: 'bitcoin16.ico' },
  { size: '20 × 20', file: 'bitcoin20.ico' },
  { size: '32 × 32', file: 'bitcoin32.ico' },
  { size: '48 × 48', file: 'bitcoin48.ico' },
];

const processSteps = [
  {
    number: '01',
    title: 'Follow the clue',
    body: 'Each expedition starts with a precise artifact, historical context, and primary sources.',
  },
  {
    number: '02',
    title: 'Match the bytes',
    body: 'Find the original file and prove it with an exact cryptographic hash—not a lookalike.',
  },
  {
    number: '03',
    title: 'Ethscribe it',
    body: 'The first valid inscription establishes a unique, transferable onchain artifact.',
  },
  {
    number: '04',
    title: 'Enter the archive',
    body: 'Accepted findings receive a permanent accession page and become eligible for trading.',
  },
];

const proposals = [
  {
    eyebrow: 'WEB HISTORY',
    title: 'The first PNG',
    description: 'Trace the earliest surviving Portable Network Graphics files back to their source.',
  },
  {
    eyebrow: 'SOFTWARE RELICS',
    title: 'Browser Wars',
    description: 'Recover the icons and interface fragments that once fought for the desktop.',
  },
  {
    eyebrow: 'INTERNET CULTURE',
    title: 'Before Emoji',
    description: 'Find the tiny images and glyphs that taught the early web how to feel.',
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 9h11M10 4l5 5-5 5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.5 5.5h13v10h-13zM2.5 5.5 5 3h10.5v2.5M12 9h5.5v4H12z" />
    </svg>
  );
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
}

function App() {
  const [account, setAccount] = useState('');
  const [walletState, setWalletState] = useState('idle');
  const [modal, setModal] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const ethereum = window.ethereum;

    if (!ethereum) return undefined;

    ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => setAccount(accounts?.[0] || ''))
      .catch(() => {});

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
      setSavedMessage('Draft saved on this device. No transaction was submitted.');
      event.currentTarget.reset();
    } catch {
      setSavedMessage('This browser could not save the draft. Copy your notes before closing.');
    }
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Ethscribe home">
          <img src="/ethscribe.svg" alt="Ethscribe" />
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#hunt">Active Hunt</a>
          <a href="#collection">Collection</a>
          <a href="#method">How It Works</a>
        </nav>
        <button className="wallet-button" type="button" onClick={connectWallet}>
          <WalletIcon />
          {account
            ? shortAddress(account)
            : walletState === 'connecting'
              ? 'Connecting…'
              : 'Connect Wallet'}
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker"><span /> Ownable digital archaeology</p>
            <h1>Unearth the bytes that built the internet.</h1>
            <p className="hero-intro">
              Field expeditions to recover historically significant digital artifacts—matched byte
              for byte, inscribed on Ethereum, and preserved forever.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#hunt">
                Enter the Genesis Hunt <ArrowIcon />
              </a>
              <a className="text-action" href="#method">How expeditions work</a>
            </div>
          </div>

          <div className="hero-artifact" aria-label="Genesis Hunt artifact preview">
            <div className="artifact-label top-label">
              <span>FIELD NOTE 001</span>
              <span>24 FEB 2010</span>
            </div>
            <div className="artifact-stage">
              <span className="registration-mark mark-one">+</span>
              <span className="registration-mark mark-two">+</span>
              <img src={referenceImage} alt="Satoshi Nakamoto's 2010 gold Bitcoin logo" />
            </div>
            <div className="artifact-label bottom-label">
              <div>
                <span>SUBJECT</span>
                <strong>SATOSHI’S ORIGINAL ICONS</strong>
              </div>
              <div>
                <span>STATUS</span>
                <strong className="status-dot">PREVIEW</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="ticker" aria-label="Ethscribe principles">
          <div>ONE ARTIFACT</div><span>✦</span>
          <div>ONE HASH</div><span>✦</span>
          <div>ONE FIRST INSCRIPTION</div><span>✦</span>
          <div>PERMANENT PROVENANCE</div>
        </section>

        <section className="hunt-section" id="hunt">
          <div className="section-heading">
            <div>
              <p className="kicker"><span /> Genesis expedition</p>
              <h2>Satoshi’s Workshop</h2>
            </div>
            <div className="hunt-status">
              <span>HUNT 001</span>
              <strong>OPENING SOON</strong>
            </div>
          </div>

          <div className="hunt-grid">
            <article className="source-card">
              <p className="card-index">PRIMARY SOURCE / 001</p>
              <blockquote>
                “New icons, what do you think? Better than the old one?”
              </blockquote>
              <p>
                On February 24, 2010, Satoshi Nakamoto posted a new set of Bitcoin icons to the
                Bitcointalk forum and released them into the public domain. The full-size PNG
                survives. The hunt is for the exact icon files it was made to produce.
              </p>
              <a
                className="source-link"
                href="https://bitcointalk.org/index.php?topic=64.msg504#msg504"
                target="_blank"
                rel="noreferrer"
              >
                Read the original post <ArrowIcon />
              </a>
            </article>

            <article className="manifest-card">
              <p className="card-index">TARGET MANIFEST / 004 FILES</p>
              <div className="manifest-list">
                {targetFiles.map((target, index) => (
                  <div className="manifest-row" key={target.file}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{target.size}</strong>
                    <code>{target.file}</code>
                    <em>UNEARTHED</em>
                  </div>
                ))}
              </div>
              <p className="manifest-note">
                A visual match is not enough. Findings must reproduce the original bytes and be
                supported by a source trail that another researcher can follow.
              </p>
            </article>
          </div>

          <div className="hunt-callout">
            <div>
              <span className="callout-number">4</span>
              <p>exact artifacts remain to be accessioned</p>
            </div>
            <button type="button" className="primary-action dark" onClick={() => openParticipation('finding')}>
              Prepare a finding <ArrowIcon />
            </button>
          </div>
        </section>

        <section className="method-section" id="method">
          <div className="section-heading compact">
            <div>
              <p className="kicker"><span /> The field method</p>
              <h2>History deserves proof.</h2>
            </div>
            <p className="section-intro">
              Ethscribe separates discovery from speculation. Researchers surface the evidence;
              exact hashes, primary sources, and transparent review establish the record.
            </p>
          </div>
          <div className="process-grid">
            {processSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <div className="principle-note">
            <strong>CURATED DISCOVERY. TRUSTLESS OWNERSHIP.</strong>
            <p>
              Community signals help the strongest evidence rise. Accession decisions follow a
              published rubric. Ethereum handles uniqueness and ownership—not historical truth.
            </p>
          </div>
        </section>

        <section className="collection-section" id="collection">
          <div className="section-heading inverse">
            <div>
              <p className="kicker"><span /> Permanent collection</p>
              <h2>The archive begins here.</h2>
            </div>
            <p className="section-intro">
              Every accession will connect the artifact, its bytes, its ownership trail, and the
              evidence that earned it a place in the collection.
            </p>
          </div>

          <div className="collection-grid">
            <article className="collection-object">
              <div className="object-image">
                <img src={referenceImage} alt="Bitcoin 530 pixel source artwork" />
                <span>REFERENCE OBJECT</span>
              </div>
              <div className="object-copy">
                <p>NAKAMOTO ARCHIVE / 2010</p>
                <h3>bitcoin530.png</h3>
                <dl>
                  <div><dt>SHA-256</dt><dd>ce2718…df6413</dd></div>
                  <div><dt>RIGHTS</dt><dd>Public domain</dd></div>
                  <div><dt>ROLE</dt><dd>Source reference</dd></div>
                </dl>
              </div>
            </article>
            <article className="empty-accession">
              <span>ACCESSION 0001</span>
              <div className="empty-mark">?</div>
              <h3>Waiting to be unearthed</h3>
              <p>The first verified icon will become the collection’s first accession.</p>
            </article>
          </div>

          <a
            className="archive-credit"
            href="https://github.com/lugaxker/nakamoto-archive"
            target="_blank"
            rel="noreferrer"
          >
            Inspect the public Nakamoto Archive <ArrowIcon />
          </a>
        </section>

        <section className="next-section" id="next">
          <div className="section-heading compact">
            <div>
              <p className="kicker"><span /> Future fieldwork</p>
              <h2>What should we hunt next?</h2>
            </div>
            <button type="button" className="text-action proposal-button" onClick={() => openParticipation('proposal')}>
              Propose an expedition <ArrowIcon />
            </button>
          </div>
          <div className="proposal-grid">
            {proposals.map((proposal, index) => (
              <article key={proposal.title}>
                <div className="proposal-meta">
                  <span>{proposal.eyebrow}</span>
                  <span>0{index + 2}</span>
                </div>
                <h3>{proposal.title}</h3>
                <p>{proposal.description}</p>
                <span className="under-consideration">UNDER CONSIDERATION</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <img src="/ethscribe.svg" alt="Ethscribe" />
        <p>Recover the artifact. Prove the bytes. Preserve the history.</p>
        <div>
          <a href="https://docs.ethscriptions.com/" target="_blank" rel="noreferrer">Protocol</a>
          <a href="#method">Method</a>
          <a href="#collection">Archive</a>
        </div>
        <span>© 2026 ETHSCRIBE</span>
      </footer>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section
            className="participation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">
              ×
            </button>

            {modal === 'wallet' && (
              <>
                <p className="kicker"><span /> Wallet required</p>
                <h2 id="modal-title">Bring an Ethereum wallet.</h2>
                <p>
                  Ethscribe uses a wallet as your researcher identity. Install a browser wallet,
                  then return to connect—no funds or signatures are requested on this preview.
                </p>
                <a className="primary-action" href="https://ethereum.org/en/wallets/find-wallet/" target="_blank" rel="noreferrer">
                  Find a wallet <ArrowIcon />
                </a>
              </>
            )}

            {modal === 'wallet-error' && (
              <>
                <p className="kicker"><span /> Connection error</p>
                <h2 id="modal-title">The wallet did not connect.</h2>
                <p>Check that your wallet is unlocked and connected to this browser, then try again.</p>
                <button className="primary-action" type="button" onClick={connectWallet}>Try again <ArrowIcon /></button>
              </>
            )}

            {modal === 'finding' && (
              <>
                <p className="kicker"><span /> Research notebook</p>
                <h2 id="modal-title">Prepare a finding.</h2>
                <p>
                  Record a candidate and its evidence now. This preview saves only to this device;
                  public submissions and onchain deposits open with the marketplace contract.
                </p>
                <form onSubmit={(event) => saveLocalDraft(event, 'finding')}>
                  <label>
                    Candidate file or URL
                    <input name="candidate" type="url" placeholder="https://archive.example/file.ico" required />
                  </label>
                  <label>
                    Evidence trail
                    <textarea name="evidence" rows="4" placeholder="Where was it found, and how does the source establish its date?" required />
                  </label>
                  <label>
                    SHA-256 hash
                    <input name="hash" type="text" placeholder="64 hexadecimal characters" pattern="[a-fA-F0-9]{64}" required />
                  </label>
                  <button className="primary-action" type="submit">Save private draft <ArrowIcon /></button>
                </form>
              </>
            )}

            {modal === 'proposal' && (
              <>
                <p className="kicker"><span /> Expedition notebook</p>
                <h2 id="modal-title">Propose the next hunt.</h2>
                <p>
                  Strong expeditions name a culturally important artifact, define an exact target,
                  and begin with credible primary sources. This preview saves only to this device.
                </p>
                <form onSubmit={(event) => saveLocalDraft(event, 'proposal')}>
                  <label>
                    Expedition title
                    <input name="title" type="text" placeholder="The first…" required />
                  </label>
                  <label>
                    What should researchers find?
                    <textarea name="target" rows="3" placeholder="Describe the exact digital artifacts." required />
                  </label>
                  <label>
                    Starting source
                    <input name="source" type="url" placeholder="https://…" required />
                  </label>
                  <button className="primary-action" type="submit">Save private draft <ArrowIcon /></button>
                </form>
              </>
            )}

            {savedMessage && <p className="saved-message" role="status">{savedMessage}</p>}
            {account && modal !== 'wallet' && modal !== 'wallet-error' && (
              <p className="connected-as">RESEARCHER {shortAddress(account)}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
