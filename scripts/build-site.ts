#!/usr/bin/env bun
/**
 * ドキュメントサイトを組み立てる。
 *
 *   bun run site                 # site/dist/ に書き出す (base は /decopin-cli)
 *   bun run site -- --base ""    # ローカル確認用 (ルート直下で配信するとき)
 *
 * 入力は site/content/ の Markdown (英語) と site/nav.json、日本語の対応表
 * site/i18n.ts と site/i18n/ja/<slug>.ts。依存は無く、Markdown は
 * Bun.markdown で HTML にする。
 * Next.js のドキュメントのように左にナビ、中央に本文、右に見出し一覧を置く。
 *
 * 英語は `${BASE}/<slug>/`、日本語は `${BASE}/ja/<slug>/` に出し、ヘッダーの
 * アイコンで同じページのもう一方の言語へ移る。日本語は英語の Markdown を
 * 段落ごとに対応表で置き換えて作る (scripts/site-translate.ts)。訳の無い段落や
 * 使われない訳があると落とす。日本語の見出しには英語版と同じ id を振るので、
 * `#fragment` はどちらの言語でも同じものを指す。
 *
 * ここに書いた tsx の例は test/docs/readme.test.ts が README と同じ方法で
 * 型検査する (ADR 15: 使い方のドキュメントは実行して守る)。日本語版の
 * コードブロックは英語版のものをそのまま使う。
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  type Lang,
  LANGS,
  type PageTranslation,
  SECTIONS,
  UI,
} from '../site/i18n.ts';
import { splitBlocks, translateBody } from './site-translate.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'site/dist');

/** 英語の Markdown と日本語の対応表の置き場 (リポジトリからの相対) */
const CONTENT = 'site/content';
const TRANSLATIONS = 'site/i18n/ja';

interface Nav {
  title: string;
  tagline: string;
  repo: string;
  sections: { title: string; pages: string[] }[];
}

interface Page {
  lang: Lang;
  slug: string;
  section: string;
  title: string;
  description: string;
  html: string;
  headings: { level: 2 | 3; id: string; text: string }[];
  /** GitHub で編集するファイル (リポジトリからの相対) */
  source: string;
}

function readBase(argv: string[]): string {
  const index = argv.indexOf('--base');
  if (index === -1) return '/decopin-cli';
  return (argv[index + 1] ?? '').replace(/\/$/, '');
}

const BASE = readBase(process.argv.slice(2));
const nav = (await Bun.file(join(ROOT, 'site/nav.json')).json()) as Nav;
/**
 * ヘッダーに出す最新のバージョン。release ワークフローが package.json を
 * 書き換えてコミットし、その後にこのサイトを組み直す (pages.yml を起動する)
 */
const { version } = (await Bun.file(join(ROOT, 'package.json')).json()) as {
  version: string;
};

/** その言語のページが並ぶ場所。英語はルート直下、日本語は `/ja` の下 */
function prefix(lang: Lang): string {
  return lang === 'en' ? BASE : `${BASE}/ja`;
}

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

/**
 * 見出しに id を振り、目次用に集める。`reuse` (英語版の見出し) を渡すと、
 * 文字から作らずに同じ位置の id をそのまま使う。日本語の見出しからは
 * 英数字の slug が作れないのと、言語を切り替えても `#fragment` を保つため
 */
function addHeadingIds(
  html: string,
  reuse?: Page['headings']
): {
  html: string;
  headings: Page['headings'];
} {
  const headings: Page['headings'] = [];
  const seen = new Map<string, number>();
  const withIds = html.replace(
    /<h([23])>([\s\S]*?)<\/h\1>/g,
    (_, level: string, inner: string) => {
      let id: string;
      if (reuse === undefined) {
        id = slugify(inner);
        const count = seen.get(id) ?? 0;
        seen.set(id, count + 1);
        if (count > 0) id = `${id}-${count}`;
      } else {
        id = reuse[headings.length]?.id ?? `section-${headings.length}`;
      }
      const text = stripTags(inner);
      headings.push({ level: Number(level) as 2 | 3, id, text });
      return `<h${level} id="${id}"><a class="anchor" href="#${id}">${inner}</a></h${level}>`;
    }
  );
  return { html: withIds, headings };
}

/** サイト内リンク (`/guides/mcp/`) にその言語の置き場を付ける */
function rebase(html: string, lang: Lang): string {
  return html.replace(/href="\/(?!\/)/g, `href="${prefix(lang)}/`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Markdown を HTML にし、見出しに id を振る */
function renderBody(
  markdown: string,
  lang: Lang,
  reuse?: Page['headings']
): Pick<Page, 'html' | 'headings'> {
  return addHeadingIds(rebase(Bun.markdown.html(markdown), lang), reuse);
}

async function loadPage(slug: string, section: string): Promise<Page> {
  const source = `${CONTENT}/${slug}.md`;
  const file = Bun.file(join(ROOT, source));
  if (!(await file.exists())) fail(`${source} is missing (listed in nav.json)`);
  const { meta, body } = parseFrontmatter(await file.text());
  return {
    lang: 'en',
    slug,
    section,
    title: meta.title ?? slug,
    description: meta.description ?? '',
    ...renderBody(body, 'en'),
    source,
  };
}

/**
 * 英語のページを site/i18n/ja/<slug>.ts の対応表で訳す。生成領域
 * (`<!-- name:start -->`) は site/i18n/ja/<slug>.<name>.md をそのまま使う
 */
async function translatePage(english: Page, body: string): Promise<Page> {
  const source = `${TRANSLATIONS}/${english.slug}.ts`;
  if (!(await Bun.file(join(ROOT, source)).exists())) {
    fail(`${source} is missing (every page in nav.json needs a translation)`);
  }
  const translation = (
    (await import(join(ROOT, source))) as { default: PageTranslation }
  ).default;
  const regions: Record<string, string> = {};
  for (const block of splitBlocks(body)) {
    if (block.kind !== 'region') continue;
    const file = Bun.file(
      join(ROOT, TRANSLATIONS, `${english.slug}.${block.name}.md`)
    );
    if (await file.exists()) regions[block.name] = await file.text();
  }
  const { markdown, missing, unused } = translateBody(
    body,
    translation,
    regions
  );
  if (missing.length > 0 || unused.length > 0) {
    const list = (items: string[]) =>
      items.map((item) => `  - ${item.replaceAll('\n', '\n    ')}`).join('\n');
    fail(
      [
        `${source} does not match ${english.source}.`,
        missing.length > 0
          ? `English paragraphs with no translation:\n${list(missing)}`
          : '',
        unused.length > 0
          ? `Translations whose English paragraph changed or was removed:\n${list(unused)}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  const rendered = renderBody(markdown, 'ja', english.headings);
  const shape = (list: Page['headings']) =>
    list.map((heading) => heading.level).join(',');
  if (shape(rendered.headings) !== shape(english.headings)) {
    fail(
      `${source} headings do not line up with ${english.source} (h2/h3 levels: ${shape(rendered.headings)} vs ${shape(english.headings)})`
    );
  }
  return {
    ...english,
    lang: 'ja',
    section: SECTIONS[english.section] ?? english.section,
    title: translation.title,
    description: translation.description,
    ...rendered,
    source,
  };
}

const pagesByLang: Record<Lang, Page[]> = { en: [], ja: [] };
for (const section of nav.sections) {
  if (SECTIONS[section.title] === undefined) {
    fail(`site/i18n.ts SECTIONS has no Japanese title for "${section.title}"`);
  }
  for (const slug of section.pages) {
    const english = await loadPage(slug, section.title);
    pagesByLang.en.push(english);
    const { body } = parseFrontmatter(
      await Bun.file(join(ROOT, english.source)).text()
    );
    pagesByLang.ja.push(await translatePage(english, body));
  }
}

/** nav.json に無いページや訳は、静かに消えないよう落とす */
async function listFiles(
  dir: string,
  extension: string,
  prefix = ''
): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(
        ...(await listFiles(
          join(dir, entry.name),
          extension,
          `${prefix}${entry.name}/`
        ))
      );
    } else if (entry.name.endsWith(extension)) {
      found.push(`${prefix}${entry.name.slice(0, -extension.length)}`);
    }
  }
  return found;
}
const slugs = new Set(pagesByLang.en.map((page) => page.slug));
for (const [dir, extension] of [
  [CONTENT, '.md'],
  [TRANSLATIONS, '.ts'],
] as const) {
  const orphans = (await listFiles(join(ROOT, dir), extension)).filter(
    (slug) => !slugs.has(slug)
  );
  if (orphans.length > 0) {
    fail(`${dir} has pages missing from nav.json:\n  ${orphans.join('\n  ')}`);
  }
}

function url(slug: string, lang: Lang): string {
  return `${prefix(lang)}/${slug}/`;
}

/** サイドメニューの先頭に置く、最新リリースへのリンク */
function latestRelease(lang: Lang): string {
  const tag = `v${escapeHtml(version)}`;
  const t = UI[lang];
  return `<a class="release" href="${nav.repo}/releases/tag/${tag}" title="${t.releaseNotes}">
  <span class="release-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg></span>
  <span class="release-text"><strong>${t.latest}</strong><small>${tag}</small></span>
</a>`;
}

function sidebar(current: Page): string {
  const pages = pagesByLang[current.lang];
  return (
    latestRelease(current.lang) +
    nav.sections
      .map((section) => {
        const items = section.pages
          .map((slug) => {
            const page = pages.find((candidate) => candidate.slug === slug);
            if (page === undefined) return '';
            const aria =
              page.slug === current.slug ? ' aria-current="page"' : '';
            const label = /\.tsx/.test(page.title)
              ? page.title.replace(/([\w-]+\.tsx)/g, '<code>$1</code>')
              : escapeHtml(page.title);
            return `<li><a href="${url(page.slug, page.lang)}"${aria}>${label}</a></li>`;
          })
          .join('');
        const title =
          current.lang === 'en'
            ? section.title
            : (SECTIONS[section.title] ?? section.title);
        return `<h4>${escapeHtml(title)}</h4><ul>${items}</ul>`;
      })
      .join('')
  );
}

function toc(page: Page): string {
  if (page.headings.length === 0) return '';
  const items = page.headings
    .map(
      (heading) =>
        `<li class="h${heading.level}"><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`
    )
    .join('');
  return `<h5>${UI[page.lang].onThisPage}</h5><ul>${items}</ul>`;
}

function pager(page: Page, index: number): string {
  const pages = pagesByLang[page.lang];
  const t = UI[page.lang];
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const link = (target: Page | undefined, kind: 'prev' | 'next') =>
    target === undefined
      ? ''
      : `<a class="${kind}" href="${url(target.slug, target.lang)}"><small>${kind === 'prev' ? t.previous : t.next}</small>${escapeHtml(target.title)}</a>`;
  return `<div class="pager">${link(prev, 'prev')}${link(next, 'next')}</div>`;
}

/** ヘッダーの言語切り替え。同じページのもう一方の言語へ飛ぶ */
function languageSwitch(page: Page, home: boolean): string {
  const other: Lang = page.lang === 'en' ? 'ja' : 'en';
  const href = home ? `${prefix(other)}/` : url(page.slug, other);
  const label = UI[page.lang].switchTo;
  return `<a class="icon lang" id="lang" href="${href}" hreflang="${other}" lang="${other}" aria-label="${label}" title="${label}">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
  </a>`;
}

/** 検索エンジン向けに、同じページの各言語版を知らせる */
function alternates(page: Page, home: boolean): string {
  return LANGS.map(
    (lang) =>
      `<link rel="alternate" hreflang="${lang}" href="${home ? `${prefix(lang)}/` : url(page.slug, lang)}">`
  ).join('\n');
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
document.getElementById('lang').addEventListener('click', function (event) {
  if (location.hash) {
    event.preventDefault();
    location.href = this.href + location.hash;
  }
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

function render(page: Page, index: number, home = false): string {
  const title = `${page.title} | ${nav.title}`;
  const t = UI[page.lang];
  return `<!doctype html>
<html lang="${page.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
${alternates(page, home)}
<link rel="icon" type="image/png" sizes="32x32" href="${BASE}/favicon.png">
<link rel="stylesheet" href="${BASE}/style.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css" media="(prefers-color-scheme: light)">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css" media="(prefers-color-scheme: dark)">
<script>${THEME_SCRIPT}</script>
</head>
<body>
<header class="top">
  <a class="brand" href="${prefix(page.lang)}/" aria-label="${escapeHtml(nav.title)} ${t.home}"><img src="${BASE}/decopin-logo-long.webp" alt="${escapeHtml(nav.title)}" width="2072" height="759"></a>
  <button class="search" id="search-open" type="button" aria-haspopup="dialog" aria-controls="search-dialog" aria-keyshortcuts="Meta+K Control+K"><span class="search-label">${t.searchButton}</span><span class="search-mobile-label">${t.searchMobile}</span> <kbd>⌘K</kbd></button>
  ${languageSwitch(page, home)}
  <a class="icon" href="${nav.repo}" aria-label="GitHub" title="GitHub">
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
  </a>
  <button class="icon" id="theme" aria-label="${t.toggleTheme}" title="${t.toggleTheme}">&#9681;</button>
  <button class="icon menu" id="menu" aria-label="${t.menu}">&#9776;</button>
</header>
<dialog id="search-dialog" class="search-dialog" aria-labelledby="search-title">
  <div class="search-header"><label id="search-title" for="search-input">${t.searchTitle}</label><button id="search-close" type="button" aria-label="${t.searchClose}">Esc</button></div>
  <input id="search-input" type="search" placeholder="${t.searchPlaceholder}" autocomplete="off" autofocus aria-describedby="search-status search-hint">
  <p id="search-status" role="status" aria-live="polite"></p>
  <ul id="search-results" aria-label="${t.searchResults}"></ul>
  <p id="search-hint">${t.searchHint}</p>
</dialog>
<div class="shell">
  <nav class="side" aria-label="${t.docs}">${sidebar(page)}</nav>
  <main>
    <div class="crumbs"><span>${escapeHtml(page.section)}</span><span>${escapeHtml(page.title)}</span></div>
    <h1>${escapeHtml(page.title)}</h1>
    ${page.description === '' ? '' : `<p class="lead">${escapeHtml(page.description)}</p>`}
    ${page.html}
    ${pager(page, index)}
  </main>
  <aside class="toc">${toc(page)}<a class="edit" href="${nav.repo}/edit/main/${page.source}">${t.editPage}</a></aside>
</div>
<footer class="site"><span>${t.license}</span><a href="${nav.repo}">GitHub</a><a href="https://www.npmjs.com/package/decopin-cli">npm</a></footer>
<script type="module" src="${BASE}/search.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const lang of LANGS) {
  const pages = pagesByLang[lang];
  const dir = lang === 'en' ? OUT : join(OUT, lang);
  for (const [index, page] of pages.entries()) {
    const path = join(dir, page.slug, 'index.html');
    await mkdir(dirname(path), { recursive: true });
    await Bun.write(path, render(page, index));
  }

  // トップは最初のページ (Introduction) をそのまま出す
  const first = pages[0];
  if (first !== undefined)
    await Bun.write(join(dir, 'index.html'), render(first, 0, true));

  // 検索の索引は言語ごとに分ける (search.ts が <html lang> で選ぶ)
  await Bun.write(
    join(dir, 'search-index.json'),
    JSON.stringify(
      pages.map((page) => ({
        title: page.title,
        description: page.description,
        section: page.section,
        url: url(page.slug, lang),
        html: page.html,
      }))
    )
  );
}

await Bun.write(join(OUT, 'style.css'), Bun.file(join(ROOT, 'site/style.css')));
await Bun.write(
  join(OUT, 'favicon.png'),
  Bun.file(join(ROOT, 'site/assets/favicon.png'))
);
await Bun.write(
  join(OUT, 'decopin-logo-long.webp'),
  Bun.file(join(ROOT, 'site/assets/decopin-logo-long.webp'))
);
const searchBuild = await Bun.build({
  entrypoints: [join(ROOT, 'site/search.ts')],
  outdir: OUT,
  target: 'browser',
  format: 'esm',
});
if (!searchBuild.success) {
  throw new AggregateError(
    searchBuild.logs,
    'Failed to build documentation search'
  );
}
// GitHub Pages が Jekyll として解釈しないように
await Bun.write(join(OUT, '.nojekyll'), '');

console.log(
  `site: ${pagesByLang.en.length} pages × ${LANGS.length} languages -> site/dist (base "${BASE}")`
);
