import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './SoundExpeditionPage.css';
import ExpeditionCard from './ExpeditionCard';

const ethscriptionPattern = /^0x[\da-f]{64}$/i;
const formatNumber = value => new Intl.NumberFormat('en-US').format(value);

function SpeakerMark() {
  return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 12h6l7-6v20l-7-6H5zM23 11c3 3 3 7 0 10M27 7c6 5 6 13 0 18" /></svg>;
}

function durationLabel(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not measured';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 3 })} seconds`;
}

function FileFacts({ target }) {
  return <dl className="sound-file-facts">
    <div><dt>Original file</dt><dd>{target.fileName}</dd></div>
    <div><dt>Format</dt><dd>{target.format}</dd></div>
    <div><dt>Raw file size</dt><dd>{typeof target.bytes === 'number' ? `${formatNumber(target.bytes)} bytes` : 'Not recorded'}</dd></div>
    <div><dt>Duration</dt><dd>{durationLabel(target.durationSeconds)}</dd></div>
    <div><dt>Sample rate</dt><dd>{typeof target.sampleRate === 'number' ? `${formatNumber(target.sampleRate)} Hz` : 'Not recorded'}</dd></div>
    <div><dt>Channels / bit depth</dt><dd>{typeof target.channels === 'number' ? `${target.channels === 1 ? 'Mono' : target.channels === 2 ? 'Stereo' : `${target.channels} channels`}${typeof target.bitsPerSample === 'number' ? ` · ${target.bitsPerSample}-bit` : ''}` : 'Not recorded'}</dd></div>
    <div className="sound-file-hash"><dt>Decoded raw file SHA-256</dt><dd><code>{target.sha256}</code></dd></div>
  </dl>;
}

export function SoundExpeditionCard({ expedition }) {
  const recognized = expedition.targets.filter(target => ethscriptionPattern.test(target.ethscriptionId || '')).length;
  return <ExpeditionCard number={expedition.id} title={expedition.title} path={`/expeditions/${expedition.slug}`}
    era="SOUND · 1992–2000"
    description={`${expedition.subtitle} ${expedition.targets.length} exact-file targets. Recover the original sounds of the desktop, dial-up mail, and instant messaging—not new recordings of them.`}
    recognized={recognized} total={expedition.targets.length}
    visual={<div className="expedition-card-sound-visual"><SpeakerMark /><p>The original files.<br />Not a re-recording.</p></div>} />;
}

export default function SoundExpeditionPage({ expedition, header, footer, renderSubmission, renderMarket, onFindingPublished, findingIndexState }) {
  const requestedTarget = () => {
    const requested = new URLSearchParams(window.location.search).get('artifact') || window.location.hash.replace(/^#record-/, '');
    return expedition.targets.some(target => target.id === requested) ? requested : null;
  };
  const [selectedId, setSelectedId] = useState(requestedTarget);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const buttons = useRef(new Map());
  const lastOpener = useRef(null);
  const recordHeading = useRef(null);
  const idPrefix = `sound-${useId().replace(/:/g, '')}`;
  const groups = useMemo(() => {
    const releases = new Map();
    for (const target of expedition.targets) {
      const release = target.release || 'Source collection';
      if (!releases.has(release)) releases.set(release, []);
      releases.get(release).push(target);
    }
    return [...releases].map(([release, targets]) => ({ release, targets }));
  }, [expedition.targets]);
  const selected = expedition.targets.find(target => target.id === selectedId);
  const recognized = expedition.targets.filter(target => ethscriptionPattern.test(target.ethscriptionId || '')).length;
  const selectedRecognized = ethscriptionPattern.test(selected?.ethscriptionId || '');

  useEffect(() => {
    const synchronize = () => { lastOpener.current = null; setSelectedId(requestedTarget()); setSubmissionOpen(false); };
    synchronize();
    window.addEventListener('popstate', synchronize);
    window.addEventListener('hashchange', synchronize);
    return () => { window.removeEventListener('popstate', synchronize); window.removeEventListener('hashchange', synchronize); };
  }, [expedition.id, expedition.slug]);
  useEffect(() => {
    if (!selectedId) return;
    recordHeading.current?.focus({ preventScroll: true });
    recordHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [selectedId]);

  function closeRecord() {
    const selectedButton = lastOpener.current || buttons.current.get(selectedId);
    setSelectedId(null);
    setSubmissionOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('artifact');
    url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    selectedButton?.focus();
  }

  function openRecord(targetId, trigger, toggle = true) {
    lastOpener.current = trigger || buttons.current.get(targetId);
    if (selectedId === targetId) {
      if (toggle) closeRecord();
      else {
        recordHeading.current?.focus({ preventScroll: true });
        recordHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
      }
      return;
    }
    setSelectedId(targetId);
    setSubmissionOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('artifact', targetId);
    url.hash = `record-${targetId}`;
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function findingPublished(finding) {
    setSubmissionOpen(false);
    onFindingPublished?.(finding);
  }

  return <div className="sound-expedition-page">
    {header}
    <main id="main-content" tabIndex={-1}>
      <section className="sound-hero" aria-labelledby="sound-expedition-title">
        <div className="sound-hero-copy">
          <div className="sound-hero-heading">
            <nav aria-label="Breadcrumb" className="sound-breadcrumb"><a href="/expeditions">Expeditions</a><span aria-hidden="true">/</span><span>{expedition.id}</span></nav>
            <p className="sound-eyebrow sound-active-kicker"><span aria-hidden="true" /> Active hunt · Expedition {expedition.id}</p>
            <h1 id="sound-expedition-title">{expedition.title}</h1>
            <p className="sound-subtitle">{expedition.subtitle}</p>
          </div>
          <div className="sound-hero-brief"><p>{expedition.intro}</p><p className="sound-hunt-progress" aria-live="polite"><strong>{recognized} / {expedition.targets.length}</strong> recognized <span>· {expedition.targets.length - recognized} open targets</span></p><a href="#sound-files">Find your next target <span aria-hidden="true">↓</span></a></div>
        </div>
        <section className="sound-completion" aria-labelledby="sound-completion-title">
          <div className="sound-completion-heading"><h2 id="sound-completion-title">The expedition record</h2><span>{expedition.targets.length} sound files</span></div>
          <div className="sound-completion-grid" role="group" aria-label="Expedition completion grid">
            {expedition.targets.map((target, index) => {
              const isRecognized = ethscriptionPattern.test(target.ethscriptionId || '');
              return <button
                key={target.id}
                type="button"
                className={`sound-completion-slot${isRecognized ? ' sound-completion-recognized' : ''}`}
                aria-label={`Open ${target.title}, ${target.fileName}, ${isRecognized ? 'Ethscribed' : 'open target'}`}
                aria-expanded={selectedId === target.id}
                aria-controls={`record-${target.id}`}
                title={`${target.title} · ${target.fileName} · ${target.release}`}
                onClick={event => openRecord(target.id, event.currentTarget, false)}
              >
                <span className="sound-completion-slot-meta"><span>{String(index + 1).padStart(2, '0')}</span><span>{isRecognized ? 'ETHSCRIBED' : 'OPEN'}</span></span>
                <SpeakerMark />
                <strong>{target.fileName}</strong>
                <span className="sound-completion-slot-title">{target.title}</span>
              </button>;
            })}
          </div>
          <p className="sound-completion-key"><span><i className="sound-key-recognized" aria-hidden="true" />Ethscribed</span><span><i aria-hidden="true" />Open target</span></p>
        </section>
      </section>

      <section className="sound-catalogue" id="sound-files" aria-labelledby="sound-files-heading">
        <div className="sound-catalogue-heading"><div><p className="sound-eyebrow">The expedition targets</p><h2 id="sound-files-heading">The files behind the memory.</h2></div><p>{expedition.scopeNote}</p></div>
        <p className="sound-catalogue-note">Open a target to inspect its exact file identity and submit a Finding. Upload a recovered file or use an Ethscription you already own. Green means recognized in this record—not necessarily deposited or listed for sale.</p>
        {findingIndexState === 'error' && <p className="index-notice" role="status">Live findings are temporarily unavailable. Showing recorded matches; a recent submission may not appear yet.</p>}
        {groups.map((group, groupIndex) => <section className="sound-release-group" key={group.release} aria-labelledby={`${idPrefix}-group-${groupIndex}`}>
          <div className="sound-release-heading"><h3 id={`${idPrefix}-group-${groupIndex}`}>{group.release}</h3><span>{group.targets.length} {group.targets.length === 1 ? 'reference file' : 'reference files'}</span></div>
          <div className="sound-target-grid">
            {group.targets.map(target => {
              const hasAudio = ethscriptionPattern.test(target.ethscriptionId || '');
              return <article className={`sound-target${hasAudio ? ' sound-target-recognized' : ''}${selectedId === target.id ? ' sound-target-selected' : ''}`} key={target.id}>
                <div className="sound-target-meta"><span>{target.year}</span><span>{target.format} · {durationLabel(target.durationSeconds)}</span></div>
                <h4><button type="button" aria-expanded={selectedId === target.id} aria-controls={`record-${target.id}`} onClick={event => openRecord(target.id, event.currentTarget)} ref={node => { if (node) buttons.current.set(target.id, node); else buttons.current.delete(target.id); }}><span>{target.title}</span><span className="sound-open-mark" aria-hidden="true">{selectedId === target.id ? '−' : '+'}</span></button></h4>
                <p className="sound-target-filename">{target.fileName}</p>
                <span className={`sound-target-state${hasAudio ? ' sound-state-recognized' : ''}`}>{hasAudio ? 'ETHSCRIBED' : 'OPEN TARGET'}</span>
                {hasAudio ? <div className="sound-audio-preview"><span className="sound-audio-label">Listen to the linked Ethscription</span><audio controls controlsList="nodownload" preload="none" aria-label={`Listen to ${target.title}`} src={`/api/ethscriptions/media/${target.ethscriptionId}`} /><a href={`https://ethscriptions.com/ethscriptions/${target.ethscriptionId}`} target="_blank" rel="noreferrer noopener">View Ethscription <span aria-hidden="true">↗</span></a></div>
                  : <div className="sound-preview-sealed"><SpeakerMark /><div><strong>Audio preview sealed</strong><span>Recover the exact file to complete this record.</span></div></div>}
                <p className="sound-reference-source">Source: {target.sourceLabel}</p>
              </article>;
            })}
          </div>
          {selected && group.targets.some(target => target.id === selectedId) && <section id={`record-${selected.id}`} className="sound-file-record" aria-labelledby={`${idPrefix}-record-title`} onKeyDown={event => { if (event.key === 'Escape' && !submissionOpen) { event.stopPropagation(); closeRecord(); } }}>
            <div className="sound-record-heading"><div><p className="sound-eyebrow">Reference file · {selected.release}</p><h4 id={`${idPrefix}-record-title`} ref={recordHeading} tabIndex={-1}>{selected.title}</h4></div><button type="button" className="sound-record-close" onClick={closeRecord}>Close record <span aria-hidden="true">×</span></button></div>
            {selectedRecognized && renderMarket && <div className="sound-record-market">{renderMarket({ artifact: selected })}</div>}
            {!selectedRecognized && renderSubmission && <div className="sound-finding-entry">
              {submissionOpen ? renderSubmission({ artifact: selected, onClose: () => setSubmissionOpen(false), onFindingPublished: findingPublished })
                : <><button type="button" className="sound-submit-finding" onClick={() => setSubmissionOpen(true)}>SUBMIT A FINDING <span aria-hidden="true">→</span></button><p>Start with a byte check. You choose whether to continue before any transaction.</p></>}
            </div>}
            <FileFacts target={selected} />
            <div className="sound-record-provenance"><h5>Where these bytes come from</h5><p>{selected.provenanceNote}</p><dl><div><dt>Source</dt><dd>{selected.sourceLabel}</dd></div><div><dt>Path in the source</dt><dd><code>{selected.sourcePath}</code></dd></div></dl>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer noopener">Inspect the source record <span aria-hidden="true">↗</span></a>}</div>
            <p className="sound-byte-note">The hash identifies the complete original file—including its container and headers. Converting, trimming, or re-encoding it creates different bytes, even when it sounds the same.</p>
          </section>}
        </section>)}
      </section>

      {!!expedition.sources?.length && <section className="sound-source-notebook" aria-labelledby="sound-source-heading"><div><p className="sound-eyebrow">Follow the evidence</p><h2 id="sound-source-heading">Source notebook.</h2></div><ul>{expedition.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.title} <span aria-hidden="true">↗</span></a>{source.note && <p>{source.note}</p>}</li>)}</ul></section>}
      <div className="sound-footer-note"><a href="/expeditions">← Back to expeditions</a><p>Recognition of exact bytes is not a copyright license or proof of exclusive rights to the sound.</p></div>
    </main>
    {footer}
  </div>;
}
