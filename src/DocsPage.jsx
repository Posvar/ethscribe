import { Fragment, useEffect, useMemo, useState } from 'react';
import { docsHref, docsPages, docsSections } from './docsNavigation';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function docsSlugFromPath(pathname) {
  try {
    return decodeURIComponent(pathname)
      .replace(/^\/docs\/?/, '')
      .replace(/\/$/, '');
  } catch {
    return null;
  }
}

function resolveDocumentLink(href, currentFile) {
  try {
    const value = href.trim();
    if (!value || /[\u0000-\u001f\u007f]/.test(value)) return null;
    const resolved = new URL(value, `https://docs.ethscri.be/docs-content/${currentFile}`);
    if (!['https:', 'http:', 'mailto:'].includes(resolved.protocol)) return null;
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(value)) return value;
    if (!resolved.pathname.startsWith('/docs-content/') || !/\.md$/i.test(resolved.pathname)) return value;
    let file = resolved.pathname.slice('/docs-content/'.length).replace(/\.md$/i, '');
    if (file === 'README') file = '';
    return `${docsHref(file)}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

function InlineMarkdown({ children, currentFile }) {
  const source = String(children);
  const tokenPattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = source.split(tokenPattern).filter(Boolean);

  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = resolveDocumentLink(link[2], currentFile);
      const label = <InlineMarkdown currentFile={currentFile}>{link[1]}</InlineMarkdown>;
      if (!href) return <Fragment key={`${part}-${index}`}>{label}</Fragment>;
      const external = /^(?:https?:)?\/\//i.test(href);
      return <a href={href} key={`${part}-${index}`} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{label}</a>;
    }
    if (part.startsWith('`') && part.endsWith('`')) return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function isTableDivider(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

function isBlockStart(lines, index) {
  const line = lines[index] || '';
  return /^#{1,4}\s/.test(line)
    || /^```/.test(line)
    || /^>\s?/.test(line)
    || /^\s*[-*+]\s+/.test(line)
    || /^\s*\d+\.\s+/.test(line)
    || (line.includes('|') && isTableDivider(lines[index + 1] || ''));
}

function documentHeadings(source) {
  const headings = [];
  const usedIds = new Set();
  let fenced = false;

  source.replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    if (/^```/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (!match) return;
    const title = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_~]/g, '');
    const base = slugify(title) || 'section';
    let id = base;
    let suffix = 1;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    headings.push({ line: index, level: match[1].length, title, id });
  });

  return headings;
}

function MarkdownDocument({ source, currentFile, headings }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([^\s]*)/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(<pre key={`code-${index}`}><code data-language={fence[1] || undefined}>{code.join('\n')}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Heading = `h${level}`;
      const { id, title } = headings.find((record) => record.line === index);
      blocks.push(<Heading id={id} key={`heading-${index}`} tabIndex={-1} aria-label={title}><a className="docs-heading-anchor" href={`#${id}`} aria-label={`Link to ${title}`}>#</a><InlineMarkdown currentFile={currentFile}>{heading[2]}</InlineMarkdown></Heading>);
      index += 1;
      continue;
    }

    if (line.includes('|') && isTableDivider(lines[index + 1] || '')) {
      const headers = tableCells(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div className="docs-table-wrap" key={`table-${index}`}>
          <table>
            <thead><tr>{headers.map((cell, cellIndex) => <th scope="col" key={cellIndex}><InlineMarkdown currentFile={currentFile}>{cell}</InlineMarkdown></th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineMarkdown currentFile={currentFile}>{cell}</InlineMarkdown></td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}><InlineMarkdown currentFile={currentFile}>{quote.join(' ')}</InlineMarkdown></blockquote>);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const items = [];
      const pattern = unordered ? /^\s*[-*+]\s+(.+)$/ : /^\s*\d+\.\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].match(pattern);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      const List = unordered ? 'ul' : 'ol';
      blocks.push(<List key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown currentFile={currentFile}>{item}</InlineMarkdown></li>)}</List>);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}><InlineMarkdown currentFile={currentFile}>{paragraph.join(' ')}</InlineMarkdown></p>);
  }

  return <>{blocks}</>;
}

function DocsSidebar({ activeSlug }) {
  return (
    <aside className="docs-sidebar" aria-label="Documentation navigation">
      <div className="docs-sidebar-intro"><span>FIELD MANUAL</span><strong>PROJECT DOCUMENTATION</strong><small>GUIDES · REFERENCE · ROADMAP</small></div>
      <nav aria-label="Documentation chapters">
        {docsSections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.items.map((item) => <a className={activeSlug === item.slug ? 'docs-nav-active' : ''} href={docsHref(item.slug)} aria-current={activeSlug === item.slug ? 'page' : undefined} key={item.slug || 'home'}>{item.title}</a>)}
          </section>
        ))}
      </nav>
    </aside>
  );
}

function DocsSearch() {
  const [query, setQuery] = useState('');
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = terms.length ? docsPages.filter((page) => terms.every((term) => `${page.title} ${page.section}`.toLowerCase().includes(term))) : [];

  return (
    <div className="docs-search" role="search" aria-label="Find a documentation guide">
      <label htmlFor="docs-search-input">Find a guide</label>
      <div className="docs-search-controls">
        <input id="docs-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }} placeholder="Search guide titles…" aria-controls={terms.length ? 'docs-search-results' : undefined} autoComplete="off" />
        {query && <button type="button" onClick={() => { setQuery(''); document.getElementById('docs-search-input')?.focus(); }}>Clear</button>}
      </div>
      {terms.length > 0 && (
        <div id="docs-search-results">
          <p className="docs-search-empty" role="status">{matches.length ? `${matches.length} ${matches.length === 1 ? 'guide' : 'guides'} found` : 'No matching titles. Try “marketplace”, “expedition”, or browse the chapters.'}</p>
          {matches.length > 0 && <ul className="docs-search-results">{matches.map((page) => <li key={page.slug || 'home'}><a href={docsHref(page.slug)}><strong>{page.title}</strong><small>{page.section}</small></a></li>)}</ul>}
        </div>
      )}
    </div>
  );
}

export default function DocsPage({ header, footer }) {
  const activeSlug = docsSlugFromPath(window.location.pathname);
  const activeIndex = docsPages.findIndex((page) => page.slug === activeSlug);
  const activePage = docsPages[activeIndex];
  const [source, setSource] = useState('');
  const [state, setState] = useState(activePage ? 'loading' : 'missing');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!activePage) {
      setState('missing');
      return undefined;
    }

    const controller = new AbortController();
    setState('loading');
    setSource('');
    fetch(`/docs-content/${activePage.file}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Documentation request failed: ${response.status}`);
        return response.text();
      })
      .then((markdown) => {
        if (controller.signal.aborted) return;
        if (!markdown.trim() || /^\s*<(?:!doctype\s+html|html)[\s>]/i.test(markdown)) throw new Error('Documentation source is unavailable.');
        setSource(markdown);
        setState('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('error');
      });

    return () => controller.abort();
  }, [activePage, retry]);

  useEffect(() => {
    document.title = activePage ? `${activePage.title} — Ethscribe Docs` : 'Page not found — Ethscribe Docs';
  }, [activePage]);

  const allHeadings = useMemo(() => documentHeadings(source), [source]);
  const headings = allHeadings.filter((heading) => heading.level === 2 || heading.level === 3);

  useEffect(() => {
    if (state !== 'ready') return undefined;
    const scrollToHeading = () => {
      let id;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!allHeadings.some((heading) => heading.id === id)) return;
      const heading = document.getElementById(id);
      heading?.scrollIntoView?.({ block: 'start' });
      heading?.focus({ preventScroll: true });
    };
    scrollToHeading();
    window.addEventListener('hashchange', scrollToHeading);
    return () => window.removeEventListener('hashchange', scrollToHeading);
  }, [allHeadings, state]);

  const previous = activeIndex > 0 ? docsPages[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < docsPages.length - 1 ? docsPages[activeIndex + 1] : null;

  return (
    <div className="site-shell docs-page">
      {header}
      <div className="docs-mobile-bar">
        <span>DOCS / {activePage?.section || 'NOT FOUND'}</span>
        <select aria-label="Documentation page" value={activePage?.slug ?? '__missing'} onChange={(event) => { window.location.href = docsHref(event.target.value); }}>
          {!activePage && <option value="__missing">Page not found</option>}
          {docsSections.map((section) => <optgroup label={section.title} key={section.title}>{section.items.map((item) => <option value={item.slug} key={item.slug || 'home'}>{item.title}</option>)}</optgroup>)}
        </select>
      </div>
      <main id="main-content" tabIndex={-1} className="docs-layout">
        <DocsSidebar activeSlug={activeSlug} />
        <article className="docs-article">
          <div className="docs-breadcrumb"><span>ETHSCRIBE DOCS</span><span>/</span><span>{activePage?.section || '404'}</span></div>
          <DocsSearch />
          {state === 'loading' && <div className="docs-state" role="status">Opening the field manual…</div>}
          {state === 'error' && <div className="docs-state" role="alert"><h1>Document unavailable</h1><p>This guide could not be loaded. You can retry here or open its source on GitHub.</p><button type="button" className="primary-action docs-retry" onClick={() => setRetry((value) => value + 1)}>Try again</button><a className="docs-edit-link" href={`https://github.com/Posvar/ethscribe/blob/main/public/docs-content/${activePage.file}`} target="_blank" rel="noopener noreferrer">Open source on GitHub ↗</a></div>}
          {state === 'missing' && <div className="docs-state"><p className="kicker"><span /> 404</p><h1>That page is not in the archive.</h1><p>Return to the documentation index to continue.</p><a className="primary-action" href="/docs">Open the docs</a></div>}
          {state === 'ready' && <MarkdownDocument source={source} currentFile={activePage.file} headings={allHeadings} />}
          {state === 'ready' && (
            <nav className="docs-pagination" aria-label="Documentation pagination">
              {previous ? <a href={docsHref(previous.slug)}><span>PREVIOUS</span><strong>← {previous.title}</strong></a> : <span />}
              {next ? <a className="docs-next" href={docsHref(next.slug)}><span>NEXT</span><strong>{next.title} →</strong></a> : <span />}
            </nav>
          )}
          {state === 'ready' && <a className="docs-edit-link" href={`https://github.com/Posvar/ethscribe/blob/main/public/docs-content/${activePage.file}`} target="_blank" rel="noopener noreferrer">VIEW SOURCE ON GITHUB ↗</a>}
        </article>
        <aside className="docs-toc" aria-label="On this page">
          <span>ON THIS PAGE</span>
          {headings.length ? headings.map((heading) => <a className={heading.level === 3 ? 'toc-nested' : ''} href={`#${heading.id}`} key={`${heading.id}-${heading.level}`}>{heading.title}</a>) : <p>Overview</p>}
        </aside>
      </main>
      {footer}
    </div>
  );
}
