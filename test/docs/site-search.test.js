import { describe, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { searchPages } from '../../site/search.ts';

const pages = [
  {
    title: 'Setup',
    description: 'Install the CLI',
    section: 'Getting started',
    text: 'Run bun install to begin.',
    url: '/setup/',
  },
  {
    title: 'Commands',
    description: 'Build commands',
    section: 'Conventions',
    text: 'Configure setup with CmdProps and JSX output.',
    url: '/cmd/',
  },
];

describe('documentation search', () => {
  test('finds body-only terms, ignores case and whitespace, and requires every term', () => {
    expect(
      searchPages(pages, '  CMDPROPS jsx  ').map((page) => page.url)
    ).toEqual(['/cmd/']);
    expect(searchPages(pages, 'CmdProps missing')).toEqual([]);
    expect(searchPages(pages, '   ')).toEqual([]);
  });

  test('ranks title matches first and returns a snippet around the match', () => {
    expect(searchPages(pages, 'setup').map((page) => page.title)).toEqual([
      'Setup',
      'Commands',
    ]);
    const long = {
      ...pages[0],
      text: `${'before '.repeat(50)}needle ${'after '.repeat(50)}`,
    };
    const result = searchPages([long], 'needle')[0];
    expect(result.snippet).toContain('needle');
    expect(result.snippet.startsWith('…')).toBe(true);
    expect(result.snippet.endsWith('…')).toBe(true);
  });

  test('treats punctuation as literal text', () => {
    expect(
      searchPages(
        [{ ...pages[0], text: '<Text> cmd.tsx [args]' }],
        '<Text> [args]'
      )
    ).toHaveLength(1);
    expect(searchPages(pages, '.*')).toEqual([]);
  });

  test('builds all search assets and valid links for root and GitHub Pages hosting', async () => {
    const root = await mkdtemp(join(tmpdir(), 'decopin-site-search-'));
    const source = new URL('../..', import.meta.url).pathname;
    try {
      await mkdir(join(root, 'scripts'));
      await mkdir(join(root, 'site'));
      for (const name of ['build-site.ts', 'site-translate.ts']) {
        await cp(join(source, 'scripts', name), join(root, 'scripts', name));
      }
      for (const name of [
        'assets',
        'content',
        'i18n',
        'i18n.ts',
        'nav.json',
        'style.css',
        'search.ts',
      ]) {
        await cp(join(source, 'site', name), join(root, 'site', name), {
          recursive: true,
        });
      }
      await cp(join(source, 'package.json'), join(root, 'package.json'));
      const { version } = await Bun.file(join(source, 'package.json')).json();
      for (const base of ['', '/decopin-cli']) {
        const build = Bun.spawn(
          [process.execPath, 'scripts/build-site.ts', '--base', base],
          {
            cwd: root,
            stdout: 'pipe',
            stderr: 'pipe',
          }
        );
        expect(await build.exited).toBe(0);
        const output = join(root, 'site/dist');
        const index = await Bun.file(join(output, 'search-index.json')).json();
        const nav = await Bun.file(join(root, 'site/nav.json')).json();
        expect(index.length).toBe(
          nav.sections.flatMap((section) => section.pages).length
        );
        const builtSearch = await import(join(output, 'search.js'));
        expect(builtSearch.searchPages(pages, 'CMDPROPS jsx')).toEqual(
          searchPages(pages, 'CMDPROPS jsx')
        );
        for (const page of index) {
          expect(page.url.startsWith(`${base}/`)).toBe(true);
          expect(page.html.length).toBeGreaterThan(0);
          const html = await Bun.file(
            join(output, page.url.slice(base.length), 'index.html')
          ).text();
          expect(html).toContain('id="search-open"');
          expect(html).toContain('<dialog id="search-dialog"');
          expect(html).toContain(`src="${base}/search.js"`);
          expect(html).toContain(`<small>v${version}</small>`);
          expect(html).toContain('<html lang="en">');
          expect(html).toContain(
            `href="${base}/ja${page.url.slice(base.length)}"`
          );
        }
        const jaIndex = await Bun.file(
          join(output, 'ja/search-index.json')
        ).json();
        expect(jaIndex.length).toBe(index.length);
        for (const page of jaIndex) {
          expect(page.url.startsWith(`${base}/ja/`)).toBe(true);
          const html = await Bun.file(
            join(output, page.url.slice(base.length), 'index.html')
          ).text();
          expect(html).toContain('<html lang="ja">');
          expect(html).toContain('id="lang"');
          expect(html).toContain(
            `href="${base}${page.url.slice(base.length + '/ja'.length)}"`
          );
          expect(html).toContain(`src="${base}/search.js"`);
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
