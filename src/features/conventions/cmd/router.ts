/**
 * argv からコマンドを決める。
 *
 * ディレクトリの階層がそのままサブコマンドなので、`user create` のように
 * 語が続く場合は「最も長く一致するもの」を選ぶ。
 */
import type { EffectVerdicts } from '../../../types/effects.ts';

/** 1 コマンド分の読み込み関数。ファイルが無い規約は undefined */
export interface RouteLoaders {
  /** cmd.tsx。唯一の必須ファイル */
  cmd: () => Promise<unknown>;
  argv?: () => Promise<unknown>;
  stdin?: () => Promise<unknown>;
  /** data.tsx。表示の前にデータだけを用意する (ADR 25) */
  data?: () => Promise<unknown>;
  /** output.tsx。data の形を宣言し、実行時に検証する (ADR 28) */
  output?: () => Promise<unknown>;
  /** shell.tsx。親シェルへの指示 (ADR 35) */
  shell?: () => Promise<unknown>;
  /** complete.tsx。実行時に決まる補完候補 (ADR 38) */
  complete?: () => Promise<unknown>;
  /** error.tsx の並び。**近い順** (自分のディレクトリ → 親 → ...) */
  errors?: Array<() => Promise<unknown>>;
  /** not-found.tsx の並び。**近い順**。notFound() が使う (ADR 30) */
  notFounds?: Array<() => Promise<unknown>>;
  /** layout.tsx の並び。**外側から順** (ルート → ... → 自分のディレクトリ) */
  layouts?: Array<() => Promise<unknown>>;
  /** middleware.tsx の並び。**外側から順** */
  middlewares?: Array<() => Promise<unknown>>;
  /**
   * ビルド時に数えた副作用の判定 (ADR 32)。MCP の annotations の元になる (ADR 33)。
   * 生成された routes.ts だけが埋める。手書きの表では省略してよい
   */
  effects?: EffectVerdicts;
}

/** コマンド名 → 読み込み関数 */
export type RouteTable = Record<string, RouteLoaders>;

/**
 * argv が何を指しているか。表は test/contract/routing.test.tsx。
 *
 * - `command`: 実行すべきコマンドが決まった
 * - `group`: `cmd.tsx` を持たないディレクトリ (子コマンドを持つ)
 * - `root`: 語が 1 つも無く、ルートコマンドも無い
 * - `unknown`: どれにも当たらない
 */
export type Target =
  | { kind: 'command'; name: string; rest: string[] }
  | { kind: 'group'; name: string }
  | { kind: 'root' }
  | { kind: 'unknown'; requested: string; suggestion: string | undefined };

/** 一致したコマンドと、消費されなかった残りのトークン */
export interface Resolved {
  /** 一致したコマンド名。ルートコマンドは空文字 */
  name: string;
  /** コマンド名として消費されなかった残りのトークン */
  rest: string[];
}

/** `-` で始まるものはオプション。コマンド名の探索はそこで打ち切る */
function leadingWords(argv: string[]): string[] {
  const words: string[] = [];
  for (const token of argv) {
    if (token.startsWith('-')) break;
    words.push(token);
  }
  return words;
}

/** @returns 一致しなければ undefined */
export function resolveRoute(
  table: RouteTable,
  argv: string[]
): Resolved | undefined {
  const words = leadingWords(argv);

  for (let length = words.length; length > 0; length -= 1) {
    const name = words.slice(0, length).join('/');
    if (Object.hasOwn(table, name)) {
      return { name, rest: argv.slice(length) };
    }
  }

  if (Object.hasOwn(table, '')) return { name: '', rest: argv };
  return undefined;
}

/**
 * argv を {@link Target} に解決する。判定順が挙動を決める:
 *
 * 1. 最長一致するコマンド
 * 2. ルートコマンド (`app/cmd.tsx`)
 * 3. 語が 0 個ならルート help
 * 4. 語の全部がコマンド名の前方一致ならグループ help
 * 5. それ以外は未知のコマンド
 */
export function resolveTarget(table: RouteTable, argv: string[]): Target {
  const words = leadingWords(argv);
  const resolved = resolveRoute(table, argv);
  if (resolved !== undefined) {
    return { kind: 'command', name: resolved.name, rest: resolved.rest };
  }
  if (words.length === 0) return { kind: 'root' };

  const prefix = `${words.join('/')}/`;
  const isGroup = Object.keys(table).some((name) => name.startsWith(prefix));
  if (isGroup) return { kind: 'group', name: words.join('/') };

  return {
    kind: 'unknown',
    requested: words.join(' '),
    suggestion: suggest(table, argv),
  };
}

/** あるグループの直下・配下にあるコマンド名 (昇順) */
export function commandsUnder(table: RouteTable, group: string): string[] {
  const prefix = group === '' ? '' : `${group}/`;
  return Object.keys(table)
    .filter((name) => name !== '' && name.startsWith(prefix))
    .sort();
}

/**
 * 打ち間違いに一番近い候補を返す (ADR 30)。
 * 遠すぎる候補を出すと混乱するので、入力の長さの半分までに限る。
 */
export function closest(
  value: string,
  candidates: Iterable<string>
): string | undefined {
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate === '') continue;
    const distance = editDistance(value, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  if (best === undefined || bestDistance > Math.ceil(value.length / 2)) {
    return undefined;
  }
  return best;
}

/** 未知のコマンドのときに「近いもの」を提案する */
export function suggest(table: RouteTable, argv: string[]): string | undefined {
  const words = leadingWords(argv);
  if (words.length === 0) return undefined;
  return closest(words.join('/'), Object.keys(table));
}

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);

  for (let row = 1; row < rows; row += 1) {
    const current = [row, ...Array.from({ length: cols - 1 }, () => 0)];
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      current[col] = Math.min(
        (previous[col] ?? 0) + 1,
        (current[col - 1] ?? 0) + 1,
        (previous[col - 1] ?? 0) + cost
      );
    }
    previous = current;
  }
  return previous[cols - 1] ?? 0;
}
