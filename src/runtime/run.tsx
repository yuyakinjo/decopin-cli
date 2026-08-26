import type { Renderable } from '../jsx/types.ts';
/**
 * 実行ライフサイクル (§7) の Phase 2 時点の実装。
 *
 * 現時点で通すのは 1 (ルート解決) → 7 (command 実行) → 9 (書き出し) → 10 (終了コード)。
 * argv の検証 (Phase 3)、error.tsx (Phase 4)、layout / middleware (Phase 5)、
 * stdin (Phase 6) は後続フェーズでこの関数の中に足していく。
 */
import { render } from '../renderer/render.ts';
import { write } from '../renderer/writer.ts';
import type { WriteTargets } from '../renderer/writer.ts';
import { EXIT_CODE } from './exit.ts';
import { ErrorMessage } from './messages.tsx';
import { resolveRoute, suggest } from './router.ts';
import type { RouteTable } from './router.ts';

/** Phase 2 で command.tsx が受け取れるもの。Phase 3 で args / options が入る */
export interface CommandContext {
  /** コマンド名として消費されなかった残りの argv */
  argv: readonly string[];
  cwd: string;
}

export interface RunOptions {
  /** 省略時は process.argv.slice(2) */
  argv?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** 書き出し先 (テストから差し替えるため) */
  targets?: WriteTargets;
}

const NO_COLOR_FLAG = '--no-color';

async function emit(
  node: Renderable,
  options: RunOptions,
  noColorFlag: boolean
): Promise<number | undefined> {
  const result = await render(node, {
    env: options.env,
    noColorFlag,
  });
  write(result, options.targets);
  return result.exitCode;
}

/**
 * @returns 終了コード。呼び出し側が process.exit に渡す
 */
export async function run(
  table: RouteTable,
  options: RunOptions = {}
): Promise<number> {
  const rawArgv = options.argv ?? process.argv.slice(2);
  const noColorFlag = rawArgv.includes(NO_COLOR_FLAG);
  const argv = rawArgv.filter((token) => token !== NO_COLOR_FLAG);
  const cwd = options.cwd ?? process.cwd();

  const resolved = resolveRoute(table, argv);
  if (resolved === undefined) {
    const requested = argv.filter((token) => !token.startsWith('-'));
    const guess = suggest(table, argv);
    const names = Object.keys(table)
      .filter((name) => name !== '')
      .sort();
    await emit(
      <ErrorMessage
        message={`未知のコマンド: ${requested.join(' ')}`}
        hints={
          guess === undefined
            ? [`利用できるコマンド: ${names.join(', ')}`]
            : [`もしかして: ${guess.split('/').join(' ')}`]
        }
      />,
      options,
      noColorFlag
    );
    return EXIT_CODE.usage;
  }

  try {
    const loaded = (await table[resolved.name]?.()) as
      | { default?: unknown }
      | undefined;
    const command = loaded?.default;
    if (typeof command !== 'function') {
      throw new Error(
        `コマンド "${resolved.name}" の command ファイルは、コンポーネントを default export してください`
      );
    }

    const context: CommandContext = { argv: resolved.rest, cwd };
    const declared = await emit(
      (command as (props: CommandContext) => Renderable)(context),
      options,
      noColorFlag
    );
    return declared ?? EXIT_CODE.success;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await emit(<ErrorMessage message={message} />, options, noColorFlag);
    return EXIT_CODE.runtime;
  }
}
