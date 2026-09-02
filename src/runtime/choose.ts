/**
 * 端末で候補から 1 つ選ばせる `choose()` (ADR 36)。
 *
 * ADR 4 は「対話的な入力を読まない」だったが、ここで 1 つだけ例外を作る。
 * 条件は **stdin と stderr が両方端末**であること。パイプの中や MCP からは
 * 使い方の誤り (exit 2) にして、引数で渡す道を示す。描くのは stderr だけで、
 * stdout には一切触らない (ADR 26)。
 *
 * `<Choose>` という JSX ではなく関数なのは、JSX 式が型引数を運べないため
 * (ADR 9)。`values` を `as const` で渡せば戻り値はその literal union になる
 */
import { supportsUnicode } from '../renderer/render.ts';
import { CliError } from './errors.ts';
import { EXIT_CODE } from './exit.ts';
import { interrupt } from './signals.ts';

/** `choose()` が読み書きする端末。テストでは差し替える */
export interface Terminal {
  /** stdin と stderr が両方端末か。偽なら choose() は問い掛けずに失敗する */
  interactive: boolean;
  /** 生のキー入力 (raw mode)。1 回の yield が 1 打鍵 (エスケープ列は 1 つ) */
  keys: () => AsyncIterable<string>;
  /** stderr への書き込み */
  write: (text: string) => void;
  /** 色を出してよいか */
  colors: boolean;
  unicode: boolean;
}

/** 端末でないときの Terminal。問い掛けは全部失敗する */
export function nonInteractiveTerminal(): Terminal {
  return {
    interactive: false,
    keys: async function* () {},
    write: () => {},
    colors: false,
    unicode: false,
  };
}

/** 実際の process の端末 */
export function processTerminal(
  env: Record<string, string | undefined> = process.env
): Terminal {
  const stdin = process.stdin as NodeJS.ReadStream & {
    setRawMode?: (mode: boolean) => unknown;
  };
  return {
    interactive:
      stdin.isTTY === true &&
      process.stderr.isTTY === true &&
      typeof stdin.setRawMode === 'function',
    colors: env.NO_COLOR === undefined && process.stderr.isTTY === true,
    unicode: supportsUnicode(env),
    write: (text) => {
      process.stderr.write(text);
    },
    keys: async function* () {
      const queue: string[] = [];
      let wake: (() => void) | undefined;
      const onData = (chunk: Buffer | string) => {
        queue.push(chunk.toString());
        wake?.();
      };
      stdin.setRawMode?.(true);
      stdin.resume();
      stdin.on('data', onData);
      try {
        while (true) {
          if (queue.length === 0) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            wake = undefined;
          }
          yield queue.shift() as string;
        }
      } finally {
        stdin.off('data', onData);
        stdin.setRawMode?.(false);
        stdin.pause();
      }
    },
  };
}

let current: Terminal | undefined;

/** run() が実行のたびに差し込む。利用者のコードは choose() 越しに触る */
export function setTerminal(terminal: Terminal | undefined): void {
  current = terminal;
}

/** `choose()` の追加設定 */
export interface ChooseOptions {
  /**
   * 端末が無いときに「代わりにこうしてください」と伝える一行。
   * 例: `'Pass it as the first argument: deploy <target>'`
   */
  hint?: string;
  /** 最初に選ばれている値 */
  initial?: string;
}

// 制御文字は値で作る (生のバイトを置くと test/docs/source-hygiene が落ちる)
const ESC = String.fromCharCode(27);
const UP = `${ESC}[A`;
const DOWN = `${ESC}[B`;
const CTRL_C = String.fromCharCode(3);

/**
 * 候補から 1 つ選ばせる。stdin と stderr が端末でなければ exit 2。
 *
 * ```tsx
 * const target = await choose('Deploy which?', ['web', 'api'] as const);
 * //    ^? 'web' | 'api'
 * ```
 *
 * ↑↓ / j k / 1-9 で動き、Enter で決める。Esc / Ctrl+C は 130 で打ち切る
 */
export async function choose<const T extends readonly string[]>(
  prompt: string,
  values: T,
  options: ChooseOptions = {}
): Promise<T[number]> {
  if (values.length === 0) {
    throw new CliError(`choose("${prompt}") was given no values`);
  }
  const terminal = current ?? processTerminal();
  if (!terminal.interactive) {
    throw new CliError(
      `"${prompt}" needs a terminal to choose from: ${values.join(', ')}`,
      {
        kind: 'usage',
        exitCode: EXIT_CODE.usage,
        hints: [
          options.hint ?? 'Not a terminal, so pass the value as an argument',
        ],
      }
    );
  }

  const sgr = (code: string, text: string) =>
    terminal.colors ? `${ESC}[${code}m${text}${ESC}[0m` : text;
  const marker = terminal.unicode ? '❯' : '>';
  let index = Math.max(0, values.indexOf(options.initial ?? ''));
  let drawn = 0;

  // 前回描いた分を消す。カーソルを上げて末尾まで消す
  const erase = () => (drawn === 0 ? '' : `${ESC}[${drawn}A${ESC}[J`);
  const draw = () => {
    const lines = [
      `${sgr('1', prompt)} ${sgr('2', '(arrows to move, enter to select)')}`,
      ...values.map((value, at) =>
        at === index ? `${sgr('36', marker)} ${sgr('1', value)}` : `  ${value}`
      ),
    ];
    terminal.write(`${erase()}${lines.join('\n')}\n`);
    drawn = lines.length;
  };

  draw();
  for await (const key of terminal.keys()) {
    if (key === UP || key === 'k') {
      index = (index - 1 + values.length) % values.length;
    } else if (key === DOWN || key === 'j') {
      index = (index + 1) % values.length;
    } else if (/^[1-9]$/.test(key) && Number(key) <= values.length) {
      index = Number(key) - 1;
    } else if (key === '\r' || key === '\n') {
      // 選んだものだけを残す。後から読み返したときに何を選んだか分かる
      terminal.write(`${erase()}${sgr('2', prompt)} ${values[index]}\n`);
      return values[index] as T[number];
    } else if (key === ESC || key === CTRL_C) {
      terminal.write(erase());
      interrupt();
    } else {
      continue;
    }
    draw();
  }
  // 入力が閉じた (端末が消えた)。選べなかったので打ち切る
  terminal.write(erase());
  interrupt();
}
