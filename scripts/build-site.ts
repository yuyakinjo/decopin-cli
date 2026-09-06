#!/usr/bin/env bun
/**
 * ドキュメントサイトを組み立てる。
 *
 *   bun run site                 # site/dist/ に書き出す (base は /decopin-cli)
 *   bun run site -- --base ""    # ローカル確認用 (ルート直下で配信するとき)
 *
 * 入力は site/content/ の Markdown と site/nav.json。依存は無く、
 * Markdown は Bun.markdown で HTML にする。Next.js のドキュメントのように
 * 左にナビ、中央に本文、右に見出し一覧を置く。
 *
 * ここに書いた tsx の例は test/docs/readme.test.ts が README と同じ方法で
 * 型検査する (ADR 15: 使い方のドキュメントは実行して守る)。
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT = join(ROOT, 'site/content');
const OUT = join(ROOT, 'site/dist');

interface Nav {
  title: string;
  tagline: string;
  repo: string;
  sections: { title: string; pages: string[] }[];
}

interface Page {
  slug: string;
  section: string;
  title: string;
  description: string;
  html: string;
  headings: { level: 2 | 3; id: string; text: string }[];
}

function readBase(argv: string[]): string {
  const index = argv.indexOf('--base');
  if (index === -1) return '/decopin-cli';
  return (argv[index + 1] ?? '').replace(/\/$/, '');
}

const BASE = readBase(process.argv.slice(2));
const nav = (await Bun.file(join(ROOT, 'site/nav.json')).json()) as Nav;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * 見出しの中身 (Bun.markdown が出した HTML) からタグを剥がして素の文字にする。
 * 一回の置換では `<<b>script>` のように剥がした跡が新しいタグになり得るので、
 * 変化しなくなるまで繰り返す (CodeQL: incomplete multi-character sanitization)。
 */
function stripTags(html: string): string {
  let text = html;
  for (;;) {
    const next = text.replace(/<[^<>]*>/g, '');
    if (next === text) return next;
    text = next;
  }
}

function slugify(text: string): string {
  return stripTags(text)
    .toLowerCase()
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** `---` で囲まれた先頭のメタデータを読む */
function parseFrontmatter(source: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (match === null) return { meta: {}, body: source };
  const meta: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return { meta, body: source.slice(match[0].length) };
}

/** 見出しに id を振り、目次用に集める */
function addHeadingIds(html: string): {
  html: string;
  headings: Page['headings'];
} {
  const headings: Page['headings'] = [];
  const seen = new Map<string, number>();
  const withIds = html.replace(
    /<h([23])>([\s\S]*?)<\/h\1>/g,
    (_, level: string, inner: string) => {
      let id = slugify(inner);
      const count = seen.get(id) ?? 0;
      seen.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      const text = stripTags(inner);
      headings.push({ level: Number(level) as 2 | 3, id, text });
      return `<h${level} id="${id}"><a class="anchor" href="#${id}">${inner}</a></h${level}>`;
    }
  );
  return { html: withIds, headings };
}

/** サイト内リンク (`/guides/mcp/`) に base を付ける */
function rebase(html: string): string {
  return html.replace(/href="\/(?!\/)/g, `href="${BASE}/`);
}

async function loadPage(slug: string, section: string): Promise<Page> {
  const source = await Bun.file(join(CONTENT, `${slug}.md`)).text();
  const { meta, body } = parseFrontmatter(source);
  const rendered = Bun.markdown.html(body);
  const { html, headings } = addHeadingIds(rebase(rendered));
  return {
    slug,
    section,
    title: meta.title ?? slug,
    description: meta.description ?? '',
    html,
    headings,
  };
}

const pages: Page[] = [];
for (const section of nav.sections) {
  for (const slug of section.pages) {
    pages.push(await loadPage(slug, section.title));
  }
}

/** content/ にあるのに nav.json に無いページは、静かに消えないよう落とす */
async function listContent(dir: string, prefix = ''): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(
        ...(await listContent(join(dir, entry.name), `${prefix}${entry.name}/`))
      );
    } else if (entry.name.endsWith('.md')) {
      found.push(`${prefix}${entry.name.slice(0, -3)}`);
    }
  }
  return found;
}
const orphans = (await listContent(CONTENT)).filter(
  (slug) => !pages.some((page) => page.slug === slug)
);
if (orphans.length > 0) {
  console.error(
    `site/content has pages missing from nav.json:\n  ${orphans.join('\n  ')}`
  );
  process.exit(1);
}

function url(slug: string): string {
  return `${BASE}/${slug}/`;
}

function sidebar(current: Page): string {
  return nav.sections
    .map((section) => {
      const items = section.pages
        .map((slug) => {
          const page = pages.find((candidate) => candidate.slug === slug);
          if (page === undefined) return '';
          const aria = page.slug === current.slug ? ' aria-current="page"' : '';
          const label = /\.tsx/.test(page.title)
            ? page.title.replace(/([\w-]+\.tsx)/g, '<code>$1</code>')
            : escapeHtml(page.title);
          return `<li><a href="${url(page.slug)}"${aria}>${label}</a></li>`;
        })
        .join('');
      return `<h4>${escapeHtml(section.title)}</h4><ul>${items}</ul>`;
    })
    .join('');
}

function toc(page: Page): string {
  if (page.headings.length === 0) return '';
  const items = page.headings
    .map(
      (heading) =>
        `<li class="h${heading.level}"><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`
    )
    .join('');
  return `<h5>On this page</h5><ul>${items}</ul>`;
}

function pager(index: number): string {
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const link = (page: Page | undefined, kind: 'prev' | 'next') =>
    page === undefined
      ? ''
      : `<a class="${kind}" href="${url(page.slug)}"><small>${kind === 'prev' ? 'Previous' : 'Next'}</small>${escapeHtml(page.title)}</a>`;
  return `<div class="pager">${link(prev, 'prev')}${link(next, 'next')}</div>`;
}

const THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
})();`;

const PAGE_SCRIPT = `
document.getElementById('theme').addEventListener('click', function () {
  var root = document.documentElement;
  var dark = root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  var next = dark ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
});
document.getElementById('menu').addEventListener('click', function () {
  document.body.classList.toggle('nav-open');
});
if (window.hljs) {
  hljs.registerAliases(['tsx', 'jsonc'], { languageName: 'typescript' });
  hljs.highlightAll();
}
var links = Array.from(document.querySelectorAll('aside.toc a'));
var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
function mark() {
  var y = window.scrollY + 80, active = 0;
  targets.forEach(function (t, i) { if (t && t.offsetTop <= y) active = i; });
  links.forEach(function (a, i) { a.classList.toggle('active', i === active); });
}
if (links.length) { addEventListener('scroll', mark, { passive: true }); mark(); }`;

function render(page: Page, index: number): string {
  const title = `${page.title} | ${nav.title}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<link rel="stylesheet" href="${BASE}/style.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css" media="(prefers-color-scheme: light)">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css" media="(prefers-color-scheme: dark)">
<script>${THEME_SCRIPT}</script>
</head>
<body>
<header class="top">
  <button class="icon menu" id="menu" aria-label="Menu">&#9776;</button>
  <a class="brand" href="${url(pages[0]?.slug ?? '')}"><span class="dot"></span>${escapeHtml(nav.title)} <span class="docs">Docs</span></a>
  <div class="search" role="search">Search documentation… <kbd>⌘K</kbd></div>
  <a class="icon" href="${nav.repo}" aria-label="GitHub" title="GitHub">
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
  </a>
  <button class="icon" id="theme" aria-label="Toggle theme" title="Toggle theme">&#9681;</button>
</header>
<div class="shell">
  <nav class="side" aria-label="Documentation">${sidebar(page)}</nav>
  <main>
    <div class="crumbs"><span>${escapeHtml(page.section)}</span><span>${escapeHtml(page.title)}</span></div>
    <h1>${escapeHtml(page.title)}</h1>
    ${page.description === '' ? '' : `<p class="lead">${escapeHtml(page.description)}</p>`}
    ${page.html}
    ${pager(index)}
  </main>
  <aside class="toc">${toc(page)}<a class="edit" href="${nav.repo}/edit/main/site/content/${page.slug}.md">Edit this page on GitHub</a></aside>
  <footer class="site"><span>MIT License</span><a href="${nav.repo}">GitHub</a><a href="https://www.npmjs.com/package/decopin-cli">npm</a></footer>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const [index, page] of pages.entries()) {
  const path = join(OUT, page.slug, 'index.html');
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, render(page, index));
}

// トップは最初のページ (Introduction) をそのまま出す
const first = pages[0];
if (first !== undefined)
  await Bun.write(join(OUT, 'index.html'), render(first, 0));

await Bun.write(join(OUT, 'style.css'), Bun.file(join(ROOT, 'site/style.css')));
// GitHub Pages が Jekyll として解釈しないように
await Bun.write(join(OUT, '.nojekyll'), '');

console.log(`site: ${pages.length} pages -> site/dist (base "${BASE}")`);
