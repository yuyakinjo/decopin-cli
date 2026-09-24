/**
 * `decopin gen` が書く雛形 (src/cli/gen/templates.ts)。
 *
 * 生成できる名前と雛形の表がずれていないこと、各雛形が TSX として読めて
 * default export を持ち、decopin-cli から実在する値だけを import していることを見る。
 * build・実行まで通す確認は test/intent/gen/ の側にある
 */
import { describe, expect, test } from 'bun:test';

import * as decopin from 'decopin-cli';

import { GENERATOR_KINDS } from '../../../src/cli/gen/generate.ts';
import { FILE_TEMPLATES } from '../../../src/cli/gen/templates.ts';

const transpiler = new Bun.Transpiler({ loader: 'tsx' });
const generatable = new Set<string>(Object.values(GENERATOR_KINDS).flat());

/** `import { A, type B } from 'decopin-cli'` のうち、値として読む名前 */
function valueImports(source: string): string[] {
  const match = source.match(/import\s*\{([^}]*)\}\s*from\s*'decopin-cli'/);
  if (match?.[1] === undefined) return [];
  return match[1]
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '' && !part.startsWith('type '));
}

describe('FILE_TEMPLATES', () => {
  test('gen で選べる名前すべてに雛形があり、選べない名前の雛形は無い', () => {
    expect(new Set(Object.keys(FILE_TEMPLATES))).toEqual(generatable);
  });

  test('継承ファイルはすべて規約ファイルでもあり、雛形を共有する', () => {
    for (const name of GENERATOR_KINDS.inherited) {
      expect((GENERATOR_KINDS.conv as readonly string[]).includes(name)).toBe(
        true
      );
    }
  });

  test('値の import と型の import を分けて読む (下の検査の前提)', () => {
    expect(valueImports(FILE_TEMPLATES.cmd)).toEqual(['Line']);
    expect(valueImports(FILE_TEMPLATES.error)).toEqual(['Danger']);
    expect(valueImports(FILE_TEMPLATES.layout)).toEqual([]);
  });

  for (const [name, source] of Object.entries(FILE_TEMPLATES)) {
    test(`${name}: TSX として読めて default export を持つ`, () => {
      expect(() => transpiler.transformSync(source)).not.toThrow();
      expect(transpiler.scan(source).exports).toContain('default');
      expect(source.endsWith('\n')).toBe(true);
    });

    test(`${name}: decopin-cli から import する値は実在する`, () => {
      for (const imported of valueImports(source)) {
        expect(Object.keys(decopin)).toContain(imported);
      }
    });
  }
});
