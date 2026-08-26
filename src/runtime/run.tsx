import { parseArgvSpec } from '../declaration/parse.ts';
import { resolveHosts } from '../declaration/resolve.ts';
import { EMPTY_ARGV_SPEC } from '../declaration/spec.ts';
import type { ArgvSpec } from '../declaration/spec.ts';
import type { Renderable, RenderInput } from '../jsx/types.ts';
/**
 * 実行ライフサイクル (§7) の Phase 3 時点の実装。
 *
 * 通っているのは 1 (ルート解決) → 2 (--help / --version) → 4 (argv 検証)
 * → 7 (command 実行) → 9 (書き出し) → 10 (終了コード)。
 * env (3)、middleware (5)、stdin (6)、error.tsx は後続フェーズで足す。
 */
import { render } from '../renderer/render.ts';
import { write } from '../renderer/writer.ts';
import type { WriteTargets } from '../renderer/writer.ts';
import { validateArgv } from '../validation/validate.ts';
import { CliError, validationError } from './errors.ts';
import { EXIT_CODE } from './exit.ts';
import { CommandList, Help } from './help.tsx';
import { ErrorMessage } from './messages.tsx';
import { HELP_FLAGS, NO_COLOR_FLAG, VERSION_FLAG } from './reserved.ts';
import { resolveRoute, suggest } from './router.ts';
import type { RouteTable } from './router.ts';

/** Phase 3 で command.tsx が受け取るもの。型は Phase 3.5 の codegen で配る */
export interface CommandContext {
  /** 検証済みの位置引数 */
  args: Record<string, unknown>;
  /** 検証済みのオプション */
  options: Record<string, unknown>;
  /** コマンド名として消費されなかった生の argv */
  argv: readonly string[];
  cwd: string;
}

export interface RunOptions {
  /** 省略時は process.argv.slice(2) */
  argv?: string[];
  /** help に出す実行ファイル名 */
  program?: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** 書き出し先 (テストから差し替えるため) */
  targets?: WriteTargets;
}

async function emit(
  node: RenderInput,
  options: RunOptions,
  noColorFlag: boolean
): Promise<number | undefined> {
  const result = await render(node, { env: options.env, noColorFlag });
  write(result, options.targets);
  return result.exitCode;
}

/** `--` より前だけを見る (それ以降は位置引数なので予約語として扱わない) */
function findFlag(argv: readonly string[], flags: readonly string[]): boolean {
  for (const token of argv) {
    if (token === '--') return false;
    if (flags.includes(token)) return true;
  }
  return false;
}

function withoutFlags(
  argv: readonly string[],
  flags: readonly string[]
): string[] {
  const kept: string[] = [];
  let terminated = false;
  for (const token of argv) {
    if (token === '--') terminated = true;
    if (!terminated && flags.includes(token)) continue;
    kept.push(token);
  }
  return kept;
}

/** argv.tsx を読んで宣言を組み立てる。無ければ空の宣言 */
async function loadArgvSpec(
  loader: (() => Promise<unknown>) | undefined
): Promise<ArgvSpec> {
  if (loader === undefined) return EMPTY_ARGV_SPEC;
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw new CliError(
      'argv.tsx must default-export a function that returns <Argv>'
    );
  }
  const hosts = await resolveHosts(
    (declare as () => Renderable)() as Renderable
  );
  return parseArgvSpec(hosts);
}

/**
 * @returns 終了コード。呼び出し側が process.exit に渡す
 */
export async function run(
  table: RouteTable,
  options: RunOptions = {}
): Promise<number> {
  const rawArgv = options.argv ?? process.argv.slice(2);
  const noColorFlag = findFlag(rawArgv, [NO_COLOR_FLAG]);
  const argv = withoutFlags(rawArgv, [NO_COLOR_FLAG]);
  const cwd = options.cwd ?? process.cwd();
  const program = options.program ?? 'cli';
  const helpRequested = findFlag(argv, HELP_FLAGS);
  const versionRequested = findFlag(argv, [VERSION_FLAG]);

  const names = Object.keys(table)
    .filter((name) => name !== '')
    .sort();

  const resolved = resolveRoute(table, argv);
  if (resolved === undefined) {
    if (helpRequested || argv.length === 0) {
      await emit(
        <CommandList program={program} commands={names} />,
        options,
        noColorFlag
      );
      return helpRequested ? EXIT_CODE.success : EXIT_CODE.usage;
    }
    const requested = argv.filter((token) => !token.startsWith('-'));
    const guess = suggest(table, argv);
    await emit(
      <ErrorMessage
        message={`Unknown command: ${requested.join(' ')}`}
        hints={
          guess === undefined
            ? [`Available commands: ${names.join(', ')}`]
            : [`Did you mean: ${guess.split('/').join(' ')}`]
        }
      />,
      options,
      noColorFlag
    );
    return EXIT_CODE.usage;
  }

  if (versionRequested) {
    // Phase 8 で app/version.tsx を読むようになる
    await emit(
      <ErrorMessage
        message="No version is configured"
        hints={['Add app/version.tsx to enable --version']}
      />,
      options,
      noColorFlag
    );
    return EXIT_CODE.usage;
  }

  try {
    const route = table[resolved.name];
    if (route === undefined) throw new CliError('Route not found');

    const spec = await loadArgvSpec(route.argv);

    if (helpRequested) {
      await emit(
        <Help program={program} command={resolved.name} spec={spec} />,
        options,
        noColorFlag
      );
      return EXIT_CODE.success;
    }

    const rest = withoutFlags(resolved.rest, [...HELP_FLAGS, VERSION_FLAG]);
    let args: Record<string, unknown> = {};
    let commandOptions: Record<string, unknown> = {};

    // 宣言が無ければ検証もしない。生の argv だけがコマンドに渡る
    if (route.argv !== undefined) {
      const validated = validateArgv(spec, rest);
      if (!validated.ok) throw validationError(validated.issues);
      args = validated.value.args;
      commandOptions = validated.value.options;
    }

    const loaded = (await route.command()) as { default?: unknown };
    const command = loaded.default;
    if (typeof command !== 'function') {
      throw new CliError(
        `Command "${resolved.name}" must default-export a component`
      );
    }

    const context: CommandContext = {
      args,
      options: commandOptions,
      argv: rest,
      cwd,
    };
    const declared = await emit(
      (command as (props: CommandContext) => RenderInput)(context),
      options,
      noColorFlag
    );
    return declared ?? EXIT_CODE.success;
  } catch (error) {
    const cliError =
      error instanceof CliError
        ? error
        : new CliError(error instanceof Error ? error.message : String(error), {
            cause: error,
          });
    const hints =
      cliError.issues.length > 1 ? cliError.issues.slice(1) : undefined;
    await emit(
      <ErrorMessage
        message={cliError.issues[0] ?? cliError.message}
        hints={
          cliError.kind === 'validation'
            ? [...(hints ?? []), `Run with --help to see the usage`]
            : hints
        }
      />,
      options,
      noColorFlag
    );
    return cliError.exitCode;
  }
}
