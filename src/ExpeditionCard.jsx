import './ExpeditionCard.css';

// Both hunts share a single directory layout. Only their content changes.
export default function ExpeditionCard({ number, title, path, era, description, recognized, total, lost = 0, visual }) {
  return <section className="expedition-directory-entry" aria-label={`Expedition ${number}`}>
    <p className="card-index expedition-archive-label">LIVE NOW / EXPEDITION {number}</p>
    <a className="expedition-index-card" href={path} aria-label={`Enter Expedition ${number}`}>
      <div className="expedition-index-visual">{visual}<span>EXPEDITION {number}</span></div>
      <div className="expedition-index-copy">
        <div className="expedition-index-meta"><span className="expedition-active-status">ACTIVE</span><span>{era}</span></div>
        <h2>{title}</h2>
        <p>{description}</p>
        <dl>
          <div><dt>ETHSCRIBED</dt><dd>{recognized} / {total}</dd></div>
          <div><dt>KNOWN-BYTE GAPS</dt><dd>{total - recognized}</dd></div>
          <div><dt>LOST-BYTE TARGETS</dt><dd>{lost}</dd></div>
        </dl>
        <strong>ENTER EXPEDITION {number}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></strong>
      </div>
    </a>
  </section>;
}
