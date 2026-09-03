import { supportsUnicode } from '../renderer/render.ts';
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
  /**
   * 一度に見せる候補の数 (既定 10)。候補がそれより多いときは選択位置の
   * 周りだけを出し、残りは「… N more」で数を言う
   */
  window?: number;
}

// 制御文字は値で作る (生のバイトを置くと test/docs/source-hygiene が落ちる)
const ESC = String.fromCharCode(27);
const UP = `${ESC}[A`;
const DOWN = `${ESC}[B`;
const CTRL_C = String.fromCharCode(3);
const BACKSPACE = String.fromCharCode(127);
const CTRL_H = String.fromCharCode(8);

/** 1 文字の、表示できる打鍵か (絞り込みの文字として受ける) */
function isPrintable(key: string): boolean {
  return [...key].length === 1 && key >= ' ' && key !== BACKSPACE;
}

/** 候補の絞り込み。大文字小文字を区別しない部分一致 */
export function matches(value: string, filter: string): boolean {
  return filter === '' || value.toLowerCase().includes(filter.toLowerCase());
}

/**
 * 候補から 1 つ選ばせる。stdin と stderr が端末でなければ exit 2。
 *
 * ```tsx
 * const target = await choose('Deploy which?', ['web', 'api'] as const);
 * //    ^? 'web' | 'api'
 * ```
 *
 * 文字を打つと候補が絞られ、↑↓ (候補に j / k が無ければ j k も) で動き、
 * Enter で決める。Esc / Ctrl+C は 130 で打ち切る
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
  const window = Math.max(1, options.window ?? 10);
  // 文字を打つと候補が絞られる (候補が何十個もあるときに矢印だけでは選べない)
  let filter = '';
  let shown: string[] = [...values];
  let index = Math.max(0, shown.indexOf(options.initial ?? ''));
  let drawn = 0;

  // 前回描いた分を消す。カーソルを上げて末尾まで消す
  const erase = () => (drawn === 0 ? '' : `${ESC}[${drawn}A${ESC}[J`);
  const draw = () => {
    const help =
      filter === ''
        ? '(type to filter, arrows to move, enter to select)'
        : `(${shown.length} of ${values.length})`;
    const head = `${sgr('1', prompt)} ${filter === '' ? '' : `${filter}${sgr('2', '|')} `}${sgr('2', help)}`;
    // 選択位置が見える範囲だけ出す
    const start = Math.max(
      0,
      Math.min(index - Math.floor(window / 2), shown.length - window)
    );
    const visible = shown.slice(start, start + window);
    const lines = [
      head,
      ...(shown.length === 0 ? [sgr('2', '  (no match)')] : []),
      ...visible.map((value, at) =>
        start + at === index
          ? `${sgr('36', marker)} ${sgr('1', value)}`
          : `  ${value}`
      ),
      ...(start + window < shown.length
        ? [sgr('2', `  … ${shown.length - start - window} more`)]
        : []),
    ];
    terminal.write(`${erase()}${lines.join('\n')}\n`);
    drawn = lines.length;
  };
  const refilter = () => {
    shown = values.filter((value) => matches(value, filter));
    index = 0;
  };

  draw();
  for await (const key of terminal.keys()) {
    if (key === UP || (key === 'k' && filter === '' && !values.includes('k'))) {
      if (shown.length > 0) index = (index - 1 + shown.length) % shown.length;
    } else if (
      key === DOWN ||
      (key === 'j' && filter === '' && !values.includes('j'))
    ) {
      if (shown.length > 0) index = (index + 1) % shown.length;
    } else if (key === '\r' || key === '\n') {
      const picked = shown[index];
      if (picked === undefined) continue;
      // 選んだものだけを残す。後から読み返したときに何を選んだか分かる
      terminal.write(`${erase()}${sgr('2', prompt)} ${picked}\n`);
      return picked as T[number];
    } else if (key === ESC || key === CTRL_C) {
      terminal.write(erase());
      interrupt();
    } else if (key === BACKSPACE || key === CTRL_H) {
      if (filter === '') continue;
      filter = filter.slice(0, -1);
      refilter();
    } else if (isPrintable(key)) {
      filter += key;
      refilter();
    } else {
      continue;
    }
    draw();
  }
  // 入力が閉じた (端末が消えた)。選べなかったので打ち切る
  terminal.write(erase());
  interrupt();
}

/** `ask()` の追加設定 */
export interface AskOptions {
  /** Enter だけで返す値。表示にも出る */
  default?: string;
  /** 受け付けない入力に対して、何が悪いかを返す。`undefined` なら通す */
  validate?: (value: string) => string | undefined;
  /** 端末が無いときの一行 (choose と同じ) */
  hint?: string;
  /** 入力を伏せる (パスワードなど)。打った文字数だけ `*` を出す */
  secret?: boolean;
}

/**
 * 一行の入力を求める (ADR 36 の範囲内: 端末とだけ対話し、stderr に描く)。
 *
 * ```tsx
 * const port = await ask('Local port?', { default: '8888', validate: (v) => (/^\d+$/.test(v) ? undefined : 'digits only') });
 * ```
 *
 * Backspace で消し、Enter で確定。空で Enter なら default。Esc / Ctrl+C は 130
 */
export async function ask(
  prompt: string,
  options: AskOptions = {}
): Promise<string> {
  const terminal = current ?? processTerminal();
  if (!terminal.interactive) {
    throw new CliError(`"${prompt}" needs a terminal to type an answer`, {
      kind: 'usage',
      exitCode: EXIT_CODE.usage,
      hints: [
        options.hint ?? 'Not a terminal, so pass the value as an argument',
      ],
    });
  }
  const sgr = (code: string, text: string) =>
    terminal.colors ? `${ESC}[${code}m${text}${ESC}[0m` : text;
  let value = '';
  let problem: string | undefined;
  let drawn = 0;
  const erase = () => (drawn === 0 ? '' : `${ESC}[${drawn}A${ESC}[J`);
  const draw = () => {
    const shown = options.secret ? '*'.repeat(value.length) : value;
    const fallback =
      options.default === undefined || value !== ''
        ? ''
        : ` ${sgr('2', `(${options.default})`)}`;
    const lines = [
      `${sgr('1', prompt)}${fallback} ${shown}${sgr('2', '|')}`,
      ...(problem === undefined ? [] : [sgr('31', `  ${problem}`)]),
    ];
    terminal.write(`${erase()}${lines.join('\n')}\n`);
    drawn = lines.length;
  };

  draw();
  for await (const key of terminal.keys()) {
    if (key === '\r' || key === '\n') {
      const answer = value === '' ? (options.default ?? '') : value;
      problem = options.validate?.(answer);
      if (problem !== undefined) {
        draw();
        continue;
      }
      terminal.write(
        `${erase()}${sgr('2', prompt)} ${options.secret ? '*'.repeat(answer.length) : answer}\n`
      );
      return answer;
    }
    if (key === ESC || key === CTRL_C) {
      terminal.write(erase());
      interrupt();
    }
    if (key === BACKSPACE || key === CTRL_H) value = value.slice(0, -1);
    else if (isPrintable(key)) value += key;
    else continue;
    problem = undefined;
    draw();
  }
  terminal.write(erase());
  interrupt();
}

/** `confirm()` の追加設定 */
export interface ConfirmOptions {
  /** Enter だけのときの答え (既定 true) */
  default?: boolean;
  /** 端末が無いときの一行 */
  hint?: string;
}

/**
 * はい / いいえを聞く。`y` / `n` で即決、Enter は default。
 * 端末が無ければ exit 2 (choose と同じ)。Esc / Ctrl+C は 130
 */
export async function confirm(
  prompt: string,
  options: ConfirmOptions = {}
): Promise<boolean> {
  const terminal = current ?? processTerminal();
  if (!terminal.interactive) {
    throw new CliError(`"${prompt}" needs a terminal to answer yes or no`, {
      kind: 'usage',
      exitCode: EXIT_CODE.usage,
      hints: [options.hint ?? 'Not a terminal, so pass the decision as a flag'],
    });
  }
  const sgr = (code: string, text: string) =>
    terminal.colors ? `${ESC}[${code}m${text}${ESC}[0m` : text;
  const fallback = options.default ?? true;
  terminal.write(
    `${sgr('1', prompt)} ${sgr('2', fallback ? '(Y/n)' : '(y/N)')}\n`
  );
  const finish = (answer: boolean) => {
    terminal.write(
      `${ESC}[1A${ESC}[J${sgr('2', prompt)} ${answer ? 'yes' : 'no'}\n`
    );
    return answer;
  };
  for await (const key of terminal.keys()) {
    if (key === 'y' || key === 'Y') return finish(true);
    if (key === 'n' || key === 'N') return finish(false);
    if (key === '\r' || key === '\n') return finish(fallback);
    if (key === ESC || key === CTRL_C) {
      terminal.write(`${ESC}[1A${ESC}[J`);
      interrupt();
    }
  }
  terminal.write(`${ESC}[1A${ESC}[J`);
  interrupt();
}
