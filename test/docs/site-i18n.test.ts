/**
 * ドキュメントサイトの日本語の対応表 (site/i18n/ja/<slug>.ts) が英語版と
 * ずれていないかを見る (ADR 53)。
 *
 * 英語の段落を書き換えると対応表のキーが合わなくなり、ここと build-site.ts が
 * 落ちる。コードブロックは英語版をそのまま使うので訳には無い。訳の側では、
 * 段落の形 (見出しの深さ・表の行・リストの項目)、リンク先、inline code が
 * 英語の段落と揃っているかを見る。
 *
 *   bun test test/docs/site-i18n.test.ts -t conventions/   # 一部だけ
 */
import { describe, expect, test } from 'bun:test';

import {
  blockKey,
  splitBlocks,
  translateBody,
} from '../../scripts/site-translate.ts';
import { type PageTranslation, SECTIONS } from '../../site/i18n.ts';

const EN = 'site/content';
const JA = 'site/i18n/ja';

const nav = (await Bun.file('site/nav.json').json()) as {
  sections: { title: string; pages: string[] }[];
};
const slugs = nav.sections.flatMap((section) => section.pages);

function parse(source: string): { title: string; body: string } {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(source);
  const title = /^title:(.*)$/m.exec(front?.[1] ?? '')?.[1]?.trim() ?? '';
  return { title, body: source.slice(front?.[0].length ?? 0) };
}

/** 行頭の記号の並び。見出しの深さ・表の行数・リストの項目数を比べる */
function shape(markdown: string): string[] {
  return markdown
    .split('\n')
    .map((line) => /^(\||[-*+] |\d+\. |#{1,6} |>)/.exec(line.trim())?.[1])
    .filter((marker) => marker !== undefined)
    .map((marker) => (/^\d/.test(marker) ? '1. ' : marker));
}

const links = (markdown: string) =>
  [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]).sort();

const inlineCode = (markdown: string) =>
  [...markdown.matchAll(/`([^`]+)`/g)].map((match) =>
    (match[1] ?? '').replaceAll(/\s+/g, ' ')
  );

describe('日本語版ドキュメント', () => {
  test('nav.json の各節に日本語の節名がある', () => {
    const missing = nav.sections
      .map((section) => section.title)
      .filter((title) => SECTIONS[title] === undefined);
    expect(missing).toEqual([]);
  });

  test('site/i18n/ja には nav.json に載っているページの訳だけがある', () => {
    const files = [...new Bun.Glob('**/*.ts').scanSync(JA)]
      .map((path) => path.slice(0, -3))
      .sort();
    expect(files).toEqual([...slugs].sort());
  });

  test('生成領域の訳 (<slug>.<name>.md) は英語版にある領域だけ', async () => {
    const expected: string[] = [];
    for (const slug of slugs) {
      const { body } = parse(await Bun.file(`${EN}/${slug}.md`).text());
      for (const block of splitBlocks(body)) {
        if (block.kind === 'region') expected.push(`${slug}.${block.name}`);
      }
    }
    const files = [...new Bun.Glob('**/*.md').scanSync(JA)]
      .map((path) => path.slice(0, -3))
      .sort();
    expect(files).toEqual(expected.sort());
  });

  for (const slug of slugs) {
    test(`${slug}: すべての段落に訳があり、形・リンク・コードが揃っている`, async () => {
      const en = parse(await Bun.file(`${EN}/${slug}.md`).text());
      const translation = (
        (await import(`../../${JA}/${slug}.ts`)) as {
          default: PageTranslation;
        }
      ).default;

      expect(translation.title).toBeTruthy();
      expect(translation.description).toBeTruthy();
      // ファイル名の題 (cmd.tsx など) は訳さない
      if (/^[\w-]+\.tsx$/.test(en.title))
        expect(translation.title).toBe(en.title);

      const regions: Record<string, string> = {};
      for (const block of splitBlocks(en.body)) {
        if (block.kind === 'region') regions[block.name] = '';
      }
      const { missing, unused } = translateBody(en.body, translation, regions);
      expect({ missing, unused }).toEqual({ missing: [], unused: [] });

      for (const block of splitBlocks(en.body)) {
        if (block.kind !== 'text') continue;
        const key = blockKey(block.source);
        const ja = translation.blocks[key] ?? '';
        const label = `${slug}: ${key.slice(0, 60)}`;
        expect({ label, shape: shape(ja) }).toEqual({
          label,
          shape: shape(key),
        });
        expect({ label, links: links(ja) }).toEqual({
          label,
          links: links(key),
        });
        const kept = new Set(inlineCode(ja));
        expect({
          label,
          dropped: inlineCode(key).filter((code) => !kept.has(code)),
        }).toEqual({ label, dropped: [] });
      }
    });
  }
});
