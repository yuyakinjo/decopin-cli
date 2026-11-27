/**
 * 英語の Markdown を段落に分け、site/i18n/ja/<slug>.ts の対応表で訳す (ADR 53)。
 *
 * 段落は空行で区切る。コードブロックは訳さずそのまま残し、
 * `<!-- name:start -->` 〜 `<!-- name:end -->` の生成領域は丸ごと
 * site/i18n/ja/<slug>.<name>.md に置き換える (生成スクリプトが両方を書く)。
 *
 * 対応表のキーは英語の段落の空白を詰めたもの。行の折り返しや表の桁揃えを
 * 直しただけでは訳は外れず、文面を変えると外れてビルドが落ちる。
 */
import type { PageTranslation } from '../site/i18n.ts';

export type Block =
  | { kind: 'text' | 'code'; source: string }
  | { kind: 'region'; name: string; source: string };

const FENCE = '```';
const REGION_START = /^<!-- ([\w-]+):start -->$/;

/** Markdown の本文 (frontmatter を除いたもの) を段落・コード・生成領域に分ける */
export function splitBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  let lines: string[] = [];
  let kind: Block['kind'] = 'text';
  let name = '';
  const flush = () => {
    if (lines.length > 0) {
      const source = lines.join('\n');
      blocks.push(
        kind === 'region' ? { kind, name, source } : { kind, source }
      );
    }
    lines = [];
    kind = 'text';
  };
  for (const line of body.split('\n')) {
    if (kind === 'code') {
      lines.push(line);
      if (line.startsWith(FENCE)) flush();
      continue;
    }
    if (kind === 'region') {
      lines.push(line);
      if (line === `<!-- ${name}:end -->`) flush();
      continue;
    }
    const region = REGION_START.exec(line);
    if (line.startsWith(FENCE) || region !== null) {
      flush();
      kind = region === null ? 'code' : 'region';
      name = region?.[1] ?? '';
      lines.push(line);
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    lines.push(line);
  }
  if (kind !== 'text') {
    throw new Error(`unclosed ${kind} block: ${lines[0] ?? ''}`);
  }
  flush();
  return blocks;
}

/** 行頭がこれなら改行を残す (表の行・リストの項目・見出し・引用) */
const KEEP_BREAK = /^(\||[-*+] |\d+\. |#{1,6} |>)/;
const TABLE_RULE = /^\|[\s:|-]+\|$/;

/**
 * 対応表のキー。空白を詰め、段落内の折り返しは 1 つの空白にする。
 * 表の区切り行の `-` の数 (桁揃えで変わる) も揃える
 */
export function blockKey(source: string): string {
  let key = '';
  for (const raw of source.split('\n')) {
    let line = raw.trim().replaceAll(/\s+/g, ' ');
    if (line === '') continue;
    if (TABLE_RULE.test(line)) line = line.replaceAll(/-+/g, '---');
    if (key === '') key = line;
    else key += KEEP_BREAK.test(line) ? `\n${line}` : ` ${line}`;
  }
  return key;
}

export interface Translated {
  markdown: string;
  /** 訳が無い英語の段落 (キー) と生成領域の名前 */
  missing: string[];
  /** どの段落にも使われなかった訳のキー (英語側が変わった・消えた) */
  unused: string[];
}

/** 英語の本文を対応表で訳す。コードブロックは英語版のまま */
export function translateBody(
  body: string,
  translation: PageTranslation,
  regions: Record<string, string>
): Translated {
  const used = new Set<string>();
  const missing: string[] = [];
  const out: string[] = [];
  for (const block of splitBlocks(body)) {
    if (block.kind === 'code') {
      out.push(block.source);
    } else if (block.kind === 'region') {
      const region = regions[block.name];
      if (region === undefined) missing.push(`<!-- ${block.name} -->`);
      out.push((region ?? block.source).trim());
    } else {
      const key = blockKey(block.source);
      if (Object.hasOwn(translation.blocks, key)) {
        used.add(key);
        out.push(translation.blocks[key]!);
      } else {
        missing.push(key);
        out.push(block.source);
      }
    }
  }
  const unused = Object.keys(translation.blocks).filter(
    (key) => !used.has(key)
  );
  return { markdown: `${out.join('\n\n')}\n`, missing, unused };
}
