/**
 * 公開 API に JSDoc があることを担保する。
 *
 * 仕様書を持たない方針なので、**個々の API の理由は実装の隣 (JSDoc) に置く**。
 * 書き忘れるとここが落ちる。エディタの補完に出るものが唯一の説明になるため。
 */
import { describe, expect, test } from 'bun:test';

const ENTRY = 'src/index.ts';

interface Reexport {
  /** 公開される名前 */
  name: string;
  /** 元のファイル */
  from: string;
  isType: boolean;
}

/** `export { a, b } from './x.ts'` を解く */
function parseReexports(source: string): Reexport[] {
  const results: Reexport[] = [];
  const pattern = /export\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g;

  for (const match of source.matchAll(pattern)) {
    const blockIsType = match[1] !== undefined;
    const from = match[3] as string;
    for (const raw of (match[2] as string).split(',')) {
      const entry = raw.trim();
      if (entry === '') continue;
      const isType = blockIsType || entry.startsWith('type ');
      const name = entry.replace(/^type\s+/, '').split(/\s+as\s+/)[0] as string;
      results.push({ name, from, isType });
    }
  }
  return results;
}

/** その名前の宣言の直前に JSDoc (`/** ... *\/`) があるか */
function hasJsDoc(source: string, name: string): boolean {
  const declarations = [
    `export const ${name}`,
    `export function ${name}`,
    `export async function ${name}`,
    `export interface ${name}`,
    `export type ${name}`,
    `export class ${name}`,
    `export declare namespace ${name}`,
  ];

  for (const declaration of declarations) {
    let index = source.indexOf(declaration);
    while (index !== -1) {
      const before = source.slice(0, index).trimEnd();
      if (before.endsWith('*/')) return true;
      index = source.indexOf(declaration, index + 1);
    }
  }
  return false;
}

/** `./x.ts` / `../x.ts` を、そのファイルから見た実際のパスにする */
function resolveFrom(from: string, base: string): string {
  const dir = base.slice(0, base.lastIndexOf('/'));
  const parts = `${dir}/${from}`.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

const sources = new Map<string, string>();

async function read(path: string): Promise<string> {
  const cached = sources.get(path);
  if (cached !== undefined) return cached;
  const source = await Bun.file(path).text();
  sources.set(path, source);
  return source;
}

/**
 * その名前が宣言されているファイルを探す。
 * `export { x } from './y.ts'` を辿るので、束ねている index も通り抜けられる
 */
async function declarationSite(
  name: string,
  path: string,
  depth = 0
): Promise<{ path: string; documented: boolean }> {
  const source = await read(path);
  if (depth > 5) return { path, documented: false };
  if (hasJsDoc(source, name)) return { path, documented: true };

  for (const entry of parseReexports(source)) {
    if (entry.name !== name) continue;
    return declarationSite(name, resolveFrom(entry.from, path), depth + 1);
  }
  return { path, documented: false };
}

const entrySource = await Bun.file(ENTRY).text();
const reexports = parseReexports(entrySource);

describe('公開 API', () => {
  test('十分な数を export している (解析が壊れていないことの確認)', () => {
    expect(reexports.length).toBeGreaterThan(50);
  });

  test('すべての公開シンボルに JSDoc がある', async () => {
    const missing: string[] = [];
    for (const { name, from } of reexports) {
      const site = await declarationSite(name, resolveFrom(from, ENTRY));
      if (!site.documented) missing.push(`${name} (${site.path})`);
    }
    // エディタの補完に出る説明が、この API の唯一の説明になる
    expect(missing).toEqual([]);
  });

  test('re-export 元のファイルがすべて実在する', async () => {
    for (const { from } of reexports) {
      const path = resolveFrom(from, ENTRY);
      expect((await read(path)).length, path).toBeGreaterThan(0);
    }
  });
});
