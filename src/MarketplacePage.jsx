import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssetPreview } from './WalletPage';
import { defaultControls, filterMarketplace, formatPrice, listed, loadMarketplace, marketplaceExpeditions, readControls } from './marketplaceData';
import './MarketplacePage.css';

const PAGE_SIZE = 24;
const shortAddress = address => /^0x[a-f0-9]{40}$/i.test(address || '') ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Checking seller';

export default function MarketplacePage({ header, footer, load = loadMarketplace }) {
  const [controls, setControls] = useState(() => readControls(window.location.search));
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const request = useRef(null);
  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true);
    try {
      const next = await load({ signal: controller.signal });
      if (!controller.signal.aborted) { setSnapshot(next); setError(''); setTick(Date.now()); }
    } catch {
      if (!controller.signal.aborted) setError('We couldn’t refresh the marketplace. Try again before relying on a displayed price or custody status.');
    } finally {
      if (!controller.signal.aborted) { setLoading(false); request.current = null; }
    }
  }, [load]);
  useEffect(() => {
    refresh();
    const timer = setInterval(() => { setTick(Date.now()); if (document.visibilityState !== 'hidden') refresh(); }, 60_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); request.current?.abort(); request.current = null; };
  }, [refresh]);
  useEffect(() => {
    const onPop = () => { setControls(readControls(window.location.search)); setPage(1); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  function update(patch) {
    const next = { ...controls, ...patch }; setControls(next); setPage(1);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => { if (value !== defaultControls[key]) params.set(key, value); });
    window.history.replaceState({}, '', `/marketplace${params.size ? `?${params}` : ''}`);
  }
  const items = snapshot?.items || [];
  const results = useMemo(() => filterMarketplace(items, controls, tick), [items, controls, tick]);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const typeOptions = [...new Map(items.map(item => [item.type.id, item.type])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const selectedType = typeOptions.some(type => type.id === controls.type);
  const listingCount = items.filter(item => listed(item, tick)).length;
  const filtered = Object.keys(defaultControls).some(key => !['sort', 'view'].includes(key) && controls[key] !== defaultControls[key]);
  const partial = snapshot && (!snapshot.complete || snapshot.missingFeeds);

  return <div className="site-shell marketplace-page">
    {header}
    <main id="main-content" tabIndex={-1}>
      <section className="marketplace-heading">
        <div><p className="kicker"><span /> Own a piece of the record</p><h1>Marketplace</h1><p>Found through expeditions. Preserved byte for byte. Held in market custody.</p></div>
        <dl><div><dt>ARTIFACTS IN ESCROW</dt><dd>{snapshot ? `${items.length}${partial ? '+' : ''}` : '—'}</dd></div><div><dt>LISTED</dt><dd>{snapshot ? `${listingCount}${partial ? '+' : ''}` : '—'}</dd></div></dl>
      </section>
      <section className="marketplace-browser" aria-label="Browse marketplace">
        <div className="marketplace-toolbar">
          <label className="marketplace-search"><span>Search artifacts</span><input type="search" placeholder="Name, file, expedition or Ethscription ID" value={controls.q} onChange={event => update({ q: event.target.value.slice(0, 200) })} /></label>
          <div className="marketplace-toggle" role="group" aria-label="Listing status"><button type="button" aria-pressed={controls.status === 'all'} onClick={() => update({ status: 'all' })}>All escrow</button><button type="button" aria-pressed={controls.status === 'listed'} onClick={() => update({ status: 'listed' })}>Listed</button></div>
          <label><span>Sort by</span><select value={controls.sort} onChange={event => update({ sort: event.target.value })}><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">Newest Ethscribed</option><option value="name">Name: A–Z</option></select></label>
          <div className="marketplace-toggle marketplace-view" role="group" aria-label="Display"><button type="button" aria-pressed={controls.view === 'grid'} onClick={() => update({ view: 'grid' })}>Grid</button><button type="button" aria-pressed={controls.view === 'list'} onClick={() => update({ view: 'list' })}>List</button></div>
        </div>
        <button className="marketplace-filter-trigger" type="button" aria-expanded={filtersOpen} aria-controls="marketplace-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filters{controls.expedition !== 'all' || controls.type !== 'all' ? ' · active' : ''} <span aria-hidden="true">{filtersOpen ? '−' : '+'}</span></button>
        <div id="marketplace-filters" className={`marketplace-filter-row${filtersOpen ? ' is-open' : ''}`}>
          <label><span>Expedition</span><select value={controls.expedition} onChange={event => update({ expedition: event.target.value })}><option value="all">All expeditions</option>{marketplaceExpeditions.map(expedition => <option key={expedition.id} value={expedition.id}>{expedition.number} · {expedition.title}</option>)}</select></label>
          <label><span>File type</span><select value={controls.type} onChange={event => update({ type: event.target.value })}><option value="all">All file types</option>{controls.type !== 'all' && !selectedType && <option value={controls.type}>{controls.type.toUpperCase()} · no current assets</option>}{typeOptions.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
          {filtered && <button type="button" className="marketplace-clear" onClick={() => update({ q: '', status: 'all', expedition: 'all', type: 'all' })}>Clear filters ×</button>}
        </div>
        <div className="marketplace-results-bar"><p role="status">{loading && !snapshot ? 'Checking the vault…' : `${results.length} ${results.length === 1 ? 'artifact' : 'artifacts'}${filtered ? ' match your filters' : ' in this collection'}`}</p><div><span>{loading ? 'Refreshing…' : error ? 'Last refresh failed' : snapshot?.checkedAt ? `Checked ${new Date(snapshot.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · refreshes every minute` : ''}</span><button type="button" disabled={loading} onClick={refresh}>Refresh</button></div></div>
        {error && <p className="marketplace-notice is-error" role="alert">{error} {snapshot && 'Showing the last successful snapshot.'}</p>}
        {partial && <p className="marketplace-notice" role="status">{snapshot.missingFeeds ? 'An expedition’s Finding index is unavailable. Some newly found assets may be missing.' : 'The vault scan reached its safety limit. This is a partial collection; sorting applies to the loaded assets.'}</p>}
        {snapshot?.market?.indexer?.healthy === false && <p className="marketplace-notice">Ownership checks are catching up. Listings remain visible; the artifact page rechecks custody and price before any purchase.</p>}
        {!snapshot && loading ? <div className="marketplace-grid" aria-hidden="true">{[0, 1, 2, 3].map(key => <div className="marketplace-skeleton" key={key} />)}</div> : visible.length ? <div className={controls.view === 'grid' ? 'marketplace-grid' : 'marketplace-list'}>
          {visible.map(item => {
            const hasListing = listed(item, tick);
            const reserved = hasListing && /^0x[a-f0-9]{40}$/i.test(item.listing.onlyBuyer || '') && !/^0x0{40}$/i.test(item.listing.onlyBuyer);
            const imagePreview = item.mimetype?.toLowerCase().startsWith('image/') || item.type.id === 'xpm';
            return <article className="marketplace-card" key={item.transactionHash} aria-label={item.name}>
              {imagePreview ? <a className="marketplace-preview wallet-asset-preview" href={item.href} aria-label={`View ${item.name} artifact`}><AssetPreview record={item} /></a>
                : <div className="marketplace-preview wallet-asset-preview"><AssetPreview record={item} /></div>}
              <div className="marketplace-card-body"><a className="marketplace-expedition" href={`/expeditions/${item.expedition.id}`}>EXPEDITION {item.expedition.number} · {item.expedition.title}</a>
                <h2><a href={item.href}>{item.name}</a></h2><p className="marketplace-file-description">{item.artifact.release || item.artifact.title || 'Gurk character artwork'}<span>{item.type.label}</span></p>
                <div className="marketplace-card-price"><span className={hasListing ? 'marketplace-listed' : ''}>{error ? 'LAST SEEN' : reserved ? 'RESERVED LISTING' : hasListing ? 'LISTED' : item.listing == null ? 'LISTING UNAVAILABLE' : 'NOT LISTED'}</span><strong>{hasListing ? `${formatPrice(item.listing.priceWei)} ETH` : '—'}</strong></div>
                <div className="marketplace-card-footer"><span>{item.seller ? <a href={`https://etherscan.io/address/${item.seller}`} target="_blank" rel="noreferrer">Seller {shortAddress(item.seller)}</a> : 'Seller not verified'}</span><a href={item.href}>{hasListing ? 'View listing' : 'View artifact'} <span aria-hidden="true">↗</span></a></div>
                {!item.custody?.verified && <p className="marketplace-custody-note">Escrow reported · checking custody</p>}
              </div>
            </article>;
          })}
        </div> : (!loading && !error) && <div className="marketplace-empty"><h2>{filtered ? 'No artifacts match those filters.' : 'The next chapter is yours to collect.'}</h2><p>{filtered ? 'Try another expedition, file type, or include unlisted artifacts.' : 'Recognized artifacts appear here when their owners deposit them into the marketplace.'}</p>{filtered ? <button type="button" onClick={() => update(defaultControls)}>Reset filters</button> : <a href="/expeditions">Explore the expeditions ↗</a>}</div>}
        {results.length > PAGE_SIZE && <nav className="marketplace-pagination" aria-label="Marketplace pages"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← Previous</button><span>Page {currentPage} of {pages} · {results.length} artifacts</span><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next →</button></nav>}
        <p className="marketplace-footnote">Only recognized expedition artifacts are shown. Unlisted items aren’t offers for sale. Open an artifact for its evidence, current listing and ownership details.</p>
      </section>
    </main>{footer}
  </div>;
}
