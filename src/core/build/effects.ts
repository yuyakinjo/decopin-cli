/**
 * コマンドごとに、副作用の「届く先」をビルド時に見る (ADR 32)。
 *
 * decopin はコマンド 1 つのエントリが規約で決まっていて、ビルド時に
 * 閉じた世界を作る。だから**そのコマンドから到達しうる sink** を数えられる。
 * 自己申告ではなく機械が数えるので、宣言と実装がずれない。
 *
 * 判定は三値。`none` は「見える範囲には無い」で、これが出せるのが目的。
 * 解析が追えない書き方 (eval / 動的 import / 分類していない API) に当たったら
 * `unknown` に落とし、**`none` を名乗らない**。健全性を精度より優先する。
 *
 * 数え方は「源で数える」。`Bun.write` は呼んでいなくても、**名前が出た
 * 時点で**届くものとする (`const w = Bun.write` と別名にされても、源は
 * 見えている)。`Bun` / `process` そのものを値として持ち出したら追えない
 * ので `unknown`。
 *
 * 追わないもの (ここを越えた書き方は `none` のまま通る):
 * - 値の流れ。`const env = process.env; env.X = "1"` の代入や、
 *   `obj[name]()` のような計算された名前での呼び出し
 * - 同じ名前の付け替え。`const Bun = ...` と自分で宣言した場合など
 * 構文木もデータフローも持たないので、これは**悪意のある書き手を止める
 * 仕組みではない**。素直に書かれたコードの申告漏れを機械で拾うためのもの
 */
import { dirname, resolve } from 'node:path';

import { EFFECT_CATEGORIES } from '../types/effects.ts';
import type {
  EffectCategory,
  EffectVerdicts,
  Verdict,
} from '../types/effects.ts';
import {
  BUN_MEMBERS,
  BUN_MODULES,
  DATA_FILE,
  FACTS,
  FILE_READERS,
  FILE_WRITERS,
  NODE_MODULES,
  PACKAGE_FACTS,
  PROCESS_MEMBERS,
} from './effect-facts.ts';
import type { ModuleFact, Reach } from './effect-facts.ts';
import { codeOnly } from './lexer.ts';

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

/** `@scope/name/sub` → `@scope/name`、`name/sub` → `name` */
export function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : (parts[0] as string);
}

/** `table.constructor` のような、Object.prototype の名前を拾わない */
function own<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

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

// 以下の正規表現は lexer.ts を通した後のコードに当てる。文字列は `""` に
// なっているので、`(?!""\s*[,)])` は「引数が文字列 1 つではない」を言う

/**
 * 名前が出たら届くもの (呼び出しの形を問わない)。
 * `const f = fetch` も `globalThis.fetch?.(url)` も、名前はここに出る
 */
const NAMED_SINKS: readonly [RegExp, EffectCategory, string][] = [
  [/(?<![\w$])fetch(?![\w$])/, 'network', 'fetch'],
  [/(?<![\w$])WebSocket(?![\w$])/, 'network', 'WebSocket'],
  [/(?<![\w$])EventSource(?![\w$])/, 'network', 'EventSource'],
  [/(?<![\w$])XMLHttpRequest(?![\w$])/, 'network', 'XMLHttpRequest'],
  [/(?<![\w$])sendBeacon(?![\w$])/, 'network', 'navigator.sendBeacon'],
];

const ENV = String.raw`(?:process|Bun)\s*(?:\?\.|\.)\s*env`;
const ASSIGN = String.raw`(?:=(?![=>])|(?:[-+*/%&|^]|\*\*|<<|>>>?|\|\||&&|\?\?)=|\+\+|--)`;
const ENV_WRITES: readonly RegExp[] = [
  new RegExp(
    String.raw`${ENV}\s*(?:(?:\?\.|\.)\s*[\w$]+|\[[^\]]*\])\s*${ASSIGN}`
  ),
  new RegExp(String.raw`${ENV}\s*${ASSIGN}`),
  new RegExp(String.raw`\bdelete\s+${ENV}(?![\w$])`),
  new RegExp(
    String.raw`\bObject\s*\.\s*(?:assign|definePropert(?:y|ies)|setPrototypeOf)\s*\(\s*${ENV}(?![\w$])`
  ),
];

/** ここに当たったら、その先は保証しない */
const ESCAPES: readonly [RegExp, string][] = [
  // `(0, eval)(code)` も `const e = eval` も、名前は出る
  [/(?<![\w$])eval(?![\w$])/, 'eval'],
  [/\bnew\s+Function(?![\w$])/, 'new Function'],
  [/(?<![\w$.])(?<!\bnew\s+)Function\s*\(/, 'Function()'],
  [/(?<![\w$.])require\s*\(\s*(?!""\s*[,)])/, 'require with a computed path'],
  // module.require / import.meta.require は scanImports が拾わない
  [/(?:\?\.|\.)\s*require\s*\(/, 'require through a property'],
  // Bun.Transpiler.scanImports は、式を引数にした import() を返さない
  [/(?<![\w$.])import\s*\(\s*(?!""\s*[,)])/, 'dynamic import'],
  [/\bWebAssembly\s*\./, 'WebAssembly'],
  // 別のファイルを別のスレッドで動かす。そのファイルは歩いていない
  [/\bnew\s+Worker(?![\w$])/, 'Worker'],
  [
    /(?<![\w$])(?:globalThis|global)\s*(?:\?\.)?\s*\[/,
    'globalThis[...] (a computed name)',
  ],
];

/**
 * 文字列とコメントを落とす。識別子の検出が文面に引っかからないように。
 * テンプレートの `${}` の中は**残す** (実行されるコードなので)
 */
export function stripLiterals(source: string): string {
  return codeOnly(source).code;
}

interface ImportClause {
  /** `{ a, b as c }` の元の名前 */
  names: string[];
  /** 既定 import と名前空間 import の、手元での名前 */
  locals: string[];
}

/**
 * その指定子の import 句を**全部**読む (同じモジュールを 2 文に分けて
 * import していても、名前を合わせる)。
 *
 * @returns 読めない句が 1 つでもあれば undefined (名前で絞らない)
 */
function importClause(
  source: string,
  specifier: string
): ImportClause | undefined {
  const quoted = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const from = String.raw`from\s*[\u0027\u0022\u0060]${quoted}[\u0027\u0022\u0060]`;
  // `export { x } from` / `export * from` は、何が使われるかを絞れない
  if (new RegExp(String.raw`\bexport\s[^;]*?${from}`).test(source)) {
    return undefined;
  }
  const clause: ImportClause = { names: [], locals: [] };
  let found = false;
  const pattern = new RegExp(String.raw`\bimport\s+([^;]*?)\s+${from}`, 'g');
  for (const match of source.matchAll(pattern)) {
    const text = match[1] as string;
    // `import type { X } from` は実行時に何も読まない
    if (/^type\s+[{*\w$]/.test(text) && !/^type\s+from$/.test(text)) continue;
    found = true;
    const open = text.indexOf('{');
    const head = (open === -1 ? text : text.slice(0, open))
      .replace(/,\s*$/, '')
      .trim();
    if (head !== '') {
      const local = /^(?:\*\s*as\s+)?([\w$]+)$/.exec(head)?.[1];
      if (local === undefined) return undefined;
      clause.locals.push(local);
    }
    if (open === -1) continue;
    const close = text.lastIndexOf('}');
    if (close < open || text.slice(close + 1).trim() !== '') return undefined;
    for (const part of text.slice(open + 1, close).split(',')) {
      const item = part.trim();
      if (item === '' || /^type\s/.test(item)) continue;
      const name = (item.split(/\s+as\s+/)[0] as string).trim();
      if (!/^[\w$]+$/.test(name)) return undefined;
      clause.names.push(name);
    }
  }
  return found ? clause : undefined;
}

/**
 * `from '<specifier>'` の import 句から名前を取り出す。
 *
 * @returns 名前の一覧。名前空間 / 既定 import のときは undefined
 *   (どの名前が使われるか絞れないので、モジュール全体の副作用を採る)
 */
export function importedNames(
  source: string,
  specifier: string
): string[] | undefined {
  const clause = importClause(source, specifier);
  if (clause === undefined || clause.locals.length > 0) return undefined;
  return clause.names;
}

const JS_LIKE = /\.(m|c)?(t|j)sx?$/;

type Loader = 'tsx' | 'ts' | 'jsx' | 'js';

function loaderFor(file: string): Loader {
  if (/\.[mc]?tsx$/.test(file)) return 'tsx';
  if (/\.[mc]?ts$/.test(file)) return 'ts';
  if (/\.[mc]js$/.test(file)) return 'js';
  // Bun は .js を JSX 入りとして読む
  return 'jsx';
}

const transpilers = new Map<Loader, Bun.Transpiler>();

function transpilerFor(file: string): Bun.Transpiler {
  const loader = loaderFor(file);
  let transpiler = transpilers.get(loader);
  if (transpiler === undefined) {
    transpiler = new Bun.Transpiler({ loader });
    transpilers.set(loader, transpiler);
  }
  return transpiler;
}

/**
 * ソースを「コードだけ」にする。
 *
 * 先に Bun.Transpiler で素の JS に直す。JSX の文面 (`<Line>Don't</Line>`)
 * と型注釈は構文を解さないと文字列と区別できず、字句だけで読むと
 * アポストロフィから先のコードを文字列として捨ててしまう
 */
function readCode(
  file: string,
  source: string
): { code: string; doubts: string[] } {
  const doubts: string[] = [];
  let js = source;
  try {
    js = transpilerFor(file).transformSync(source);
  } catch {
    // 読めない構文は保証しない
    doubts.push('unparsable source');
  }
  const lexed = codeOnly(js);
  for (const doubt of lexed.doubts) doubts.push(`unreadable source (${doubt})`);
  return { code: lexed.code, doubts };
}

/**
 * そのコマンドが `unknown` を受け入れると宣言しているか (ADR 34)。
 *
 * `export const unsafeEval = true` を cmd.tsx に書く。Next.js の
 * route segment config と同じ形で、`skipLayout` と並ぶ。モジュールを評価
 * せず文面で見るのは、ビルド時にコマンドの本体を実行しないため
 */
export async function acceptsUnknown(commandFile: string): Promise<boolean> {
  try {
    const { code } = readCode(commandFile, await Bun.file(commandFile).text());
    return /\bexport\s+const\s+unsafeEval\s*=\s*true\b/.test(code);
  } catch {
    return false;
  }
}

/** グローバルの名前が、コードの中でどう使われているか */
type RootUse =
  | {
      kind: 'names';
      names: string[];
      /** 呼んでいるか、関数として取り出しているか (`.x` を読むだけではない) */
      taken: boolean;
    }
  | { kind: 'computed' }
  | { kind: 'value' };

/** `x.process` の x がこれなら、グローバルの process と同じもの */
const GLOBAL_OBJECTS = new Set(['globalThis', 'global', 'self', 'window']);

function destructuredNames(inner: string): string[] | undefined {
  const names: string[] = [];
  for (const part of inner.split(',')) {
    const item = part.trim();
    if (item === '') continue;
    const name = (item.split(':')[0] as string).trim();
    // `...rest` は残り全部を持っていく
    if (!/^[\w$]+$/.test(name)) return undefined;
    names.push(name);
  }
  return names;
}

/**
 * `Bun` / `process` の使われ方を全部拾う。
 *
 * - `Bun.write` / `Bun?.write` → その名前
 * - `const { write } = Bun` → その名前
 * - `Bun[name]` → 計算された名前 (どれか分からない)
 * - `const B = Bun` / `f(Bun)` → 値として持ち出した (その先を追えない)
 */
function usesOf(code: string, root: string): RootUse[] {
  const uses: RootUse[] = [];
  // `#process` はクラスの private な名前で、グローバルとは別物
  const pattern = new RegExp(String.raw`(?<![\w$#])${root}(?![\w$])`, 'g');
  for (const match of code.matchAll(pattern)) {
    const at = match.index;
    const before = code.slice(Math.max(0, at - 400), at);
    const after = code.slice(at + root.length, at + root.length + 120);

    // 型と存在の検査は値を取り出さない
    if (/(?:^|[^\w$.])typeof\s+$/.test(before)) continue;
    if (/(?:===?|!==?|!|\bin\s)\s*$/.test(before)) continue;
    // import 句の中の名前は import の側で見る
    if (/(?:\bimport\s+|\bas\s+)$/.test(before)) continue;
    // 呼べないものなので、`process(item)` は同名の別物
    if (/^\s*\(/.test(after)) continue;
    // `job.process` は別物。`globalThis.process` は同じもの
    if (/(?<!\.\.)(?:\?\.|\.)\s*$/.test(before)) {
      const owner = /([\w$]+)\s*(?:\?\.|\.)\s*$/.exec(before)?.[1];
      if (owner === undefined || !GLOBAL_OBJECTS.has(owner)) continue;
    }

    const member = /^\s*(?:\?\.|\.)\s*([\w$]+)/.exec(after);
    if (member !== null) {
      const rest = after.slice(member[0].length);
      uses.push({
        kind: 'names',
        names: [member[1] as string],
        // `process.x(...)` / `process.x.call(...)` / `f = process.x`
        taken:
          !/^\s*(?:(?:\?\.|\.)\s*(?!call\b|apply\b|bind\b)[\w$]|[)\];,:?]|&&|\|\||[=!]==?|$)/.test(
            rest
          ),
      });
      continue;
    }
    if (/^\s*(?:\?\.)?\s*\[/.test(after)) {
      uses.push({ kind: 'computed' });
      continue;
    }
    // `{ process: fn }` はオブジェクトのキー。`const { process: p } =
    // globalThis` と同じ形だが、そちらは applyRoot が別に見ている
    if (/^\s*:/.test(after) && /[{,]\s*$/.test(before)) continue;
    // `Bun && Bun.x` / `process === undefined` / `process ? a : b`
    if (/^\s*(?:&&|===?|!==?|\?(?![.?]))/.test(after)) continue;

    const pattern = /\{([^{}=]*)\}\s*=\s*$/.exec(before)?.[1];
    const names =
      pattern === undefined ? undefined : destructuredNames(pattern);
    uses.push(
      names === undefined
        ? { kind: 'value' }
        : { kind: 'names', names, taken: true }
    );
  }
  return uses;
}

/** 開き括弧に対応する閉じ括弧の位置 */
function closingParen(code: string, open: number): number | undefined {
  let depth = 0;
  for (let index = open; index < code.length; index++) {
    const char = code[index];
    if (char === '(') depth += 1;
    else if (char === ')' && --depth === 0) return index;
  }
  return undefined;
}

/** 1 ファイルだけを見た結果。経路は入口ごとに違うので、集計のときに付ける */
interface FileAnalysis {
  sites: Omit<EffectSite, 'path'>[];
  escapes: Omit<Escape, 'path'>[];
  deps: string[];
  /**
   * `Bun.file()` の戻り値を、読むだけのメソッドに直結させずに持っているか。
   * 持っていれば、どこかの `.write()` / `.delete()` がそれに届きうる
   */
  holdsFile: boolean;
  /** このファイルにある、`Bun.file()` の値を書き換えうるメソッド名 */
  fileWriters: string[];
}

interface WalkState {
  sites: EffectSite[];
  escapes: Escape[];
  visited: Set<string>;
  /** 解析済みファイルの使い回し (node_modules を何度も歩かない) */
  cache: Map<string, FileAnalysis>;
}

/** 1 ファイル分の発見を、重複させずに貯める */
class Findings {
  readonly sites: FileAnalysis['sites'] = [];
  readonly escapes: FileAnalysis['escapes'] = [];
  holdsFile = false;
  private readonly seen = new Set<string>();

  constructor(private readonly file: string) {}

  site(category: EffectCategory, via: string): void {
    const key = `${category}\n${via}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.sites.push({ category, via, file: this.file });
  }

  escape(via: string): void {
    const key = `escape\n${via}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.escapes.push({ via, file: this.file });
  }

  /** 表を引いた結果をそのまま反映する */
  reach(reach: Reach | undefined, via: string): void {
    if (reach === undefined) this.escape(`${via} (not classified)`);
    else if (reach === 'escape') this.escape(via);
    else for (const category of reach) this.site(category, via);
  }
}

/**
 * `Bun` / `process` の使われ方を、表で引いて反映する。
 *
 * @param readable 表に無い名前を**読むだけ**なら見逃すか。`process` は
 *   実行環境が勝手に生やす名前 (`process.defaultApp` / `process.type`) を
 *   存在確認のために読むコードが多く、全部を「保証しない」にすると
 *   依存を 1 つ足しただけで `unknown` になる。呼んだら見逃さない
 */
function applyRoot(
  code: string,
  root: string,
  members: Record<string, Reach>,
  found: Findings,
  readable = false
): void {
  // `const { process: p } = globalThis` は別名を付けて持ち出している
  const renamed = new RegExp(
    String.raw`\{[^{}]*(?<![\w$])${root}\s*:[^{}]*\}\s*=\s*(?:globalThis|global|self|window)(?![\w$])`
  );
  if (renamed.test(code)) found.escape(`${root} kept as a value`);

  for (const use of usesOf(code, root)) {
    if (use.kind === 'computed') {
      found.escape(`${root}[...] (a computed name)`);
    } else if (use.kind === 'value') {
      found.escape(`${root} kept as a value`);
    } else {
      for (const name of use.names) {
        const reach = own(members, name);
        if (reach === undefined && readable && !use.taken) continue;
        found.reach(reach, `${root}.${name}`);
      }
    }
  }
}

/**
 * `Bun.file(x)` の使われ方を見る。
 *
 * `Bun.file(x).text()` のように読むだけのメソッドに直結していれば読み取り。
 * `.delete()` などに直結していれば書き込み。変数に入れたり返したりした
 * ものは、その先を追わない (`holdsFile` に倒して、集計の側で決める)
 */
function applyBunFile(code: string, found: Findings): void {
  const pattern = /(?<![\w$])Bun\s*(?:\?\.|\.)\s*file(?![\w$])/g;
  for (const match of code.matchAll(pattern)) {
    const end = match.index + match[0].length;
    const call = /^\s*(?:\?\.)?\s*\(/.exec(code.slice(end, end + 20));
    const close =
      call === null ? undefined : closingParen(code, end + call[0].length - 1);
    if (close === undefined) {
      found.holdsFile = true;
      continue;
    }
    const name = /^\s*(?:\?\.|\.)\s*([\w$]+)/.exec(
      code.slice(close + 1, close + 80)
    )?.[1];
    if (name !== undefined && FILE_WRITERS.has(name)) {
      found.site('fs.write', `Bun.file().${name}`);
    } else if (name === undefined || !FILE_READERS.has(name)) {
      found.holdsFile = true;
    }
  }
}

/** import を介さずに届くもの (グローバル) を見る */
function scanGlobals(code: string, found: Findings): string[] {
  applyRoot(code, 'Bun', BUN_MEMBERS, found);
  applyRoot(code, 'process', PROCESS_MEMBERS, found, true);
  applyBunFile(code, found);
  // `const { file } = Bun` は値として持ったのと同じ
  if (
    /\{[^{}=]*(?<![\w$])file(?![\w$])[^{}=]*\}\s*=\s*Bun(?![\w$])/.test(code)
  ) {
    found.holdsFile = true;
  }

  for (const [pattern, category, via] of NAMED_SINKS) {
    if (pattern.test(code)) found.site(category, via);
  }
  if (ENV_WRITES.some((pattern) => pattern.test(code))) {
    found.site('process.mutate', 'process.env assignment');
  }
  for (const [pattern, via] of ESCAPES) {
    if (pattern.test(code)) found.escape(via);
  }
  // `const load = require` と別名にされたら、何を読むか追えない
  for (const match of code.matchAll(/(?<![\w$.])require(?![\w$])/g)) {
    const before = code.slice(Math.max(0, match.index - 20), match.index);
    const after = code.slice(match.index + 7, match.index + 20);
    if (/^\s*(?:\(|\?\.|\.|&&|===?|!==?)/.test(after)) continue;
    if (/(?:typeof\s+|===?\s*|!==?\s*)$/.test(before)) continue;
    found.escape('require kept as a value');
  }

  const writers = new Set<string>();
  const members =
    /(?<!(?<![\w$])(?:stdout|stderr)\s*)(?:\?\.|\.)\s*(write|writer|delete|unlink)(?![\w$])/g;
  for (const match of code.matchAll(members)) writers.add(match[1] as string);
  return [...writers];
}

/** 組み込みモジュールの import を、表で引いて反映する */
function applyModule(
  fact: ModuleFact,
  specifier: string,
  clause: ImportClause | undefined,
  found: Findings
): void {
  const whole = (via: string): void => {
    if (fact.reach === 'escape')
      found.escape(`${via} (cannot tell what is used)`);
    else found.reach(fact.reach, via);
  };
  if (fact.names === undefined || clause === undefined) {
    whole(specifier);
    return;
  }
  for (const local of clause.locals) {
    // グローバルと同じ名前なら、グローバルの検査がそのまま効く
    if (fact.global === undefined) whole(specifier);
    else if (local !== fact.global)
      found.escape(`${specifier} imported as ${local}`);
  }
  for (const name of clause.names) {
    const via = `${specifier} (${name})`;
    const reach = own(fact.names, name);
    // 表に無い名前は絞れない
    if (reach === undefined && fact.strictNames !== true) whole(via);
    else found.reach(reach, via);
    if (specifier === 'bun' && name === 'file') found.holdsFile = true;
  }
}

/** 1 ファイルを見て、直接の sink と依存先を返す */
async function analyzeFile(
  file: string,
  cache: WalkState['cache']
): Promise<FileAnalysis> {
  const cached = cache.get(file);
  if (cached !== undefined) return cached;

  const found = new Findings(file);
  const deps: string[] = [];
  const finish = (fileWriters: string[] = []): FileAnalysis => {
    const result = {
      sites: found.sites,
      escapes: found.escapes,
      deps,
      holdsFile: found.holdsFile,
      fileWriters,
    };
    cache.set(file, result);
    return result;
  };

  let source: string;
  try {
    source = await Bun.file(file).text();
  } catch {
    // 読めなかったものを「何も無い」とは言えない
    found.escape('unreadable file');
    return finish();
  }

  const { code, doubts } = readCode(file, source);
  for (const doubt of doubts) found.escape(doubt);
  const fileWriters = scanGlobals(code, found);

  let imports: { kind: string; path: string }[] = [];
  try {
    // scanImports は `#!` の行を読めない
    imports = transpilerFor(file).scanImports(
      source.replace(/^#![^\n]*/, '')
    ) as typeof imports;
  } catch {
    // 読めない構文は保証しない
    found.escape('unparsable source');
  }

  /** 指定子 → どの形で参照されたか (import 文 / require / import()) */
  const kinds = new Map<string, Set<string>>();
  for (const entry of imports) {
    const seen = kinds.get(entry.path) ?? new Set();
    seen.add(entry.kind);
    kinds.set(entry.path, seen);
  }

  for (const [specifier, seen] of kinds) {
    // 実行時に決まる import 先は追えない
    if (specifier === '') {
      found.escape(
        seen.has('dynamic-import')
          ? 'dynamic import'
          : 'require with a computed path'
      );
      continue;
    }

    if (isInjectedJsxRuntime(specifier)) continue;

    const fact =
      own(FACTS, specifier) ?? own(PACKAGE_FACTS, packageName(specifier));
    if (fact !== undefined) {
      found.reach(fact, specifier);
      continue;
    }

    // 名前で絞ってよいのは、全部が `import { a } from` の形のときだけ。
    // `require('node:fs').writeFileSync` が混ざれば、名前は当てにならない
    const clause =
      seen.size === 1 && seen.has('import-statement')
        ? importClause(source, specifier)
        : undefined;

    // Bun 組み込み (`bun:*` と、Bun が自前実装で置き換えるパッケージ)。
    // ファイルに解決しないので表で決める。表に無ければ保証しない
    const bun = own(BUN_MODULES, specifier);
    if (bun !== undefined) {
      applyModule(bun, specifier, clause, found);
      continue;
    }
    if (specifier.startsWith('bun:')) {
      found.escape(`unknown Bun module ${specifier}`);
      continue;
    }

    let builtin = specifier.startsWith('node:') ? specifier : undefined;
    if (builtin === undefined) {
      let resolved: string;
      try {
        // resolveSync は絶対パスのディレクトリを要求する。相対のまま渡すと
        // 素の相対 import まで「解決できない」に落ちる (実測)
        resolved = Bun.resolveSync(specifier, resolve(dirname(file)));
      } catch {
        // 解決できない import はその先が見えない
        found.escape(`unresolved import ${specifier}`);
        continue;
      }
      if (resolved.startsWith('node:')) {
        // `fs` は `node:fs` に解決する。接頭辞なしでも同じモジュール
        builtin = resolved;
      } else if (resolved === specifier) {
        // ファイルに解決しなかった = Bun が自前で持つモジュール。上の表に無い
        found.escape(`unknown Bun module ${specifier}`);
        continue;
      } else {
        if (JS_LIKE.test(resolved)) deps.push(resolved);
        // `.node` / `.wasm` などは中を読めない
        else if (!DATA_FILE.test(resolved)) {
          found.escape(`import of a file that cannot be analyzed ${specifier}`);
        }
        continue;
      }
    }

    const node = own(NODE_MODULES, builtin);
    if (node === undefined) {
      found.escape(`unclassified Node module ${builtin}`);
      continue;
    }
    applyModule(node, specifier, clause, found);
  }

  return finish(fileWriters);
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

  // `Bun.file()` の値をどこかが持っていて、どこかに `.write()` /
  // `.delete()` があれば、それが届きうる。値の流れは追わないので、
  // 到達できる範囲に両方あれば書き込みとして数える
  let held: string | undefined;
  const writers: EffectSite[] = [];

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
    if (analyzed.holdsFile) held ??= file;
    for (const name of analyzed.fileWriters) {
      writers.push({
        category: 'fs.write',
        via: `.${name}() while a Bun.file() value is kept in ${held ?? file}`,
        file,
        path,
      });
    }
    for (const dep of analyzed.deps) {
      if (!parents.has(dep)) parents.set(dep, file);
      queue.push(dep);
    }
  }

  if (held !== undefined) {
    const where = held;
    state.sites.push(
      ...writers.map((site) => ({
        ...site,
        via: site.via.replace(/ in .*$/, ` in ${where}`),
      }))
    );
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
