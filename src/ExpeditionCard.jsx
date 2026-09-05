import './ExpeditionCard.css';

// Both hunts share a single directory layout. Only their content changes.
export default function ExpeditionCard({ number, title, path, era, description, recognized, total, lost = 0, visual, statusLabel = 'ACTIVE', eyebrow = `LIVE NOW / EXPEDITION ${number}`, stats, actionLabel = `ENTER EXPEDITION ${number}` }) {
  const metrics = stats || [
    { label: 'ETHSCRIBED', value: `${recognized} / ${total}` },
    { label: 'KNOWN-BYTE GAPS', value: total - recognized },
    { label: 'LOST-BYTE TARGETS', value: lost },
  ];
  return <section className="expedition-directory-entry" aria-label={`Expedition ${number}`}>
    <p className="card-index expedition-archive-label">{eyebrow}</p>
    <a className="expedition-index-card" href={path} aria-label={statusLabel === 'ACTIVE' ? `Enter Expedition ${number}` : actionLabel}>
      <div className="expedition-index-visual">{visual}<span>EXPEDITION {number}</span></div>
      <div className="expedition-index-copy">
        <div className="expedition-index-meta"><span className={statusLabel === 'ACTIVE' ? 'expedition-active-status' : statusLabel === 'COMPLETE' ? 'expedition-complete-status' : 'expedition-preview-status'}>{statusLabel}</span><span>{era}</span></div>
        <h2>{title}</h2>
        <p>{description}</p>
        <dl>
          {metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
        </dl>
        <strong>{actionLabel}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></strong>
      </div>
    </a>
  </section>;
}
