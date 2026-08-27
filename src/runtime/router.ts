/**
 * argv からコマンドを決める。
 *
 * ディレクトリの階層がそのままサブコマンドなので、`user create` のように
 * 語が続く場合は「最も長く一致するもの」を選ぶ。
 */

/** 1 コマンド分の読み込み関数。ファイルが無い規約は undefined */
export interface RouteLoaders {
  command: () => Promise<unknown>;
  argv?: () => Promise<unknown>;
  stdin?: () => Promise<unknown>;
  /** error.tsx の並び。**近い順** (自分のディレクトリ → 親 → ...) */
  errors?: Array<() => Promise<unknown>>;
  /** layout.tsx の並び。**外側から順** (ルート → ... → 自分のディレクトリ) */
  layouts?: Array<() => Promise<unknown>>;
  /** middleware.tsx の並び。**外側から順** */
  middlewares?: Array<() => Promise<unknown>>;
}

/** コマンド名 → 読み込み関数 */
export type RouteTable = Record<string, RouteLoaders>;

/**
 * argv が何を指しているか。表は test/contract/routing.test.tsx。
 *
 * - `command`: 実行すべきコマンドが決まった
 * - `group`: `command.tsx` を持たないディレクトリ (子コマンドを持つ)
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

/**
 * @returns 一致しなければ undefined
 */
export function resolveRoute(
  table: RouteTable,
  argv: string[]
): Resolved | undefined {
  const words = leadingWords(argv);

  // 長い方から試す (`user create` を `user` より優先する)
  for (let length = words.length; length > 0; length -= 1) {
    const name = words.slice(0, length).join('/');
    if (Object.hasOwn(table, name)) {
      return { name, rest: argv.slice(length) };
    }
  }

  // ルートコマンド (app/command.tsx) があれば引数をそのまま渡す
  if (Object.hasOwn(table, '')) {
    return { name: '', rest: argv };
  }
  return undefined;
}

/**
 * argv を {@link Target} に解決する。判定順が挙動を決める:
 *
 * 1. 最長一致するコマンド
 * 2. ルートコマンド (`app/command.tsx`) — 単一コマンドの CLI を壊さないため
 * 3. 語が 0 個 → ルート help
 * 4. 語の全部がコマンド名の前方一致プレフィックス → グループ help
 * 5. それ以外 → 未知のコマンド
 */
export function resolveTarget(table: RouteTable, argv: string[]): Target {
  const words = leadingWords(argv);

  // 1 と 2 は既存の解決に任せる (ルートコマンドのフォールバックを含む)
  const resolved = resolveRoute(table, argv);
  if (resolved !== undefined) {
    return { kind: 'command', name: resolved.name, rest: resolved.rest };
  }

  if (words.length === 0) return { kind: 'root' };

  // 語の全部が、あるコマンド名のディレクトリ部分に一致するか
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

/** 未知のコマンドのときに「近いもの」を提案する */
export function suggest(table: RouteTable, argv: string[]): string | undefined {
  const words = leadingWords(argv);
  if (words.length === 0) return undefined;
  const target = words.join('/');

  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const name of Object.keys(table)) {
    if (name === '') continue;
    const distance = editDistance(target, name);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }
  // 遠すぎる候補を出すと混乱するので、名前の長さの半分までに限る
  if (best === undefined || bestDistance > Math.ceil(target.length / 2)) {
    return undefined;
  }
  return best;
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
