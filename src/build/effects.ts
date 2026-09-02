/**
 * コマンドごとに、副作用の「届く先」をビルド時に見る (ADR 32)。
 *
 * decopin はコマンド 1 つのエントリが規約で決まっていて、ビルド時に
 * 閉じた世界を作る。だから**そのコマンドから到達しうる sink** を数えられる。
 * 自己申告ではなく機械が数えるので、宣言と実装がずれない。
 *
 * 判定は三値。`none` は「無いことの証明」で、これが出せるのが目的。
 * 解析が追えない書き方 (eval / 動的 import) に当たったら `unknown` に落とし、
 * **`none` を名乗らない**。健全性を精度より優先する。
 */
import { dirname, resolve } from 'node:path';

import { EFFECT_CATEGORIES } from '../types/effects.ts';
import type {
  EffectCategory,
  EffectVerdicts,
  Verdict,
} from '../types/effects.ts';

export { EFFECT_CATEGORIES };
export type { EffectCategory, EffectVerdicts, Verdict };

/** 見つけた 1 件 */
export interface EffectSite {
  category: EffectCategory;
  /** 何を見つけたか (`node:fs/promises`, `fetch`) */
  via: string;
  /** どのファイルで */
  file: string;
  /**
   * 入口からそのファイルまでの import の並び (入口が先頭、`file` が末尾)。
   * 「なぜこのコマンドが network に届くのか」を答えるためのもの
   */
  path: string[];
}

/** 解析を諦めた 1 件 */
export interface Escape {
  /** 何に当たったか (`eval`, `dynamic import`) */
  via: string;
  file: string;
  /** 入口からそのファイルまでの import の並び */
  path: string[];
}

export interface EffectReport {
  effects: EffectVerdicts;
  sites: EffectSite[];
  escapes: Escape[];
  /** 歩いたファイル数 (診断用) */
  visited: number;
}

/** import した名前 → その名前が意味する副作用 */
const NODE_MODULE_SINKS: Record<
  string,
  Partial<Record<string, EffectCategory>>
> = {
  'node:fs': {},
  'node:fs/promises': {},
  'node:child_process': {},
  'node:http': {},
  'node:https': {},
  'node:net': {},
  'node:tls': {},
  'node:dgram': {},
};

/** モジュール全体が持つ副作用 (名前を絞れないときはこちら) */
const MODULE_EFFECTS: Record<string, readonly EffectCategory[]> = {
  'node:fs': ['fs.read', 'fs.write'],
  'node:fs/promises': ['fs.read', 'fs.write'],
  'node:child_process': ['process.spawn'],
  'node:http': ['network'],
  'node:https': ['network'],
  'node:net': ['network'],
  'node:tls': ['network'],
  'node:dgram': ['network'],
};

/** `node:fs` の名前ごとの分類。名前で絞れると `none` を出せる場面が増える */
const FS_NAMES: Record<string, EffectCategory> = {};
for (const name of [
  'readFile',
  'readFileSync',
  'readdir',
  'readdirSync',
  'stat',
  'statSync',
  'lstat',
  'access',
  'accessSync',
  'exists',
  'existsSync',
  'createReadStream',
  'realpath',
  'opendir',
]) {
  FS_NAMES[name] = 'fs.read';
}
for (const name of [
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'mkdir',
  'mkdirSync',
  'rm',
  'rmSync',
  'rmdir',
  'unlink',
  'unlinkSync',
  'rename',
  'renameSync',
  'copyFile',
  'chmod',
  'chown',
  'symlink',
  'link',
  'truncate',
  'createWriteStream',
  'mkdtemp',
  'utimes',
]) {
  FS_NAMES[name] = 'fs.write';
}
NODE_MODULE_SINKS['node:fs'] = FS_NAMES;
NODE_MODULE_SINKS['node:fs/promises'] = FS_NAMES;

/** import なしで届くもの (Bun ではグローバルが多い) */
const GLOBAL_SINKS: readonly [RegExp, EffectCategory, string][] = [
  [/\bfetch\s*\(/, 'network', 'fetch'],
  [/\bnew\s+WebSocket\s*\(/, 'network', 'WebSocket'],
  [/\bBun\s*\.\s*connect\s*\(/, 'network', 'Bun.connect'],
  [/\bBun\s*\.\s*listen\s*\(/, 'network', 'Bun.listen'],
  [/\bBun\s*\.\s*serve\s*\(/, 'network', 'Bun.serve'],
  [/\bBun\s*\.\s*write\s*\(/, 'fs.write', 'Bun.write'],
  [/\bBun\s*\.\s*file\s*\(/, 'fs.read', 'Bun.file'],
  // PATH を探すのでファイルを読む
  [/\bBun\s*\.\s*which\s*\(/, 'fs.read', 'Bun.which'],
  [/\bBun\s*\.\s*spawn(Sync)?\s*\(/, 'process.spawn', 'Bun.spawn'],
  // バックティックは stripLiterals で消えるので、参照だけを見る (実測)
  [/\bBun\s*\.\s*\$/, 'process.spawn', 'Bun.$'],
  [/\bprocess\s*\.\s*exit\s*\(/, 'process.mutate', 'process.exit'],
  [/\bprocess\s*\.\s*chdir\s*\(/, 'process.mutate', 'process.chdir'],
  [/\bprocess\s*\.\s*kill\s*\(/, 'process.mutate', 'process.kill'],
  [
    /\bprocess\s*\.\s*env\s*(\.\s*\w+|\[[^\]]*\])\s*=[^=]/,
    'process.mutate',
    'process.env assignment',
  ],
];

/**
 * 中身を歩かずに「こう」と決めてよいもの (ADR 32 の fact)。
 *
 * 枠組み自身が最初の登録。`decopin-cli` の中の `process.exit` は
 * **終了コードを返す仕組み**であってコマンドの副作用ではない。歩くと
 * 全コマンドが `process.mutate: detected` になり、判定が意味を失う。
 */
const FACTS: Record<string, readonly EffectCategory[]> = {
  'decopin-cli': [],
  'decopin-cli/jsx': [],
  'decopin-cli/jsx-runtime': [],
  'decopin-cli/jsx-dev-runtime': [],
};

/**
 * JSX の変換が**勝手に足す** import。書いた人の依存ではないので数えない。
 * (Bun.Transpiler は tsconfig を読まないので `react` を仮定して足す)
 */
function isInjectedJsxRuntime(specifier: string): boolean {
  return (
    specifier === 'react' ||
    /\/jsx-(dev-)?runtime$/.test(specifier) ||
    specifier === 'jsx-runtime' ||
    specifier === 'jsx-dev-runtime'
  );
}

/** ここに当たったら、その先は保証しない */
const ESCAPES: readonly [RegExp, string][] = [
  [/\beval\s*\(/, 'eval'],
  [/\bnew\s+Function\s*\(/, 'new Function'],
  // 文字クラスにクォートを直書きすると、ADR 14 の検査器 (正規表現リテラルを
  // 解さない) の状態機械が壊れるのでエスケープで書く
  [/\brequire\s*\(\s*[^\u0027\u0022\u0060)]/, 'require with a computed path'],
  [/\bprocess\s*\.\s*binding\s*\(/, 'process.binding'],
  [/\bWebAssembly\s*\./, 'WebAssembly'],
];

/** 文字列とコメントを落とす。識別子の検出が文面に引っかからないように */
export function stripLiterals(source: string): string {
  let out = '';
  let index = 0;
  let quote: string | undefined;

  while (index < source.length) {
    const char = source[index] as string;
    const next = source[index + 1];

    if (quote !== undefined) {
      if (char === '\\') {
        index += 2;
        continue;
      }
      if (char === quote) quote = undefined;
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
      // バッククォートは中の ${} も落ちるが、識別子検出には影響しない
      index += 1;
      out += ' ';
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

/**
 * `from '<specifier>'` の直前の import 句を取り出す。
 *
 * @returns 名前の一覧。名前空間 / 既定 import のときは undefined
 *   (どの名前が使われるか絞れないので、モジュール全体の副作用を採る)
 */
export function importedNames(
  source: string,
  specifier: string
): string[] | undefined {
  const quoted = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `import\\s+([^;]*?)\\s+from\\s*['"\`]${quoted}['"\`]`,
    'm'
  );
  const clause = pattern.exec(source)?.[1];
  if (clause === undefined) return undefined;
  // `* as fs` や既定 import は名前を絞れない
  if (!clause.includes('{')) return undefined;
  if (/^\s*\w+\s*,/.test(clause)) return undefined;
  const inner = clause.slice(clause.indexOf('{') + 1, clause.lastIndexOf('}'));
  return inner
    .split(',')
    .map((part) => (part.split(/\s+as\s+/)[0] ?? '').trim())
    .filter((name) => name !== '');
}

const JS_LIKE = /\.(m|c)?(t|j)sx?$/;

/**
 * そのコマンドが `unknown` を受け入れると宣言しているか (ADR 34)。
 *
 * `export const unsafeEval = true` を command.tsx に書く。Next.js の
 * route segment config と同じ形で、`skipLayout` と並ぶ。モジュールを評価
 * せず文面で見るのは、ビルド時にコマンドの本体を実行しないため
 */
export async function acceptsUnknown(commandFile: string): Promise<boolean> {
  try {
    const source = stripLiterals(await Bun.file(commandFile).text());
    return /\bexport\s+const\s+unsafeEval\s*=\s*true\b/.test(source);
  } catch {
    return false;
  }
}

/** 1 ファイルだけを見た結果。経路は入口ごとに違うので、集計のときに付ける */
interface FileAnalysis {
  sites: Omit<EffectSite, 'path'>[];
  escapes: Omit<Escape, 'path'>[];
  deps: string[];
}

interface WalkState {
  sites: EffectSite[];
  escapes: Escape[];
  visited: Set<string>;
  /** 解析済みファイルの使い回し (node_modules を何度も歩かない) */
  cache: Map<string, FileAnalysis>;
}

/** 1 ファイルを見て、直接の sink と依存先を返す */
async function analyzeFile(
  file: string,
  cache: WalkState['cache']
): Promise<FileAnalysis> {
  const cached = cache.get(file);
  if (cached !== undefined) return cached;

  const empty = { sites: [], escapes: [], deps: [] };
  let source: string;
  try {
    source = await Bun.file(file).text();
  } catch {
    cache.set(file, empty);
    return empty;
  }

  const sites: FileAnalysis['sites'] = [];
  const escapes: FileAnalysis['escapes'] = [];
  const deps: string[] = [];
  const code = stripLiterals(source);

  for (const [pattern, category, via] of GLOBAL_SINKS) {
    if (pattern.test(code)) sites.push({ category, via, file });
  }
  for (const [pattern, via] of ESCAPES) {
    if (pattern.test(code)) escapes.push({ via, file });
  }

  const transpiler = new Bun.Transpiler({
    loader: file.endsWith('x') ? 'tsx' : 'ts',
  });
  let imports: { kind: string; path: string }[] = [];
  try {
    imports = transpiler.scanImports(source) as typeof imports;
  } catch {
    // 読めない構文は保証しない
    escapes.push({ via: 'unparsable source', file });
  }

  for (const entry of imports) {
    const specifier = entry.path;
    // 実行時に決まる import 先は追えない
    if (entry.kind === 'dynamic-import' && specifier === '') {
      escapes.push({ via: 'dynamic import', file });
      continue;
    }

    if (isInjectedJsxRuntime(specifier)) continue;

    const fact = FACTS[specifier];
    if (fact !== undefined) {
      for (const category of fact) {
        sites.push({ category, via: specifier, file });
      }
      continue;
    }

    const known = MODULE_EFFECTS[specifier];
    if (known !== undefined) {
      const names = importedNames(source, specifier);
      const table = NODE_MODULE_SINKS[specifier] ?? {};
      if (names === undefined || Object.keys(table).length === 0) {
        for (const category of known) {
          sites.push({ category, via: specifier, file });
        }
      } else {
        for (const name of names) {
          const category = table[name];
          // 表に無い名前は絞れないので、モジュール全体を採る
          if (category === undefined) {
            for (const fallback of known) {
              sites.push({
                category: fallback,
                via: `${specifier} (${name})`,
                file,
              });
            }
          } else {
            sites.push({ category, via: `${specifier} (${name})`, file });
          }
        }
      }
      continue;
    }
    if (specifier.startsWith('node:') || specifier === 'bun') continue;

    try {
      // resolveSync は絶対パスのディレクトリを要求する。相対のまま渡すと
      // 素の相対 import まで「解決できない」に落ちる (実測)
      const resolved = Bun.resolveSync(specifier, resolve(dirname(file)));
      if (JS_LIKE.test(resolved)) deps.push(resolved);
    } catch {
      // 解決できない import はその先が見えない
      escapes.push({ via: `unresolved import ${specifier}`, file });
    }
  }

  const result = { sites, escapes, deps };
  cache.set(file, result);
  return result;
}

/**
 * 入口から到達できる副作用を数える。
 *
 * @param entries そのコマンドが読み込むファイル (command / data / argv ...)
 */
export async function analyzeEffects(
  entries: readonly string[],
  cache: WalkState['cache'] = new Map()
): Promise<EffectReport> {
  const state: WalkState = {
    sites: [],
    escapes: [],
    visited: new Set(),
    cache,
  };

  // 誰が最初にそのファイルを import したか。幅優先なので、入口からの
  // 最短の経路になる (同じファイルに 2 本の道があれば短い方を言う)
  const parents = new Map<string, string | undefined>(
    entries.map((entry) => [entry, undefined])
  );
  const pathTo = (file: string): string[] => {
    const path: string[] = [];
    for (
      let at: string | undefined = file;
      at !== undefined;
      at = parents.get(at)
    ) {
      path.unshift(at);
    }
    return path;
  };

  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (state.visited.has(file)) continue;
    state.visited.add(file);
    const analyzed = await analyzeFile(file, state.cache);
    const path = pathTo(file);
    state.sites.push(...analyzed.sites.map((site) => ({ ...site, path })));
    state.escapes.push(
      ...analyzed.escapes.map((escape) => ({ ...escape, path }))
    );
    for (const dep of analyzed.deps) {
      if (!parents.has(dep)) parents.set(dep, file);
      queue.push(dep);
    }
  }

  const found = new Set(state.sites.map((site) => site.category));
  // escape に当たったら、見つからなかったものは「無い」と言えない
  const gaveUp = state.escapes.length > 0;
  const effects = Object.fromEntries(
    EFFECT_CATEGORIES.map((category) => [
      category,
      found.has(category) ? 'detected' : gaveUp ? 'unknown' : 'none',
    ])
  ) as EffectVerdicts;

  return {
    effects,
    sites: state.sites,
    escapes: state.escapes,
    visited: state.visited.size,
  };
}
