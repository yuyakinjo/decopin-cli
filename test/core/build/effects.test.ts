/**
 * 副作用の到達判定 (ADR 32)。
 *
 * `none` は MCP の「読み取り専用」の注釈になる (ADR 33) ので、
 * **取りこぼしが無いこと**が要。検出できない書き方に当たったら `unknown` に
 * 落ち、`none` を名乗らない。追わないと決めているもの (値の流れ) は
 * src/core/build/effects.ts の冒頭に書いてある
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  analyzeEffects,
  EFFECT_CATEGORIES,
  importedNames,
  packageName,
  stripLiterals,
} from '../../../src/core/build/effects.ts';
import type {
  EffectCategory,
  Verdict,
} from '../../../src/core/build/effects.ts';

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

  test('入口からの経路を言える (なぜ届くのかが分からないと直せない)', async () => {
    await writeFile(
      join(dir, 'via.ts'),
      "export { go } from './spawner.ts';\n"
    );
    const report = await verdicts(
      "import { go } from './via.ts';\nexport default go;",
      'entry.tsx'
    );
    const site = report.sites[0];
    expect(site?.path.map((file) => file.split('/').at(-1))).toEqual([
      'entry.tsx',
      'via.ts',
      'spawner.ts',
    ]);
    expect(site?.via).toBe('Bun.spawn');
  });

  test('escape にも経路が付く', async () => {
    await writeFile(
      join(dir, 'evil.ts'),
      "export const e = () => eval('1');\n"
    );
    const report = await verdicts(
      "import { e } from './evil.ts';\nexport default e;",
      'entry-evil.tsx'
    );
    expect(report.escapes[0]?.path.map((f) => f.split('/').at(-1))).toEqual([
      'entry-evil.tsx',
      'evil.ts',
    ]);
  });

  test('触っていない依存は none を汚さない', async () => {
    const report = await verdicts(
      "import { n } from './pure.ts';\nexport default () => n;"
    );
    expect(notable(report.effects)).toEqual([]);
  });
});

describe('fact: 歩かずに決めるもの', () => {
  test('よく使われるパッケージはサブパスでも同じ判定', () => {
    expect(packageName('axios')).toBe('axios');
    expect(packageName('axios/lib/adapters/http.js')).toBe('axios');
    expect(packageName('@scope/pkg/sub')).toBe('@scope/pkg');
  });

  test('Bun が自前で持つモジュールはファイルに解決しないので表で決める', async () => {
    // node-fetch / undici は Bun の resolveSync が指定子をそのまま返す。
    // 放っておくと network のパッケージが none を名乗る (実測で見つけた穴)
    const fetching = await verdicts(
      "import fetch from 'node-fetch';\nexport default () => fetch('http://x');"
    );
    expect(notable(fetching.effects)).toEqual(['network=detected']);
    const db = await verdicts(
      "import { Database } from 'bun:sqlite';\nexport default () => new Database(':memory:');"
    );
    expect(notable(db.effects).sort()).toEqual([
      'fs.read=detected',
      'fs.write=detected',
    ]);
    // 表に無い bun: モジュールは保証しない
    const ffi = await verdicts(
      "import { dlopen } from 'bun:ffi';\nexport default dlopen;"
    );
    expect(ffi.effects.network).toBe('unknown');
    expect(ffi.escapes[0]?.via).toBe('unknown Bun module bun:ffi');
  });
});

describe('静的な import() は追う (遅延させても届く先は届く)', () => {
  test('import() の先の副作用も数える', async () => {
    await writeFile(
      join(dir, 'lazy-target.ts'),
      "export const go = () => fetch('http://x');\n"
    );
    const report = await verdicts(
      "export default async () => (await import('./lazy-target.ts')).go();",
      'lazy.tsx'
    );
    expect(notable(report.effects)).toEqual(['network=detected']);
    expect(report.escapes).toEqual([]);
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

/**
 * 見逃すと、書き込むコマンドが「読み取り専用」の注釈付きで MCP に出る
 * (GHSA-mj3j-jwf5-4xcc)。**呼び出しの形に頼らず、名前が出た時点で数える**
 */
describe('書き方を変えても見逃さない', () => {
  const detected: [string, string, EffectCategory][] = [
    [
      'テンプレートの ${} の中',
      "export default async () => `w=${await Bun.write('a', 'b')}`;",
      'fs.write',
    ],
    [
      '入れ子のテンプレートの中',
      "export default () => `a ${[1].map((n) => `b ${fetch('http://x')} ${n}`)}`;",
      'network',
    ],
    [
      '別名にしてから呼ぶ',
      "const write = Bun.write;\nexport default () => write('a', 'b');",
      'fs.write',
    ],
    [
      '分割代入で取り出す',
      "const { write } = Bun;\nexport default () => write('a', 'b');",
      'fs.write',
    ],
    ['?. を挟む', "export default () => Bun?.write?.('a', 'b');", 'fs.write'],
    [
      'globalThis 経由',
      "export default () => globalThis.Bun.write('a', 'b');",
      'fs.write',
    ],
    [
      'fetch を別名にする',
      "const f = fetch;\nexport default () => f('http://x');",
      'network',
    ],
    ['fetch?.()', "export default () => fetch?.('http://x');", 'network'],
    [
      'JSX の文面にアポストロフィ',
      "import { Line } from 'decopin-cli';\nexport default async () => { const a = <Line>Don't</Line>; await Bun.write('a', 'b'); return <Line>it's {a}</Line>; };",
      'fs.write',
    ],
    [
      '正規表現の中のクォート',
      "const re = /'/;\nexport default async () => { await Bun.write('a', 'b'); return re.test(\"'\"); };",
      'fs.write',
    ],
    [
      'node: を付けない fs',
      "import { writeFileSync } from 'fs';\nexport default () => writeFileSync('a', 'b');",
      'fs.write',
    ],
    [
      'node: を付けない child_process',
      "import { execSync } from 'child_process';\nexport default () => execSync('ls');",
      'process.spawn',
    ],
    [
      "import { $ } from 'bun'",
      "import { $ } from 'bun';\nexport default () => $`rm -rf x`;",
      'process.spawn',
    ],
    [
      "import { write as w } from 'bun'",
      "import { write as w } from 'bun';\nexport default () => w('a', 'b');",
      'fs.write',
    ],
    [
      'Bun.file().delete()',
      "export default () => Bun.file('a').delete();",
      'fs.write',
    ],
    [
      'Bun.file().writer()',
      "export default () => Bun.file('a').writer().write('x');",
      'fs.write',
    ],
    [
      'Bun.file() を変数に入れてから書く',
      "export default () => { const file = Bun.file('a'); return file.write('x'); };",
      'fs.write',
    ],
    [
      '同じモジュールを 2 文に分けて import',
      "import { readFileSync } from 'node:fs';\nimport { writeFileSync } from 'node:fs';\nexport default () => [readFileSync, writeFileSync];",
      'fs.write',
    ],
    [
      'コメントの中の import に釣られない',
      "// import { readFileSync } from 'node:fs';\nimport { writeFileSync } from 'node:fs';\nexport default () => writeFileSync('a', 'b');",
      'fs.write',
    ],
    [
      'import と require の併用',
      "import { readFileSync } from 'node:fs';\nexport default () => [readFileSync, require('node:fs').writeFileSync];",
      'fs.write',
    ],
    [
      're-export',
      "export { writeFileSync } from 'node:fs';\nexport default () => null;",
      'fs.write',
    ],
    [
      'node:http2',
      "import { connect } from 'node:http2';\nexport default () => connect('https://x');",
      'network',
    ],
    [
      'node:dns',
      "import { lookup } from 'node:dns/promises';\nexport default () => lookup('x');",
      'network',
    ],
    [
      'process から分割代入',
      'const { exit } = process;\nexport default () => exit(1);',
      'process.mutate',
    ],
    [
      'node:process から import',
      "import { exit } from 'node:process';\nexport default () => exit(1);",
      'process.mutate',
    ],
    [
      'delete process.env.X',
      'export default () => { delete process.env.X; };',
      'process.mutate',
    ],
    [
      'process.env.X ||= ...',
      "export default () => { process.env.X ||= '1'; };",
      'process.mutate',
    ],
    [
      'Bun.env への代入',
      "export default () => { Bun.env.X = '1'; };",
      'process.mutate',
    ],
  ];
  for (const [label, code, category] of detected) {
    test(label, async () => {
      const report = await verdicts(code);
      expect(report.effects[category]).toBe('detected');
    });
  }

  const escaping: [string, string, string][] = [
    [
      '式を引数にした import()',
      "const name = ['./', 'pure.ts'].join('');\nexport default async () => import(name);",
      'dynamic import',
    ],
    [
      'テンプレートで組んだ import()',
      'export default async (n: string) => import(`./${n}.ts`);',
      'dynamic import',
    ],
    [
      'Bun[名前]',
      "export default (k: 'write') => Bun[k]('a', 'b');",
      'Bun[...] (a computed name)',
    ],
    [
      'Bun を別名にする',
      "const B = Bun;\nexport default () => B.write('a', 'b');",
      'Bun kept as a value',
    ],
    [
      '分類していない Bun の API',
      'export default () => Bun.someFutureApi;',
      'Bun.someFutureApi (not classified)',
    ],
    [
      "import * as B from 'bun'",
      "import * as B from 'bun';\nexport default () => B.write('a', 'b');",
      'bun imported as B',
    ],
    [
      'process を別名にする',
      'const p = process;\nexport default () => p.exit(1);',
      'process kept as a value',
    ],
    [
      'globalThis から別名で取り出す',
      'const { process: p } = globalThis;\nexport default () => p.exit(1);',
      'process kept as a value',
    ],
    [
      'process[名前]',
      "export default (k: 'exit') => process[k](1);",
      'process[...] (a computed name)',
    ],
    [
      'process.getBuiltinModule',
      "export default () => process.getBuiltinModule('node:fs');",
      'process.getBuiltinModule',
    ],
    [
      'globalThis[名前]',
      "export default (k: 'fetch') => globalThis[k]('http://x');",
      'globalThis[...] (a computed name)',
    ],
    [
      'new を付けない Function()',
      "export default () => Function('return 1')();",
      'Function()',
    ],
    ['間接 eval', "export default () => (0, eval)('1');", 'eval'],
    [
      'require を別名にする',
      'const load = require;\nexport default (n: string) => load(n);',
      'require kept as a value',
    ],
    [
      'import.meta.require',
      "export default () => import.meta.require('./pure.ts');",
      'require through a property',
    ],
    [
      'node:module (createRequire)',
      "import { createRequire } from 'node:module';\nexport default (n: string) => createRequire(import.meta.url)(n);",
      'unclassified Node module node:module',
    ],
    [
      'node:vm',
      "import { runInThisContext } from 'node:vm';\nexport default (c: string) => runInThisContext(c);",
      'unclassified Node module node:vm',
    ],
    ['Worker', "export default () => new Worker('./pure.ts');", 'Worker'],
  ];
  for (const [label, code, via] of escaping) {
    test(`${label} は保証しない`, async () => {
      const report = await verdicts(code);
      expect(Object.values(report.effects)).not.toContain('none');
      expect(report.escapes.map((e) => e.via)).toContain(via);
    });
  }

  test('読めないファイルを「何も無い」とは言わない', async () => {
    const report = await analyzeEffects([join(dir, 'does-not-exist.ts')]);
    expect(report.escapes.map((e) => e.via)).toEqual(['unreadable file']);
    expect(Object.values(report.effects)).not.toContain('none');
  });

  test('JS でもデータでもないファイルの import は保証しない', async () => {
    await writeFile(join(dir, 'native.node'), '');
    const report = await verdicts(
      "import addon from './native.node';\nexport default () => addon;"
    );
    expect(Object.values(report.effects)).not.toContain('none');
  });
});

/** 厳しくした分、素直なコードを unknown に落としていないこと */
describe('見逃さないための規則が、無害なコードを巻き込まない', () => {
  const harmless: [string, string][] = [
    [
      'テンプレートと node:path',
      "import { join } from 'node:path';\nexport default (n: number) => join('a', `b${n}`);",
    ],
    [
      'process の読み取り',
      'export default () => [process.argv, process.env.HOME, process.platform, process.cwd(), process.stdout.isTTY];',
    ],
    [
      'process の存在確認',
      "export default () => typeof process !== 'undefined' && process.env.CI === '1';",
    ],
    [
      '実行環境が生やす名前を読むだけ',
      'export default () => Boolean((process as { defaultApp?: boolean }).defaultApp);',
    ],
    [
      'Bun の読み取り',
      "export default () => [Bun.version, Bun.env.HOME, Bun.argv, Bun.stringWidth('x')];",
    ],
    [
      '同名の別物 (job.process / process(item))',
      'const job = { process: (n: number) => n };\nexport default () => job.process(1);',
    ],
    [
      '割り算と正規表現が混ざる',
      "export default (a: number) => (a + 1) / 2 > 1 ? /it's/.test('x') : a / 3;",
    ],
    [
      'データの import',
      "import data from './data.json';\nexport default () => data;",
    ],
    [
      '文字列で書いた import() と require()',
      "export default async () => [await import('./pure.ts'), require('./pure.ts')];",
    ],
    [
      'Map の delete',
      'export default () => { const m = new Map<string, number>(); m.delete("a"); return m; };',
    ],
  ];
  for (const [label, code] of harmless) {
    test(label, async () => {
      await writeFile(join(dir, 'data.json'), '{}');
      const report = await verdicts(code);
      expect(report.escapes).toEqual([]);
      expect(notable(report.effects)).toEqual([]);
    });
  }

  test('Bun.file() を読むだけなら fs.read だけ', async () => {
    for (const code of [
      "export default () => Bun.file('a').text();",
      "export default async () => (await Bun.file('a').exists()) ? Bun.file('a').json() : null;",
      // 変数に入れても、書き換えるメソッドがどこにも無ければ読み取り
      "export default async () => { const file = Bun.file('a'); return (await file.exists()) ? file.text() : ''; };",
    ]) {
      const report = await verdicts(code);
      expect(notable(report.effects)).toEqual(['fs.read=detected']);
      expect(report.escapes).toEqual([]);
    }
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
  test('同じモジュールの import が複数あれば、名前を合わせる', () => {
    expect(
      importedNames(
        "import { readFile } from 'node:fs';\nimport { writeFile } from 'node:fs';",
        'node:fs'
      )
    ).toEqual(['readFile', 'writeFile']);
  });

  test('型だけの import は数えない', () => {
    expect(
      importedNames(
        "import type { Stats } from 'node:fs';\nimport { type Dirent, readFile } from 'node:fs';",
        'node:fs'
      )
    ).toEqual(['readFile']);
  });

  test('re-export があれば絞れない', () => {
    expect(
      importedNames(
        "import { readFile } from 'node:fs';\nexport * from 'node:fs';",
        'node:fs'
      )
    ).toBeUndefined();
  });

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
