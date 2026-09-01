/**
 * decisions.md に書いた決定が、コードで破られていないことを検査する。
 *
 * ADR は「決めた時点の事実」なので腐らないが、**決定が守られているか**は
 * 放っておくと崩れる。機械で守れるものはここで守り、守れないものは
 * 理由付きで明示する。
 *
 * ここが落ちたら、直すのはコードとは限らない。**決定そのものが変わったのなら
 * decisions.md を書き換える**のが正しい対応。
 */
import { describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DECISIONS = 'docs/decisions.md';

/** ADR をどう守っているか */
type Guard =
  | { kind: 'lint'; label: string; check: () => Promise<string[]> }
  | { kind: 'test'; label: string; file: string }
  | { kind: 'manual'; reason: string };

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      files.push(...(await sourceFiles(path)));
      continue;
    }
    if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

const srcFiles = await sourceFiles('src');
const srcSources = new Map<string, string>();
for (const file of srcFiles) srcSources.set(file, await Bun.file(file).text());

/**
 * コメントを落として、文字列リテラルの中身だけを取り出す。
 *
 * 素朴に正規表現をかけると JSDoc の日本語まで拾ってしまうので、
 * 文字列とコメントの状態を見ながら 1 文字ずつ進む
 */
function stringLiterals(source: string): string[] {
  const literals: string[] = [];
  let index = 0;
  let quote: string | undefined;
  let current = '';

  while (index < source.length) {
    const char = source[index] as string;
    const next = source[index + 1];

    if (quote !== undefined) {
      if (char === '\\') {
        current += source.slice(index, index + 2);
        index += 2;
        continue;
      }
      if (char === quote) {
        literals.push(current);
        current = '';
        quote = undefined;
        index += 1;
        continue;
      }
      current += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      index += 1;
      continue;
    }
    index += 1;
  }
  return literals;
}

const JAPANESE = /[ぁ-んァ-ヶ一-龥]/;

/** import 元がその指定子に一致するファイル */
function importersOf(specifier: RegExp): string[] {
  const found: string[] = [];
  for (const [file, source] of srcSources) {
    if (new RegExp(`from '${specifier.source}'`).test(source)) found.push(file);
  }
  return found;
}

const GUARDS: Record<number, Guard> = {
  1: {
    kind: 'lint',
    label: '自作レンダラーを使う (React / Ink に依存しない)',
    check: async () => {
      const importers = importersOf(/(react|react-dom|ink)(\/.*)?/);
      const manifest = (await Bun.file('package.json').json()) as {
        dependencies?: Record<string, string>;
      };
      const deps = Object.keys(manifest.dependencies ?? {}).filter((name) =>
        ['react', 'react-dom', 'ink'].includes(name)
      );
      return [...importers, ...deps.map((name) => `package.json: ${name}`)];
    },
  },
  2: {
    kind: 'test',
    label: '宣言のないコマンドは stdin に触らない',
    file: 'test/runtime/run-stdin.test.tsx',
  },
  3: {
    kind: 'lint',
    label: 'app/ のファイル名が規約に含まれる (綴り違いは黙って無視されるため)',
    check: async () => {
      const { CONVENTION_FILES, ROOT_ONLY_FILES } =
        await import('../../src/build/scanner.ts');
      const allowed = new Set<string>([
        ...CONVENTION_FILES,
        ...ROOT_ONLY_FILES,
      ]);
      const offenders: string[] = [];
      for (const file of await sourceFiles('app')) {
        // `_` で始まるディレクトリは共有コードの置き場なので自由
        if (file.split('/').some((part) => part.startsWith('_'))) continue;
        const base = (file.split('/').pop() as string).replace(/\.tsx?$/, '');
        if (!allowed.has(base)) offenders.push(file);
      }
      return offenders;
    },
  },
  4: {
    kind: 'lint',
    label: 'v1 は静的出力のみ (対話的な入力を読まない)',
    check: async () =>
      importersOf(/node:readline(\/.*)?/).concat(
        [...srcSources]
          .filter(([, source]) => source.includes('setRawMode'))
          .map(([file]) => file)
      ),
  },
  5: {
    kind: 'test',
    label: 'ビルド時にルートを生成する',
    file: 'test/contract/build.test.ts',
  },
  6: {
    kind: 'lint',
    label: 'バリデーションは valibot',
    check: async () => {
      const manifest = (await Bun.file('package.json').json()) as {
        dependencies?: Record<string, string>;
      };
      return manifest.dependencies?.valibot === undefined
        ? ['package.json に valibot がない']
        : [];
    },
  },
  7: {
    kind: 'test',
    label: 'layout.tsx は上位ディレクトリから包む',
    file: 'test/runtime/layout.test.tsx',
  },
  8: {
    kind: 'test',
    label: '--help は宣言から生成する',
    file: 'test/runtime/help.test.tsx',
  },
  9: {
    kind: 'test',
    label: '型はビルド時の codegen で配る',
    file: 'test/build/typegen.test.ts',
  },
  10: {
    kind: 'lint',
    label: 'valibot への依存を src/validation/ に閉じ込める',
    check: async () =>
      importersOf(/valibot/).filter(
        (file) => !file.startsWith('src/validation/')
      ),
  },
  11: {
    kind: 'test',
    label: 'argv の検証は middleware より前',
    file: 'test/runtime/middleware.test.tsx',
  },
  12: {
    kind: 'lint',
    label: '単一ファイルで配る (--splitting は使わない)',
    check: async () => {
      const bundler = srcSources.get('src/build/bundler.ts') ?? '';
      return bundler.includes('splitting') ? ['src/build/bundler.ts'] : [];
    },
  },
  13: {
    kind: 'lint',
    label: 'middleware は children ではなく next を受け取る',
    check: async () => {
      const middleware = srcSources.get('src/runtime/middleware.ts') ?? '';
      const props = /export interface MiddlewareProps[^}]*}/.exec(middleware);
      if (props === null) return ['MiddlewareProps が見つからない'];
      return props[0].includes('children')
        ? ['MiddlewareProps に children がある']
        : [];
    },
  },
  14: {
    kind: 'lint',
    label: '外に出るもの (CLI の出力・生成物・README) は英語',
    check: async () => {
      const offenders: string[] = [];
      for (const [file, source] of srcSources) {
        for (const literal of stringLiterals(source)) {
          if (JAPANESE.test(literal)) {
            offenders.push(`${file}: ${literal.slice(0, 30)}`);
          }
        }
      }

      // README は地の文だけを見る。コードブロックの中は、表示幅の例のように
      // 日本語そのものが題材になることがある
      const readme = await Bun.file('README.md').text();
      const prose = readme.replace(/```[\s\S]*?```/g, '');
      for (const line of prose.split('\n')) {
        if (JAPANESE.test(line))
          offenders.push(`README.md: ${line.slice(0, 30)}`);
      }
      return offenders;
    },
  },
  15: {
    kind: 'lint',
    label: '仕様書を持たない (docs/ は decisions.md だけ)',
    check: async () => {
      const entries = await readdir('docs');
      return entries.filter((name) => name !== 'decisions.md');
    },
  },
  16: {
    kind: 'lint',
    label: '決定を守る仕組みがテストとして存在する (フックには置かない)',
    check: async () => {
      const problems: string[] = [];
      if (!(await Bun.file('test/docs/references.test.ts').exists())) {
        problems.push('test/docs/references.test.ts がない');
      }
      // フックはセッション中しか効かないので、そこに移していないことも見る
      if (await Bun.file('.claude/settings.json').exists()) {
        const settings = await Bun.file('.claude/settings.json').text();
        if (settings.includes('decisions')) {
          problems.push('.claude/settings.json が決定の検査を持っている');
        }
      }
      return problems;
    },
  },
  17: {
    kind: 'test',
    label: '公開するパッケージが壊れていない',
    file: 'test/docs/package.test.ts',
  },
  18: {
    kind: 'test',
    label: 'バージョンは時刻そのもので、人が決めない',
    file: 'test/docs/version.test.ts',
  },
  19: {
    kind: 'test',
    label: '瞬間と暦日で受け付ける入力が違う',
    file: 'test/contract/coercion.test.ts',
  },
  20: {
    kind: 'test',
    label: '非推奨は 1 年後に消す。期限切れは CI が落ちる',
    file: 'test/docs/deprecations.test.ts',
  },
  21: {
    kind: 'test',
    label: '補完の候補は CLI 自身 (__complete) が返す',
    file: 'test/runtime/complete.test.tsx',
  },
  22: {
    kind: 'test',
    label: '動的な出力は AsyncIterable 駆動の島に限る',
    file: 'test/renderer/present.test.tsx',
  },
  31: {
    kind: 'test',
    label: '環境が整っていないときの形 (認証・ツール不足)',
    file: 'test/runtime/signals.test.tsx',
  },
  30: {
    kind: 'test',
    label: 'notFound() と、よくある形の詰め合わせ',
    file: 'test/runtime/signals.test.tsx',
  },
  29: {
    kind: 'test',
    label: '--json のときは失敗も構造化して返す',
    file: 'test/runtime/run-json-error.test.tsx',
  },
  28: {
    kind: 'test',
    label: 'output.tsx があれば出力の正になる',
    file: 'test/runtime/run-output.test.tsx',
  },
  27: {
    kind: 'test',
    label: '--json に出せるかを実行前に見る',
    file: 'test/runtime/serializable.test.ts',
  },
  26: {
    kind: 'test',
    label: 'パイプを壊さないことを全コマンドで掃いて確かめる',
    file: 'test/contract/pipe-safety.test.tsx',
  },
  25: {
    kind: 'test',
    label: 'データは data.tsx で、表示と分ける',
    file: 'test/runtime/run-data.test.tsx',
  },
  24: {
    kind: 'test',
    label: '起動時間は PR ごとに測り、base と比べる',
    file: 'test/docs/bench-report.test.ts',
  },
  23: {
    kind: 'lint',
    label: '描画は時刻を読まない (アニメーションは tick で進む)',
    check: async () =>
      [...srcSources]
        .filter(
          ([file, source]) =>
            (file.startsWith('src/renderer/') ||
              file.startsWith('src/components/')) &&
            /\b(?:Date\.now|performance\.now|new Date)\b/.test(source)
        )
        .map(([file]) => file),
  },
};

const decisions = await Bun.file(DECISIONS).text();
const adrNumbers = [...decisions.matchAll(/^## ADR (\d+):/gm)].map((match) =>
  Number(match[1])
);

describe('ADR に守る仕組みがある', () => {
  test('すべての ADR が lint / test / manual に分類されている', () => {
    // ADR を足したらここが落ちる。守り方を決めるまで通らない
    const unclassified = adrNumbers.filter(
      (number) => GUARDS[number] === undefined
    );
    expect(unclassified).toEqual([]);
  });

  test('分類したのに消えた ADR が残っていない', () => {
    const orphans = Object.keys(GUARDS)
      .map(Number)
      .filter((number) => !adrNumbers.includes(number));
    expect(orphans).toEqual([]);
  });

  test('test で守るとした ADR は、そのテストが実在する', async () => {
    const missing: string[] = [];
    for (const [number, guard] of Object.entries(GUARDS)) {
      if (guard.kind !== 'test') continue;
      if (!(await Bun.file(guard.file).exists())) {
        missing.push(`ADR ${number}: ${guard.file}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('決定が守られている', () => {
  for (const [number, guard] of Object.entries(GUARDS)) {
    if (guard.kind !== 'lint') continue;
    test(`ADR ${number}: ${guard.label}`, async () => {
      const violations = await guard.check();
      // 落ちたらコードを直すか、決定が変わったなら decisions.md を書き換える
      expect(violations).toEqual([]);
    });
  }
});
