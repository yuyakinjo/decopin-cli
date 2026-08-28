/**
 * 公開するパッケージが壊れていないことを担保する。
 *
 * publish してから気づいても取り消せないので、`publish/` を実際に組み立てて
 * 中身を検査する。ここが落ちたら npm に出してはいけない。
 */
import { beforeAll, describe, expect, test } from 'bun:test';

const OUT = 'publish';

interface Manifest {
  name: string;
  version: string;
  type: string;
  engines?: Record<string, string>;
  exports: Record<string, { types: string; import: string }>;
  bin: Record<string, string>;
  files: string[];
  dependencies?: Record<string, string>;
}

let manifest: Manifest;
let source: { version: string; dependencies?: Record<string, string> };

beforeAll(async () => {
  const proc = Bun.spawn(['bun', 'run', 'build:package'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  expect(code).toBe(0);
  manifest = (await Bun.file(`${OUT}/package.json`).json()) as Manifest;
  source = (await Bun.file('package.json').json()) as typeof source;
}, 60_000);

describe('公開するパッケージ', () => {
  test('exports が指すファイルがすべて実在する', async () => {
    const missing: string[] = [];
    for (const [name, entry] of Object.entries(manifest.exports)) {
      for (const path of Object.values(entry)) {
        if (!(await Bun.file(`${OUT}/${path}`).exists())) {
          missing.push(`${name} → ${path}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('JSX の入口が両方ある (jsxImportSource が解決できる)', () => {
    expect(manifest.exports['./jsx/jsx-runtime']).toBeDefined();
    expect(manifest.exports['./jsx/jsx-dev-runtime']).toBeDefined();
  });

  test('bin が実在し、shebang を持つ', async () => {
    const path = `${OUT}/${manifest.bin.decopin}`;
    expect(await Bun.file(path).exists()).toBe(true);
    const source = await Bun.file(path).text();
    expect(source.startsWith('#!/usr/bin/env bun')).toBe(true);
  });

  test('ソースを同梱しない (lib と README と LICENSE だけ)', () => {
    expect(manifest.files.sort()).toEqual(['LICENSE', 'README.md', 'lib']);
  });

  test('実行時に要る依存だけを持つ', () => {
    // typescript は開発でしか使わないので、利用者に配らない
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(['valibot']);
  });

  test('version がリポジトリと一致する', () => {
    expect(manifest.version).toBe(source.version);
  });

  test('Bun が要ることを engines で示す', () => {
    // Bun.build / Bun.stdin を使うので、JS にしても Node では動かない
    expect(manifest.engines?.bun).toBeDefined();
  });

  test('生成された型の受け皿が公開されている', async () => {
    const types = await Bun.file(`${OUT}/lib/index.d.ts`).text();
    expect(types).toContain('CommandProps');
    expect(types).toContain('Routes');
  });
});

describe('リリースの手順', () => {
  test('タグと version の一致を CI が確かめている', async () => {
    const workflow = await Bun.file('.github/workflows/release.yml').text();
    expect(workflow).toContain('does not match package.json');
    // トークンではなく OIDC で公開する (長期のトークンを secrets に置かない)
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('--provenance');
    expect(workflow).not.toContain('NODE_AUTH_TOKEN');
    expect(workflow).not.toMatch(/secrets\.\w*NPM/);
  });

  test('公開の前に ci を通している', async () => {
    const workflow = await Bun.file('.github/workflows/release.yml').text();
    const ciAt = workflow.indexOf('bun run ci');
    const publishAt = workflow.indexOf('npm publish');
    expect(ciAt).toBeGreaterThan(0);
    expect(publishAt).toBeGreaterThan(ciAt);
  });
});
