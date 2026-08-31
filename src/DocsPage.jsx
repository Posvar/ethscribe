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
  return decodeURIComponent(pathname)
    .replace(/^\/docs\/?/, '')
    .replace(/\/$/, '');
}

function resolveDocumentLink(href, currentFile) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(href)) return href;

  try {
    const resolved = new URL(href, `https://docs.ethscri.be/docs-content/${currentFile}`);
    if (!resolved.pathname.startsWith('/docs-content/')) return href;
    let file = resolved.pathname.slice('/docs-content/'.length).replace(/\.md$/i, '');
    if (file === 'README') file = '';
    return `${docsHref(file)}${resolved.hash}`;
  } catch {
    return href;
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
      const external = /^(?:https?:)?\/\//i.test(href);
      return <a href={href} key={`${part}-${index}`} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{link[1]}</a>;
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

function MarkdownDocument({ source, currentFile }) {
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
      const id = slugify(heading[2]);
      blocks.push(<Heading id={id} key={`heading-${index}`}><a className="docs-heading-anchor" href={`#${id}`} aria-hidden="true" tabIndex="-1">#</a><InlineMarkdown currentFile={currentFile}>{heading[2]}</InlineMarkdown></Heading>);
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
            <thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}><InlineMarkdown currentFile={currentFile}>{cell}</InlineMarkdown></th>)}</tr></thead>
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
      <div className="docs-sidebar-intro"><span>FIELD MANUAL</span><strong>PROJECT DOCUMENTATION</strong><small>WHITEPAPER · v0.1</small></div>
      <nav>
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

export default function DocsPage({ header, footer }) {
  const activeSlug = docsSlugFromPath(window.location.pathname);
  const activeIndex = docsPages.findIndex((page) => page.slug === activeSlug);
  const activePage = docsPages[activeIndex];
  const [source, setSource] = useState('');
  const [state, setState] = useState(activePage ? 'loading' : 'missing');

  useEffect(() => {
    if (!activePage) {
      setState('missing');
      return undefined;
    }

    const controller = new AbortController();
    setState('loading');
    fetch(`/docs-content/${activePage.file}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Documentation request failed: ${response.status}`);
        return response.text();
      })
      .then((markdown) => {
        setSource(markdown);
        setState('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('error');
      });

    return () => controller.abort();
  }, [activePage]);

  useEffect(() => {
    document.title = activePage ? `${activePage.title} — Ethscribe Docs` : 'Page not found — Ethscribe Docs';
  }, [activePage]);

  const headings = useMemo(() => source.split('\n')
    .map((line) => line.match(/^(##|###)\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({ level: match[1].length, title: match[2].replace(/[`*_~]/g, ''), id: slugify(match[2]) })), [source]);

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
      <main className="docs-layout">
        <DocsSidebar activeSlug={activeSlug} />
        <article className="docs-article">
          <div className="docs-breadcrumb"><span>ETHSCRIBE DOCS</span><span>/</span><span>{activePage?.section || '404'}</span></div>
          {state === 'loading' && <div className="docs-state" role="status">Opening the field manual…</div>}
          {state === 'error' && <div className="docs-state"><h1>Document unavailable</h1><p>The source file could not be loaded. Try refreshing this page.</p></div>}
          {state === 'missing' && <div className="docs-state"><p className="kicker"><span /> 404</p><h1>That page is not in the archive.</h1><p>Return to the documentation index to continue.</p><a className="primary-action" href="/docs">Open the docs</a></div>}
          {state === 'ready' && <MarkdownDocument source={source} currentFile={activePage.file} />}
          {state === 'ready' && (
            <nav className="docs-pagination" aria-label="Documentation pagination">
              {previous ? <a href={docsHref(previous.slug)}><span>PREVIOUS</span><strong>← {previous.title}</strong></a> : <span />}
              {next ? <a className="docs-next" href={docsHref(next.slug)}><span>NEXT</span><strong>{next.title} →</strong></a> : <span />}
            </nav>
          )}
          {state === 'ready' && <a className="docs-edit-link" href={`https://github.com/Posvar/ethscribe/blob/main/public/docs-content/${activePage.file}`} target="_blank" rel="noreferrer">VIEW SOURCE ON GITHUB ↗</a>}
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
