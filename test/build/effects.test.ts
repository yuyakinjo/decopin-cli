/**
 * 副作用の到達判定 (ADR 32)。
 *
 * `none` は「無いことの証明」なので、**取りこぼしが無いこと**が要。
 * 検出できない書き方に当たったら `unknown` に落ち、`none` を名乗らない
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  analyzeEffects,
  EFFECT_CATEGORIES,
  importedNames,
  stripLiterals,
} from '../../src/build/effects.ts';
import type { EffectCategory, Verdict } from '../../src/build/effects.ts';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'decopin-effects-'));
  await writeFile(
    join(dir, 'spawner.ts'),
    "export const go = () => Bun.spawn(['ls']);\n"
  );
  await writeFile(join(dir, 'pure.ts'), 'export const n = 1;\n');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** そのコードだけを入口にして判定する */
async function verdicts(
  code: string,
  name = `case-${Math.random().toString(36).slice(2)}.tsx`
) {
  const file = join(dir, name);
  await writeFile(file, code);
  return analyzeEffects([file]);
}

/** none 以外だけを拾う (表が読みやすくなる) */
function notable(effects: Record<EffectCategory, Verdict>): string[] {
  return EFFECT_CATEGORIES.filter((c) => effects[c] !== 'none').map(
    (c) => `${c}=${effects[c]}`
  );
}

describe('何も触らないコマンドは none を証明できる', () => {
  test('素のコマンドは全部 none', async () => {
    const report = await verdicts('export default () => null;\n');
    expect(notable(report.effects)).toEqual([]);
    expect(report.escapes).toEqual([]);
  });

  test('枠組みを import しても none のまま (fact)', async () => {
    // decopin-cli の中の process.exit は終了コードを返す仕組みで、
    // コマンドの副作用ではない。歩くと全コマンドが detected になる
    const report = await verdicts(
      "import { Line } from 'decopin-cli';\nexport default () => Line;\n"
    );
    expect(notable(report.effects)).toEqual([]);
  });
});

describe('カテゴリごとの検出', () => {
  const cases: [string, string, string[]][] = [
    [
      'node:fs の読み取り',
      "import { readFile } from 'node:fs/promises';\nexport default () => readFile('x');",
      ['fs.read=detected'],
    ],
    [
      'node:fs の書き込み',
      "import { writeFile } from 'node:fs/promises';\nexport default () => writeFile('a', 'b');",
      ['fs.write=detected'],
    ],
    [
      '名前空間 import は絞れないので両方',
      "import * as fs from 'node:fs';\nexport default () => fs;",
      ['fs.read=detected', 'fs.write=detected'],
    ],
    [
      'node:https',
      "import { get } from 'node:https';\nexport default () => get;",
      ['network=detected'],
    ],
    [
      'child_process',
      "import { spawn } from 'node:child_process';\nexport default () => spawn('ls');",
      ['process.spawn=detected'],
    ],
    [
      'Bun.spawn',
      "export default () => Bun.spawn(['ls']);",
      ['process.spawn=detected'],
    ],
    ['Bun.$', 'export default () => Bun.$`ls`;', ['process.spawn=detected']],
    [
      'Bun.write',
      "export default () => Bun.write('a', 'b');",
      ['fs.write=detected'],
    ],
    [
      'Bun.which',
      "export default () => Bun.which('git');",
      ['fs.read=detected'],
    ],
    [
      'process.exit',
      'export default () => process.exit(1);',
      ['process.mutate=detected'],
    ],
    [
      'process.env への代入',
      "export default () => { process.env.X = '1'; };",
      ['process.mutate=detected'],
    ],
  ];

  for (const [label, code, expected] of cases) {
    test(label, async () => {
      const report = await verdicts(code);
      expect(notable(report.effects).sort()).toEqual(expected.sort());
    });
  }

  test('依存の先にある副作用も数える', async () => {
    const report = await verdicts(
      "import { go } from './spawner.ts';\nexport default go;"
    );
    expect(notable(report.effects)).toEqual(['process.spawn=detected']);
    // どこで見つけたかを言える
    expect(report.sites[0]?.file).toContain('spawner.ts');
  });

  test('触っていない依存は none を汚さない', async () => {
    const report = await verdicts(
      "import { n } from './pure.ts';\nexport default () => n;"
    );
    expect(notable(report.effects)).toEqual([]);
  });
});

describe('解析を諦めたら none を名乗らない', () => {
  const escaping: [string, string, string][] = [
    ['eval', "export default () => eval('1');", 'eval'],
    [
      'new Function',
      "export default () => new Function('return 1');",
      'new Function',
    ],
    ['WebAssembly', 'export default () => WebAssembly.compile;', 'WebAssembly'],
  ];

  for (const [label, code, via] of escaping) {
    test(`${label} に当たったら全部 unknown`, async () => {
      const report = await verdicts(code);
      expect(notable(report.effects)).toEqual(
        EFFECT_CATEGORIES.map((c) => `${c}=unknown`)
      );
      expect(report.escapes.map((e) => e.via)).toContain(via);
    });
  }

  test('見つかった分は detected のまま (unknown で塗り潰さない)', async () => {
    const report = await verdicts(
      "export default () => { Bun.spawn(['ls']); eval('1'); };"
    );
    expect(report.effects['process.spawn']).toBe('detected');
    expect(report.effects.network).toBe('unknown');
  });
});

describe('文面を副作用と間違えない', () => {
  test('文字列の中は数えない', async () => {
    const report = await verdicts(
      "export default () => 'we do not fetch( or eval( here';"
    );
    expect(notable(report.effects)).toEqual([]);
    expect(report.escapes).toEqual([]);
  });

  test('コメントの中も数えない', async () => {
    const report = await verdicts(
      '// fetch( eval( Bun.spawn(\n/* also here */\nexport default () => null;'
    );
    expect(notable(report.effects)).toEqual([]);
  });
});

describe('stripLiterals', () => {
  test('文字列とコメントを落とす', () => {
    const out = stripLiterals("const a = 'x'; // y\n/* z */ const b = 1;");
    expect(out).not.toContain('x');
    expect(out).not.toContain('y');
    expect(out).not.toContain('z');
    expect(out).toContain('const b = 1;');
  });
});

describe('importedNames', () => {
  test('名前付き import を拾う', () => {
    expect(
      importedNames("import { readFile, writeFile } from 'node:fs';", 'node:fs')
    ).toEqual(['readFile', 'writeFile']);
  });

  test('as で別名にしても元の名前を返す', () => {
    expect(
      importedNames("import { readFile as rf } from 'node:fs';", 'node:fs')
    ).toEqual(['readFile']);
  });

  test('名前空間 import は絞れないので undefined', () => {
    expect(
      importedNames("import * as fs from 'node:fs';", 'node:fs')
    ).toBeUndefined();
  });

  test('既定 import も絞れない', () => {
    expect(
      importedNames("import fs from 'node:fs';", 'node:fs')
    ).toBeUndefined();
  });
});
