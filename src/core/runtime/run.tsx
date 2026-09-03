import { loadArgvSpec } from '../../features/conventions/argv/runtime.ts';
import { validateArgv } from '../../features/conventions/argv/validation.ts';
import type { CommandContext } from '../../features/conventions/cmd/context.ts';
import {
  commandsUnder,
  resolveTarget,
  type RouteTable,
} from '../../features/conventions/cmd/router.ts';
import { loadCommand } from '../../features/conventions/cmd/runtime.ts';
import {
  completionCandidates,
  formatCandidates,
} from '../../features/conventions/complete/runtime.ts';
import { loadData } from '../../features/conventions/data/runtime.ts';
import { findNotSerializable } from '../../features/conventions/data/serializable.ts';
import {
  CliError,
  validationError,
} from '../../features/conventions/error/errors.ts';
import { ErrorMessage } from '../../features/conventions/error/messages.tsx';
import {
  CommandList,
  describeCommands,
  Help,
} from '../../features/conventions/help/runtime.tsx';
import { isHelpSignal } from '../../features/conventions/help/signal.ts';
import { applyLayouts } from '../../features/conventions/layout/runtime.tsx';
import { runMiddleware } from '../../features/conventions/middleware/runtime.ts';
import type { NotFoundProps } from '../../features/conventions/not-found/runtime.tsx';
import { isNotFoundSignal } from '../../features/conventions/not-found/signal.ts';
import { validateData } from '../../features/conventions/output/runtime.ts';
import {
  binaryName,
  generateShellHook,
  isShellName,
  loadShell,
  renderShell,
  SHELL_FILE_ENV,
  SHELLS,
} from '../../features/conventions/shell/runtime.ts';
import {
  loadStdinSpec,
  processStdin,
  readStdin,
} from '../../features/conventions/stdin/runtime.ts';
import type { StdinSource } from '../../features/conventions/stdin/runtime.ts';
import {
  handleError,
  toCliError,
} from '../../features/inherited/error/runtime.tsx';
import { presentInheritedNotFound } from '../../features/inherited/not-found/runtime.ts';
import { loadEnv } from '../../features/root-only/env/runtime.ts';
import { withGlobalError } from '../../features/root-only/global-error/runtime.ts';
import { presentRootNotFound } from '../../features/root-only/not-found/runtime.ts';
import { loadVersionSpec } from '../../features/root-only/version/runtime.ts';
/**
 * 実行ライフサイクル。argv の解決から書き出しまでを 1 本で通す。
 *
 * ここは各 feature を実行順に接続する composition root。個々の規約ファイルの
 * 読み込み・検証・表示は `src/features/` の該当ディレクトリが担当する。
 */
import { Json, Line, Stderr } from '../components/index.ts';
import { resolveHosts } from '../jsx/resolve.ts';
import type { Renderable, RenderInput } from '../jsx/types.ts';
import { present as presentDocument } from '../renderer/present.ts';
import type { WriteTargets } from '../renderer/writer.ts';
import {
  nonInteractiveTerminal,
  processTerminal,
  setTerminal,
} from './choose.ts';
import type { Terminal } from './choose.ts';
import { EXIT_CODE } from './exit.ts';
import { serveMcp } from './mcp.ts';
import { present } from './override.ts';
import {
  COMPLETE_COMMAND,
  HELP_FLAGS,
  DRY_RUN_FLAG,
  JSON_FLAG,
  MCP_COMMAND,
  NO_COLOR_FLAG,
  SHELL_COMMAND,
  VERSION_FLAG,
} from './reserved.ts';
import { isInterruptSignal } from './signals.ts';

export type { CommandContext } from '../../features/conventions/cmd/context.ts';

/**
 * `run()` に渡すもの。生成された `entry.ts` が規約ファイルの
 * 読み込み関数を詰めて呼ぶ
 */
export interface RunOptions {
  /** 省略時は process.argv.slice(2) */
  argv?: string[];
  /** help に出す実行ファイル名 */
  program?: string;
  /** 実際に打つコマンド名。シェル関数 (ADR 35) が包む相手。省略時は program から */
  bin?: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** `app/global-error.tsx` (エラー表示の最後の受け皿) */
  globalError?: () => Promise<unknown>;
  /** 標準入力の口 (テストから差し替えるため) */
  stdin?: StdinSource;
  /** `app/env.tsx` */
  envFile?: () => Promise<unknown>;
  /** `app/version.tsx` */
  versionFile?: () => Promise<unknown>;
  /** ディレクトリ (ルートは空文字) → `help.tsx` */
  helps?: Record<string, () => Promise<unknown>>;
  /** `app/not-found.tsx` */
  notFound?: () => Promise<unknown>;
  /** 書き出し先 (テストから差し替えるため) */
  targets?: WriteTargets;
  /**
   * choose() が使う端末 (ADR 36)。省略時、targets を差し替えているなら
   * 端末ではない扱い (問い掛けは失敗する)
   */
  terminal?: Terminal;
  /**
   * TTY 判定の明示指定。省略時、targets を差し替えているなら非 TTY として
   * 扱う (キャプチャ先は端末ではないので、実端末の判定を継承しない)
   */
  isTTY?: { stdout?: boolean; stderr?: boolean };
}

async function emit(
  node: RenderInput,
  options: RunOptions,
  noColorFlag: boolean
): Promise<number | undefined> {
  // 島 (<Dynamic>) が無ければ render + write と同じ 1 回書きになる (ADR 22)
  return presentDocument(node, {
    env: options.env,
    noColorFlag,
    targets: options.targets,
    isTTY:
      options.isTTY ??
      (options.targets === undefined
        ? undefined
        : { stdout: false, stderr: false }),
  });
}

/**
 * `--json` のときに stderr へ出すエラーの形 (ADR 29)。
 *
 * `code` は機械が分岐する先なので、文面ではなく分類を出す。
 * 理由が複数ある検証の失敗は `issues` に並べる
 */
function errorPayload(error: CliError): {
  code: string;
  message: string;
  exitCode: number;
  issues?: string[];
} {
  return {
    code: error.kind,
    message: error.issues[0] ?? error.message,
    exitCode: error.exitCode,
    // 直し方は機械にも渡す。エージェントが次の一手を決められる (ADR 31)
    ...(error.hints.length > 0 ? { hints: error.hints } : {}),
    ...(error.issues.length > 1 ? { issues: error.issues } : {}),
  };
}

/** ルート名 (`user/list`) を利用者が打つ形 (`user list`) にする */
function display(name: string): string {
  return name.split('/').join(' ');
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

/**
 * @returns 終了コード。呼び出し側が process.exit に渡す
 */
export async function run(
  table: RouteTable,
  options: RunOptions = {}
): Promise<number> {
  const rawArgv = options.argv ?? process.argv.slice(2);

  // シェル補完 (ADR 21)。人間ではなく補完シムが読むので、描画は通さず
  // 1 回の write で返す。補完中に落ちると Tab のたびにエラーが出るため、
  // 何があっても黙って成功にする。
  // シムが必ず付ける 2 語目の `--` まで見て判定する。1 語目だけで判定すると、
  // ルートコマンドが `__complete` という文字列を位置引数に取れなくなる
  if (rawArgv[0] === COMPLETE_COMMAND && rawArgv[1] === '--') {
    const words = rawArgv.slice(2);
    const out = options.targets?.stdout ?? process.stdout;
    try {
      const text = formatCandidates(
        await completionCandidates(table, words, {
          env: options.env,
          cwd: options.cwd,
        })
      );
      if (text !== '') out.write(text);
    } catch {
      // 候補なし扱い。シェル側がファイル補完に落ちる
    }
    return EXIT_CODE.success;
  }

  // MCP サーバ (ADR 33)。`__complete` と同じく機械が読むので描画は通さない。
  // 2 語目まで見るのも同じ理由 (ルートコマンドが `__mcp` を引数に取れるように)。
  // 入力は届いた順に読む。全文を待つと initialize に応答できない
  if (rawArgv[0] === MCP_COMMAND && rawArgv.length === 1) {
    const source = options.stdin ?? processStdin();
    const input =
      source.stream?.() ??
      (async function* () {
        yield await source.read();
      })();
    return serveMcp(
      table,
      options,
      run,
      input,
      options.targets?.stdout ?? process.stdout
    );
  }

  // シェル関数の出力 (ADR 35)。rc ファイルの eval が読むので描画は通さない
  if (rawArgv[0] === SHELL_COMMAND) {
    const shell = rawArgv[1] ?? '';
    const out = options.targets?.stdout ?? process.stdout;
    if (rawArgv.length !== 2 || !isShellName(shell)) {
      const err = options.targets?.stderr ?? process.stderr;
      err.write(
        `Usage: ${options.program ?? 'cli'} ${SHELL_COMMAND} <${SHELLS.join('|')}>\n`
      );
      return EXIT_CODE.usage;
    }
    out.write(
      generateShellHook(
        options.bin ?? binaryName(options.program ?? 'cli'),
        shell
      )
    );
    return EXIT_CODE.success;
  }

  const noColorFlag = findFlag(rawArgv, [NO_COLOR_FLAG]);
  const argv = withoutFlags(rawArgv, [NO_COLOR_FLAG]);
  const cwd = options.cwd ?? process.cwd();
  const program = options.program ?? 'cli';
  const helpRequested = findFlag(argv, HELP_FLAGS);
  const versionRequested = findFlag(argv, [VERSION_FLAG]);

  // --version はコマンドに依存しないので、ルート解決より前に処理する
  if (versionRequested) {
    if (options.versionFile === undefined) {
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
      const spec = await loadVersionSpec(options.versionFile);
      await emit(
        <Line>
          {spec.name === undefined
            ? spec.version
            : `${spec.name} ${spec.version}`}
        </Line>,
        options,
        noColorFlag
      );
      return EXIT_CODE.success;
    } catch (error) {
      const cliError = toCliError(error);
      await emit(
        <ErrorMessage message={cliError.message} />,
        options,
        noColorFlag
      );
      return EXIT_CODE.runtime;
    }
  }

  // --json はコマンドに依らないので、失敗しても同じ判断ができるよう先に見る
  const jsonRequested = findFlag(argv, [JSON_FLAG]);
  // --dry-run も同じ。値はコマンドに渡すだけ (ADR 37)
  const dryRun = findFlag(argv, [DRY_RUN_FLAG]);

  // choose() は利用者のコードから呼ばれるので、端末はここで差し込む (ADR 36)
  setTerminal(
    options.terminal ??
      (options.targets === undefined
        ? processTerminal(options.env)
        : nonInteractiveTerminal())
  );

  const target = resolveTarget(table, argv);

  // コマンドが確定しない経路 (表は test/contract/routing.test.tsx)。
  // 明示的に --help を求められたら stdout + exit 0、
  // そうでなければ「使い方の誤り」なので stderr + exit 2
  if (target.kind !== 'command') {
    const group = target.kind === 'group' ? target.name : '';
    const commands = commandsUnder(table, group);

    if (target.kind === 'unknown') {
      const shown = await presentRootNotFound(options.notFound, {
        what: 'command',
        requested: target.requested,
        suggestion: target.suggestion?.split('/').join(' '),
        available: commands.map(display),
        program,
        argv,
        cwd,
      });
      await emit(<Stderr>{shown.node}</Stderr>, options, noColorFlag);
      return EXIT_CODE.usage;
    }

    const auto = (
      <CommandList
        program={program}
        commands={commands}
        group={group}
        descriptions={await describeCommands(table, commands)}
      />
    );
    const shown = await present(
      options.helps?.[group],
      { auto, program, command: display(group), argv, cwd },
      auto
    );
    await emit(
      helpRequested ? shown.node : <Stderr>{shown.node}</Stderr>,
      options,
      noColorFlag
    );
    return helpRequested ? EXIT_CODE.success : EXIT_CODE.usage;
  }

  const resolved = { name: target.name, rest: target.rest };

  try {
    const route = table[resolved.name];
    if (route === undefined) throw new CliError('Route not found');

    const layouts = route.layouts ?? [];
    /** layout.tsx で包んでから描画する。skipLayout なら包まない (ADR 7) */
    const withLayout = async (
      node: RenderInput,
      skipLayout: boolean
    ): Promise<number | undefined> => {
      const resolvedNode = (await node) as Renderable;
      const wrapped =
        skipLayout || layouts.length === 0
          ? resolvedNode
          : await applyLayouts(layouts, resolvedNode);
      return emit(wrapped, options, noColorFlag);
    };

    const spec = await loadArgvSpec(route.argv);

    if (helpRequested) {
      // stdin の宣言も使い方に出す (パイプが必要だと気づけるように)
      const auto = (
        <Help
          program={program}
          command={resolved.name}
          spec={spec}
          stdin={await loadStdinSpec(route.stdin)}
        />
      );
      const shown = await present(
        options.helps?.[resolved.name],
        {
          auto,
          program,
          command: display(resolved.name),
          argv: resolved.rest,
          cwd,
        },
        auto
      );
      // 組み込みの表示は layout に包まない。上書きは利用者の出力なので包む
      if (shown.overridden) await withLayout(shown.node, shown.skipLayout);
      else await emit(shown.node, options, noColorFlag);
      return EXIT_CODE.success;
    }

    const env = await loadEnv(options.envFile, options.env ?? process.env);

    // --json は data.tsx の結果をそのまま出す (ADR 25)
    if (jsonRequested && route.data === undefined) {
      const where = resolved.name === '' ? 'app' : `app/${resolved.name}`;
      throw new CliError(
        `--json needs data to serialize. Add ${where}/data.tsx`,
        { exitCode: EXIT_CODE.usage }
      );
    }

    const rest = withoutFlags(resolved.rest, [
      ...HELP_FLAGS,
      VERSION_FLAG,
      JSON_FLAG,
      DRY_RUN_FLAG,
    ]);
    let args: Record<string, unknown> = {};
    let commandOptions: Record<string, unknown> = {};

    // 宣言が無ければ検証もしない。生の argv だけがコマンドに渡る
    if (route.argv !== undefined) {
      const validated = validateArgv(spec, rest);
      if (!validated.ok) throw validationError(validated.issues);
      args = validated.value.args;
      commandOptions = validated.value.options;
    }

    // cmd.tsx が layout を外したいと宣言している場合に使う
    let skipLayout = false;
    // shell.tsx に渡す、cmd.tsx と同じ props (ADR 35)
    let shellContext: CommandContext | undefined;

    // middleware は検証済みの入力を受け取り、コマンドの実行を包む (ADR 11)
    const output = await runMiddleware(
      route.middlewares ?? [],
      async () => {
        const { command, skipLayout: commandSkipsLayout } = await loadCommand(
          route.cmd,
          resolved.name
        );
        skipLayout = commandSkipsLayout;
        // stdin の読み取りは middleware の内側 (ADR 11)。middleware が next() を
        // 呼ばずに打ち切れば、標準入力を消費せずに終われる
        const stdinSpec = await loadStdinSpec(route.stdin);
        const stdinValue =
          stdinSpec === undefined
            ? undefined
            : await readStdin(stdinSpec, options.stdin ?? processStdin());
        const base = {
          env,
          args,
          options: commandOptions,
          stdin: stdinValue,
          argv: rest,
          cwd,
          dryRun,
        };
        // データは表示より先に確定する。--json のときは view を呼ばない
        const data = await validateData(
          route.output,
          await loadData(route.data, base)
        );
        if (jsonRequested) {
          // 黙って欠けるより、どの経路が悪いかを言って止める (ADR 27)
          const problem = findNotSerializable(data);
          if (problem !== undefined) {
            throw new CliError(
              `${problem.path} cannot go into --json: ${problem.reason}`,
              { exitCode: EXIT_CODE.runtime }
            );
          }
          skipLayout = true;
          shellContext = { ...base, data };
          return (<Json value={data} />) as Renderable;
        }
        const context: CommandContext = { ...base, data };
        shellContext = context;
        return (await command(context)) as Renderable;
      },
      { env, args, options: commandOptions, argv: rest, cwd, dryRun }
    );

    const declared = await withLayout(output, skipLayout);
    const code = declared ?? EXIT_CODE.success;

    // shell.tsx は成功したときだけ親シェルに届ける (ADR 35)。失敗したのに
    // cd されると、エラーを読む前に足場が動く
    if (route.shell !== undefined && code === EXIT_CODE.success) {
      const file = (options.env ?? process.env)[SHELL_FILE_ENV];
      const declare = await loadShell(route.shell);
      const hosts = await resolveHosts(
        (await declare(shellContext as CommandContext)) as Renderable
      );
      const script = renderShell(hosts);
      if (file !== undefined && file !== '') {
        await Bun.write(file, script);
      } else if (script !== '') {
        // 関数が無いと黙って何も起きない。それが一番分かりにくいので言う
        const bin = options.bin ?? binaryName(program);
        await emit(
          <Stderr>
            <ErrorMessage
              message="Shell changes were not applied (no shell hook installed)"
              hints={[
                `Add to your rc file: eval "$(${bin} ${SHELL_COMMAND} zsh)"`,
              ]}
            />
          </Stderr>,
          options,
          noColorFlag
        );
      }
    }
    return code;
  } catch (error) {
    // 打ち切り (ADR 36)。エラーではないので何も出さない
    if (isInterruptSignal(error)) return error.exitCode;

    // help() は「そのままでは進めない」の合図 (ADR 30)。--help と同じものを
    // 組み立てるが、求められて出すのではないので stderr + exit 2 になる
    if (isHelpSignal(error)) {
      const route = table[resolved.name];
      const spec = await loadArgvSpec(route?.argv);
      const auto = (
        <Help
          program={program}
          command={resolved.name}
          spec={spec}
          stdin={await loadStdinSpec(route?.stdin)}
        />
      );
      const shown = await present(
        options.helps?.[resolved.name],
        {
          auto,
          program,
          command: display(resolved.name),
          argv: resolved.rest,
          cwd,
        },
        auto
      );
      await emit(
        <Stderr>
          {error.message === undefined ? null : (
            <ErrorMessage message={error.message} />
          )}
          {shown.node}
        </Stderr>,
        options,
        noColorFlag
      );
      return error.exitCode;
    }

    // notFound() は失敗ではなく「無かった」の合図 (ADR 30)。
    // 一番近い not-found.tsx に見せる
    if (isNotFoundSignal(error)) {
      const route = table[resolved.name];
      const props: NotFoundProps = {
        what: error.what,
        requested: error.requested,
        suggestion: error.suggestion,
        available: error.available,
        program,
        argv: resolved.rest,
        cwd,
      };
      if (jsonRequested) {
        await emit(
          <Stderr>
            <Json
              value={{
                error: {
                  code: 'not-found',
                  what: error.what,
                  requested: error.requested,
                  ...(error.suggestion === undefined
                    ? {}
                    : { suggestion: error.suggestion }),
                  exitCode: error.exitCode,
                },
              }}
            />
          </Stderr>,
          options,
          noColorFlag
        );
        return error.exitCode;
      }
      const shown = await presentInheritedNotFound(route?.notFounds, props);
      await emit(<Stderr>{shown.node}</Stderr>, options, noColorFlag);
      return error.exitCode;
    }

    const cliError = toCliError(error);

    // JSON を頼まれた相手に人間向けの文面を返すとパーサが壊れる (ADR 29)。
    // error.tsx は人が読むための表示なので、ここでは通さない
    if (jsonRequested) {
      await emit(
        <Stderr>
          <Json value={{ error: errorPayload(cliError) }} />
        </Stderr>,
        options,
        noColorFlag
      );
      return cliError.exitCode;
    }

    const route = table[resolved.name];
    // 近い error.tsx → 親の error.tsx → global-error.tsx → 組み込み
    // (順序は test/runtime/handle-error.test.tsx が固定している)
    const handlers = withGlobalError(route?.errors, options.globalError);
    const handled = await handleError({
      error: cliError,
      handlers,
      argv: resolved.rest,
      cwd,
      // error.tsx の出力も layout に包まれる (skipLayout で外せる)。
      // <Stderr> は layout の外側に付ける。失敗したときに layout の見出しが
      // stdout に出てしまうと、パイプ先が「成功した」と誤解するため
      emit: async (node, skipLayout) => {
        const resolvedNode = (await node) as Renderable;
        const layouts = route?.layouts ?? [];
        const wrapped =
          skipLayout || layouts.length === 0
            ? resolvedNode
            : await applyLayouts(layouts, resolvedNode);
        return emit(<Stderr>{wrapped}</Stderr>, options, noColorFlag);
      },
    });
    return handled.exitCode;
  }
}
