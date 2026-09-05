import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import ExpeditionCard from './ExpeditionCard';
import { MARKET_ADDRESS } from './marketConfig';
import './EburpExpeditionPage.css';

const hashPattern = /^(?:0x)?[a-f\d]{64}$/i;
const transactionPattern = /^0x[a-f\d]{64}$/i;
const addressPattern = /^0x[a-f\d]{40}$/i;
const count = value => new Intl.NumberFormat('en-US').format(value);
const safeLink = value => typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
const sourceImage = artifact => /^data:image\/png(?:;|,)/i.test(artifact.contentUri || '') ? artifact.contentUri : null;
const artifactNumber = artifact => String(artifact.index ?? '').padStart(4, '0');
const columnsForViewport = () => window.innerWidth < 720 ? 4 : window.innerWidth < 1100 ? 6 : 10;
const protocolVerified = artifact => artifact.protocolVerification === true || artifact.protocolVerification?.verified === true;

function dateLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' }).format(date);
}

function StoryParagraph({ paragraph }) {
  if (typeof paragraph === 'string') return <p>{paragraph}</p>;
  if (!Array.isArray(paragraph?.segments)) return null;
  return <p>{paragraph.segments.map((segment, index) => {
    const text = typeof segment.text === 'string' ? segment.text : '';
    return /^https:\/\//i.test(segment.url || '') ? <a key={index} href={segment.url} target="_blank" rel="noreferrer noopener">{text}</a> : <Fragment key={index}>{text}</Fragment>;
  })}</p>;
}

function Sprite({ artifact, decorative = false, className = '' }) {
  const source = sourceImage(artifact);
  return source ? <img className={`eburp-sprite ${className}`} src={source} alt={decorative ? '' : `${artifact.name}, original pixel artwork`} loading="lazy" decoding="async" />
    : <span className="eburp-sprite-unavailable" aria-hidden={decorative || undefined}>Preview unavailable</span>;
}

function collectionCounts(artifacts) {
  return {
    total: artifacts.length,
    core: artifacts.filter(artifact => artifact.collectionGroup === 'core').length,
    archive: artifacts.filter(artifact => artifact.collectionGroup === 'archive').length,
    ethscribed: artifacts.filter(artifact => transactionPattern.test(artifact.ethscriptionId || '')).length,
  };
}

function heroSprites(artifacts, limit = 24) {
  const core = artifacts.filter(artifact => artifact.collectionGroup === 'core' && sourceImage(artifact));
  if (core.length <= limit) return core;
  return Array.from({ length: limit }, (_, index) => core[Math.floor(index * core.length / limit)]);
}

export function EburpExpeditionCard({ expedition }) {
  const artifacts = expedition.artifacts || [];
  const totals = collectionCounts(artifacts);
  return <ExpeditionCard number={expedition.number || '000'} title={expedition.title} path={expedition.path || '/expeditions/eburp'}
    era={expedition.era || 'PIXEL ART · A COMPLETED COLLECTION'} description={expedition.cardDescription || expedition.subtitle || expedition.intro}
    statusLabel="COMPLETE" eyebrow={`COMPLETED COLLECTION / EXPEDITION ${expedition.number || '000'}`}
    actionLabel="VIEW COMPLETED COLLECTION"
    stats={[{ label: 'TOTAL', value: totals.ethscribed }, { label: 'TRADEABLE CORE', value: totals.core }, { label: 'BURNED ARCHIVE', value: totals.archive }]}
    visual={<div className="eburp-directory-sprites">{heroSprites(artifacts, 16).map(artifact => <Sprite key={artifact.id} artifact={artifact} decorative />)}</div>} />;
}

function ArtifactRecord({ artifact, story, headingId, headingRef, onClose, renderMarket, renderOwnership }) {
  const [indexedRecord, setIndexedRecord] = useState(null);
  const onRecord = useCallback(record => {
    setIndexedRecord(record?.transactionHash?.toLowerCase() === artifact.ethscriptionId?.toLowerCase() ? record : null);
  }, [artifact.ethscriptionId]);
  const confirmed = protocolVerified(artifact);
  const freshDate = typeof indexedRecord?.blockTimestamp === 'number' && indexedRecord.blockTimestamp > 0 ? dateLabel(indexedRecord.blockTimestamp * 1000) : null;
  const recordedDate = freshDate || (confirmed ? dateLabel(artifact.ethscribedAt) : null);
  const creator = addressPattern.test(indexedRecord?.creator || '') ? indexedRecord.creator : confirmed && addressPattern.test(artifact.creator || '') ? artifact.creator : null;
  const owner = addressPattern.test(indexedRecord?.currentOwner || '') ? indexedRecord.currentOwner : null;
  const isCore = artifact.collectionGroup === 'core';
  const groupLabel = isCore ? 'Tradeable Core' : 'Burned Archive';
  return <section id={`record-${artifact.id}`} className="eburp-artifact-record artifact-detail" aria-labelledby={headingId} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="record-toolbar"><span>EBURP #{artifactNumber(artifact)}</span><button type="button" onClick={onClose}>Close record <span aria-hidden="true">×</span></button></div>
    <div className="artifact-detail-overview">
      <div className="artifact-detail-visual eburp-dossier-visual"><div className="file-preview"><Sprite artifact={artifact} /></div><p className="display-scale-note">PREVIEW ENLARGED WITH NEAREST-NEIGHBOR SCALING<br />NATIVE {artifact.width || 16} × {artifact.height || 16} PIXELS</p></div>
      <div className="artifact-detail-summary">
        <div className="detail-heading"><div><p>EBURP #{artifactNumber(artifact)} / {groupLabel}</p><h3 id={headingId} ref={headingRef} tabIndex={-1}>{artifact.name}</h3></div><span className="artifact-state eburp-record-group">{groupLabel}</span></div>
        <p className="eburp-character-type">{[artifact.type, artifact.heroClass].filter(Boolean).join(' · ')}</p>
        {artifact.description && <p className="artifact-note">{artifact.description}</p>}
        {isCore && artifact.verifiedSourceMatch === true && renderMarket ? renderMarket({ artifact, onRecord }) : !isCore && renderOwnership ? renderOwnership({ artifact, onRecord }) : null}
      </div>
    </div>
    <div className="artifact-record-shell artifact-found-record">
      <section className="artifact-record-section artifact-file-section" aria-labelledby={`${headingId}-file`}>
        <h4 id={`${headingId}-file`}><span>01</span> File information</h4>
        <dl className="artifact-record-grid compact-record-grid">
          <div className="record-fact"><dt>FORMAT</dt><dd>PNG</dd></div>
          <div className="record-fact"><dt>RAW FILE SIZE</dt><dd>{Number.isSafeInteger(artifact.byteLength) ? `${count(artifact.byteLength)} bytes` : 'Not recorded'}</dd></div>
          <div className="record-fact record-fact-wide"><dt>DECODED RAW FILE SHA-256</dt><dd><code>{hashPattern.test(artifact.rawSha256 || '') ? artifact.rawSha256 : 'Not established'}</code></dd></div>
        </dl>
      </section>
      <section className="artifact-record-section artifact-transaction-section" aria-labelledby={`${headingId}-transaction`}>
        <h4 id={`${headingId}-transaction`}><span>02</span> Ethscription</h4>
        <dl className="artifact-record-grid eburp-ethscription-facts">
          <div className="record-fact"><dt>ID / CREATION TX</dt><dd className="linked-record-value">{transactionPattern.test(artifact.ethscriptionId || '') ? <><a href={`https://etherscan.io/tx/${artifact.ethscriptionId}`} title={artifact.ethscriptionId} target="_blank" rel="noreferrer noopener">{`${artifact.ethscriptionId.slice(0, 6)}...${artifact.ethscriptionId.slice(-4)}`}</a><span><a href={`https://ethscriptions.com/ethscriptions/${artifact.ethscriptionId}`} target="_blank" rel="noreferrer noopener">View the existing Ethscription ↗</a></span></> : 'Not established'}</dd></div>
          <div className="record-fact"><dt>ETHSCRIBED</dt><dd>{recordedDate ? `${recordedDate} · UTC` : 'See creation transaction'}</dd></div>
          <div className="record-fact"><dt>ETHSCRIBING WALLET</dt><dd>{creator ? <a href={`https://etherscan.io/address/${creator}`} target="_blank" rel="noreferrer noopener">{creator}</a> : 'See creation transaction'}</dd></div>
          <div className="record-fact"><dt>OWNER WALLET</dt><dd>{owner ? <><a href={`https://etherscan.io/address/${owner}`} target="_blank" rel="noreferrer noopener">{owner}</a>{owner.toLowerCase() === MARKET_ADDRESS.toLowerCase() && <small className="eburp-owner-custody">Marketplace custody</small>}</> : 'Current owner not verified'}</dd></div>
        </dl>
      </section>
    </div>
    {!indexedRecord && !confirmed && transactionPattern.test(artifact.ethscriptionId || '') && <p className="eburp-protocol-note">Catalogue record · not freshly rechecked. This does not mean the Ethscription is absent or invalid.</p>}
    <details className="eburp-source-trail"><summary>The source trail and artwork rights</summary>
      <p className="eburp-reference-label">{artifact.verifiedSourceMatch === true ? 'Exact bytes matched to the preserved source.' : 'Preserved collection reference; an original source match is not established here.'}</p>
      {artifact.provenanceNote && <p>{artifact.provenanceNote}</p>}{artifact.sourcePath && <dl><div><dt>Preserved source path</dt><dd><code>{artifact.sourcePath}</code></dd></div></dl>}{safeLink(artifact.sourceUrl) && <a href={artifact.sourceUrl} target="_blank" rel="noreferrer noopener">Inspect source evidence <span aria-hidden="true">↗</span></a>}<p className="eburp-rights-note">{artifact.rightsNote || story.rightsNote || 'An Ethscription preserves a file and its ownership record. It does not transfer copyright or imply permission to reuse the artwork.'}</p>
    </details>
  </section>;
}

export default function EburpExpeditionPage({ expedition, story = {}, header, footer, localPreview = import.meta.env.DEV, renderMarket, renderOwnership }) {
  const artifacts = expedition.artifacts || [];
  const initialArtifact = () => {
    const requested = new URLSearchParams(window.location.search).get('artifact') || window.location.hash.replace(/^#record-/, '');
    return artifacts.find(artifact => artifact.id === requested) || null;
  };
  const [selectedId, setSelectedId] = useState(() => initialArtifact()?.id || null);
  const [group, setGroup] = useState(() => initialArtifact()?.collectionGroup || 'core');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [columns, setColumns] = useState(columnsForViewport);
  const recordHeading = useRef(null);
  const galleryHeading = useRef(null);
  const lastOpener = useRef(null);
  const prefix = `eburp-${useId().replace(/:/g, '')}`;
  const totals = collectionCounts(artifacts);
  const selected = artifacts.find(artifact => artifact.id === selectedId);
  const grouped = useMemo(() => artifacts.filter(artifact => artifact.collectionGroup === group), [artifacts, group]);
  const categories = [...new Set(grouped.map(artifact => artifact.type).filter(Boolean))].sort();
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return grouped.filter(artifact => (category === 'all' || artifact.type === category) && (!search || [artifact.name, artifact.heroClass, artifact.type, artifact.id, artifact.index].filter(value => value != null).join(' ').toLocaleLowerCase().includes(search)));
  }, [grouped, category, query]);
  const visible = filtered;
  const selectedIndex = visible.findIndex(artifact => artifact.id === selectedId);
  const recordAfterIndex = selectedIndex < 0 ? -1 : Math.min(visible.length - 1, Math.ceil((selectedIndex + 1) / columns) * columns - 1);
  const archiveLabel = 'Burned Archive';
  const chapters = story.chapters || [];

  useEffect(() => {
    const resize = () => setColumns(columnsForViewport());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const synchronize = () => {
      const initial = initialArtifact();
      setSelectedId(initial?.id || null);
      setQuery(''); setCategory('all');
      if (initial) {
        setGroup(initial.collectionGroup);
      }
      lastOpener.current = null;
    };
    synchronize();
    window.addEventListener('popstate', synchronize);
    window.addEventListener('hashchange', synchronize);
    return () => { window.removeEventListener('popstate', synchronize); window.removeEventListener('hashchange', synchronize); };
  }, [expedition.id]);

  useEffect(() => {
    if (!selectedId) return;
    recordHeading.current?.focus({ preventScroll: true });
    recordHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [selectedId]);

  function clearSelection(restoreFocus = false) {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('artifact'); url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    if (restoreFocus) (lastOpener.current || galleryHeading.current)?.focus();
  }

  function openArtifact(artifact, trigger, fromHero = false) {
    lastOpener.current = trigger;
    if (selectedId === artifact.id && !fromHero) { clearSelection(true); return; }
    if (fromHero) {
      setGroup(artifact.collectionGroup); setQuery(''); setCategory('all');
    }
    setSelectedId(artifact.id);
    const url = new URL(window.location.href);
    url.searchParams.set('artifact', artifact.id); url.hash = `record-${artifact.id}`;
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    if (selectedId === artifact.id) { recordHeading.current?.focus({ preventScroll: true }); recordHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' }); }
  }

  function changeGroup(value) { clearSelection(); setGroup(value); setQuery(''); setCategory('all'); }

  return <div className="eburp-expedition-page">
    {header}
    <main id="main-content" tabIndex={-1}>
      {import.meta.env.DEV && localPreview && <div className="eburp-local-note">LOCAL PREVIEW · TRANSACTIONS DISABLED</div>}
      <section className="eburp-hero" aria-labelledby={`${prefix}-title`}>
        <div className="eburp-hero-heading">
          <nav className="eburp-breadcrumb" aria-label="Breadcrumb"><a href="/expeditions">Expeditions</a><span aria-hidden="true">/</span><span>{expedition.number || '000'}</span></nav>
          <p className="eburp-eyebrow"><span className="eburp-complete-badge">COMPLETE</span> Expedition {expedition.number || '000'}</p>
          <h1 id={`${prefix}-title`}>{expedition.title}</h1>
          <p className="eburp-subtitle">{expedition.subtitle}</p>
        </div>
        <section className="eburp-contact-sheet" aria-labelledby={`${prefix}-contact-title`}>
          <div className="eburp-contact-heading"><h2 id={`${prefix}-contact-title`}>Small pixels. A bigger story.</h2><span>From the core collection</span></div>
          <div className="eburp-hero-grid">{heroSprites(artifacts).map(artifact => <button key={artifact.id} type="button" title={artifact.name} aria-label={`Explore ${artifact.name}, EBURP ${artifactNumber(artifact)}`} aria-expanded={selectedId === artifact.id} aria-controls={`record-${artifact.id}`} onClick={event => openArtifact(artifact, event.currentTarget, true)}><Sprite artifact={artifact} decorative /></button>)}</div>
          <p>Original 16 × 16 artwork, enlarged pixel by pixel.</p>
        </section>
        <div className="eburp-hero-details">
          <p className="eburp-intro">{expedition.intro}</p>
          <dl className="eburp-collection-counts"><div><dt>Recorded Ethscriptions</dt><dd>{totals.ethscribed}</dd></div><div><dt>Tradeable Core</dt><dd>{totals.core}</dd></div><div><dt>{archiveLabel}</dt><dd>{totals.archive}</dd></div></dl>
          <p className="eburp-completion-note">{expedition.completionNote || 'A completed collection record—not a claim of current marketplace custody or availability for sale.'}</p>
          <div className="eburp-hero-links"><a className="eburp-primary-link" href="#eburp-collection">Explore the collection <span aria-hidden="true">↓</span></a>{chapters.length > 0 && <a className="eburp-text-link" href="#eburp-story">Read its story</a>}</div>
        </div>
      </section>

      <section id="eburp-collection" className="eburp-gallery" aria-labelledby={`${prefix}-gallery-title`}>
        <div className="eburp-section-heading"><div><p className="eburp-eyebrow">The collection, preserved</p><h2 id={`${prefix}-gallery-title`} ref={galleryHeading} tabIndex={-1}>Meet the characters.</h2></div><p>{expedition.galleryIntro || 'Explore each original PNG, its creation record, and the evidence behind its place in the collection.'}</p></div>
        <div className="eburp-group-toggle" role="group" aria-label="Collection group"><button type="button" aria-pressed={group === 'core'} onClick={() => changeGroup('core')}>Tradeable Core <span>{totals.core}</span></button><button type="button" aria-pressed={group === 'archive'} onClick={() => changeGroup('archive')}>{archiveLabel} <span>{totals.archive}</span></button></div>
        <p className="eburp-group-note">{group === 'archive' ? expedition.archiveNote || 'The curator’s burned archival group, preserved for historical reference. Current ownership is checked separately when a record is opened.' : expedition.coreNote || 'The tradeable core collection. Open a character to inspect its current ownership and marketplace status.'}</p>
        <div className="eburp-gallery-filters"><label>Search the collection<input type="search" placeholder="Names, classes, or numbers" value={query} onChange={event => { clearSelection(); setQuery(event.target.value); }} /></label><label>Character type<select value={category} onChange={event => { clearSelection(); setCategory(event.target.value); }}><option value="all">All types</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label><p role="status">{count(filtered.length)} {filtered.length === 1 ? 'character' : 'characters'}</p></div>
        <div className="eburp-artifact-grid">
          {visible.map((artifact, index) => <Fragment key={artifact.id}>
            <button type="button" className="eburp-artifact-card" title={`${artifact.name} · EBURP #${artifactNumber(artifact)}`} aria-label={`Open ${artifact.name}, EBURP ${artifactNumber(artifact)}`} aria-expanded={selectedId === artifact.id} aria-controls={`record-${artifact.id}`} onClick={event => openArtifact(artifact, event.currentTarget)}><span className="eburp-card-art"><Sprite artifact={artifact} decorative /></span></button>
            {selected && index === recordAfterIndex && <ArtifactRecord key={selected.id} artifact={selected} story={story} headingId={`${prefix}-record-heading`} headingRef={recordHeading} onClose={() => clearSelection(true)} renderMarket={renderMarket} renderOwnership={renderOwnership} />}
          </Fragment>)}
        </div>
        {filtered.length === 0 && <div className="eburp-empty-state"><p>No characters match those filters.</p><button type="button" className="eburp-secondary-button" onClick={() => { setQuery(''); setCategory('all'); }}>Clear filters</button></div>}
      </section>

      {chapters.length > 0 && <section id="eburp-story" className="eburp-story" aria-labelledby={`${prefix}-story-title`}><div className="eburp-section-heading"><div><p className="eburp-eyebrow">From a game to an onchain archive</p><h2 id={`${prefix}-story-title`}>{story.title || 'The story behind the sprites.'}</h2></div>{story.intro && <p>{story.intro}</p>}</div><div className="eburp-story-chapters">{chapters.map((chapter, index) => <article className="eburp-story-chapter" key={`${chapter.date}-${index}`}><p className="eburp-chapter-date">{chapter.date}</p><div><h3>{chapter.title}</h3>{(chapter.paragraphs || []).map((paragraph, paragraphIndex) => <StoryParagraph key={paragraphIndex} paragraph={paragraph} />)}{!!chapter.sources?.length && <ul className="eburp-chapter-sources">{chapter.sources.filter(source => safeLink(source.url)).map((source, sourceIndex) => <li key={`${source.url}-${sourceIndex}`}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.title} <span aria-hidden="true">↗</span></a></li>)}</ul>}</div></article>)}</div></section>}
      {expedition.verification && <details className="eburp-verification-note"><summary>What this archive has verified</summary><p>{count(artifacts.filter(artifact => hashPattern.test(artifact.rawSha256 || '')).length)} catalogue PNGs have recorded raw-byte hashes.{Number.isSafeInteger(expedition.verification.sourceMatchedCount) && ` ${count(expedition.verification.sourceMatchedCount)} core files match the preserved source.`}{Number.isSafeInteger(expedition.verification.officialRecordVerifiedCount) && ` ${count(expedition.verification.officialRecordVerifiedCount)} creation records were freshly rechecked against the official index.`}{expedition.verification.officialRecordNotRecheckedCount > 0 && ` The remaining ${count(expedition.verification.officialRecordNotRecheckedCount)} were not rechecked in this audit after API rate limiting—not marked absent or invalid.`}</p></details>}
      {!!expedition.sources?.length && <section className="eburp-source-notebook" aria-labelledby={`${prefix}-sources-title`}><h2 id={`${prefix}-sources-title`}>Continue the research.</h2><ul>{expedition.sources.filter(source => safeLink(source.url)).map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.title} <span aria-hidden="true">↗</span></a>{source.note && <p>{source.note}</p>}</li>)}</ul></section>}
      <div className="eburp-footer-note"><a href="/expeditions">← Back to expeditions</a><p>{story.rightsNote || 'Preserving an artifact and documenting its history does not transfer copyright or grant a license to reuse its artwork.'}</p></div>
    </main>
    {footer}
  </div>;
}
