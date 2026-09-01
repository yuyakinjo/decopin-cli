/**
 * 実行ライフサイクル。argv の解決から書き出しまでを 1 本で通す。
 *
 * 通っているのは 1 (ルート解決) → 2 (--help / --version) → 4 (argv 検証)
 * → 7 (command 実行) → 9 (書き出し) → 10 (終了コード)。
 * env (3)、middleware (5)、stdin (6)、error.tsx は後続フェーズで足す。
 */
import { Json, Line, Stderr } from '../components/index.ts';
import { parseArgvSpec } from '../declaration/parse.ts';
import {
  parseEnvSpec,
  parseOutputSpec,
  parseStdinSpec,
  parseVersionSpec,
} from '../declaration/parse.ts';
import { resolveHosts } from '../declaration/resolve.ts';
import { EMPTY_ARGV_SPEC } from '../declaration/spec.ts';
import type { ArgvSpec, StdinSpec } from '../declaration/spec.ts';
import type { Renderable, RenderInput } from '../jsx/types.ts';
import { present as presentDocument } from '../renderer/present.ts';
import type { WriteTargets } from '../renderer/writer.ts';
import { validateEnv } from '../validation/env.ts';
import { toSchema, validateValue } from '../validation/schema.ts';
import { validateArgv } from '../validation/validate.ts';
import { completionCandidates, formatCandidates } from './complete.ts';
import { CliError, validationError } from './errors.ts';
import { EXIT_CODE } from './exit.ts';
import { handleError, toCliError } from './handle-error.tsx';
import { CommandList, Help } from './help.tsx';
import { applyLayouts } from './layout.tsx';
import { ErrorMessage } from './messages.tsx';
import { runMiddleware } from './middleware.ts';
import { NotFound } from './not-found.tsx';
import type { NotFoundProps } from './not-found.tsx';
import { present } from './override.ts';
import {
  COMPLETE_COMMAND,
  HELP_FLAGS,
  JSON_FLAG,
  NO_COLOR_FLAG,
  VERSION_FLAG,
} from './reserved.ts';
import { commandsUnder, resolveTarget } from './router.ts';
import type { RouteTable } from './router.ts';
import { findNotSerializable } from './serializable.ts';
import { isHelpSignal, isNotFoundSignal } from './signals.ts';
import { processStdin, readStdin } from './stdin-reader.ts';
import type { StdinSource } from './stdin-reader.ts';

/** Phase 3 で command.tsx が受け取るもの。型は Phase 3.5 の codegen で配る */
export interface CommandContext {
  /** 検証済みの環境変数 */
  env: Record<string, unknown>;
  /** 検証済みの位置引数 */
  args: Record<string, unknown>;
  /** 検証済みのオプション */
  options: Record<string, unknown>;
  /** stdin.tsx があれば読み取った値。無ければ undefined */
  stdin: unknown;
  /** data.tsx の戻り値。無ければ undefined (ADR 25) */
  data: unknown;
  /** コマンド名として消費されなかった生の argv */
  argv: readonly string[];
  cwd: string;
}

/**
 * `run()` に渡すもの。生成された `entry.ts` が規約ファイルの
 * 読み込み関数を詰めて呼ぶ
 */
export interface RunOptions {
  /** 省略時は process.argv.slice(2) */
  argv?: string[];
  /** help に出す実行ファイル名 */
  program?: string;
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

/** 宣言ファイルの default export を呼んで、組み込みノードの並びにする */
async function declaredHosts(loader: () => Promise<unknown>, expected: string) {
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw new CliError(
      `${expected} must default-export a function that returns <${expected}>`
    );
  }
  return resolveHosts((declare as () => Renderable)() as Renderable);
}

/** stdin.tsx を読んで宣言を組み立てる。無ければ undefined */
async function loadStdinSpec(
  loader: (() => Promise<unknown>) | undefined
): Promise<StdinSpec | undefined> {
  if (loader === undefined) return undefined;
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw new CliError(
      'stdin.tsx must default-export a function that returns <Stdin>'
    );
  }
  const hosts = await resolveHosts(
    (declare as () => Renderable)() as Renderable
  );
  return parseStdinSpec(hosts);
}

/**
 * output.tsx があれば data を検証する (ADR 28)。
 *
 * 自分のコードが返した値でも、外の API から来たものは型の宣言どおりとは
 * 限らない。境界で確かめておくと、壊れた形のまま表示や --json に流れない
 */
async function validateData(
  loader: (() => Promise<unknown>) | undefined,
  data: unknown
): Promise<unknown> {
  if (loader === undefined) return data;
  const spec = parseOutputSpec(await declaredHosts(loader, 'Output'));
  const schema =
    spec.schema !== undefined
      ? (spec.schema as Parameters<typeof validateValue>[0])
      : toSchema(spec.type as NonNullable<typeof spec.type>);
  const result = validateValue(schema, data);
  if (!result.ok) {
    throw new CliError(`data does not match output.tsx`, {
      kind: 'validation',
      exitCode: EXIT_CODE.runtime,
      issues: result.messages,
    });
  }
  return result.value;
}

/** data.tsx を呼んでデータを作る。無ければ undefined (ADR 25) */
async function loadData(
  loader: (() => Promise<unknown>) | undefined,
  context: Omit<CommandContext, 'data'>
): Promise<unknown> {
  if (loader === undefined) return undefined;
  const loaded = (await loader()) as { default?: unknown };
  const provide = loaded.default;
  if (typeof provide !== 'function') {
    throw new CliError('data.tsx must default-export a function');
  }
  return await (provide as (props: Omit<CommandContext, 'data'>) => unknown)(
    context
  );
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
      const text = formatCandidates(await completionCandidates(table, words));
      if (text !== '') out.write(text);
    } catch {
      // 候補なし扱い。シェル側がファイル補完に落ちる
    }
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
      const spec = parseVersionSpec(
        await declaredHosts(options.versionFile, 'Version')
      );
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

  const target = resolveTarget(table, argv);

  // コマンドが確定しない経路 (表は test/contract/routing.test.tsx)。
  // 明示的に --help を求められたら stdout + exit 0、
  // そうでなければ「使い方の誤り」なので stderr + exit 2
  if (target.kind !== 'command') {
    const group = target.kind === 'group' ? target.name : '';
    const commands = commandsUnder(table, group);

    if (target.kind === 'unknown') {
      const shown = await present(
        options.notFound,
        {
          what: 'command',
          requested: target.requested,
          suggestion: target.suggestion?.split('/').join(' '),
          available: commands.map(display),
          program,
          argv,
          cwd,
        },
        <NotFound
          what="command"
          requested={target.requested}
          suggestion={target.suggestion?.split('/').join(' ')}
          available={commands.map(display)}
          program={program}
          argv={argv}
          cwd={cwd}
        />
      );
      await emit(<Stderr>{shown.node}</Stderr>, options, noColorFlag);
      return EXIT_CODE.usage;
    }

    const auto = (
      <CommandList program={program} commands={commands} group={group} />
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

    // env.tsx は起動時に一度だけ検証する
    let env: Record<string, unknown> = {};
    if (options.envFile !== undefined) {
      const envSpec = parseEnvSpec(await declaredHosts(options.envFile, 'Env'));
      const validated = validateEnv(envSpec, options.env ?? process.env);
      if (!validated.ok) {
        throw new CliError(validated.issues[0] ?? 'Invalid environment', {
          kind: 'env',
          exitCode: EXIT_CODE.usage,
          issues: validated.issues,
        });
      }
      env = validated.value;
    }

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

    // command.tsx が layout を外したいと宣言している場合に使う
    let skipLayout = false;

    // middleware は検証済みの入力を受け取り、コマンドの実行を包む (ADR 11)
    const output = await runMiddleware(
      route.middlewares ?? [],
      async () => {
        const loaded = (await route.command()) as {
          default?: unknown;
          skipLayout?: unknown;
        };
        const command = loaded.default;
        if (typeof command !== 'function') {
          throw new CliError(
            `Command "${resolved.name}" must default-export a component`
          );
        }
        skipLayout = loaded.skipLayout === true;
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
          return (<Json value={data} />) as Renderable;
        }
        const context: CommandContext = { ...base, data };
        return (await (command as (props: CommandContext) => RenderInput)(
          context
        )) as Renderable;
      },
      { env, args, options: commandOptions, argv: rest, cwd }
    );

    const declared = await withLayout(output, skipLayout);
    return declared ?? EXIT_CODE.success;
  } catch (error) {
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
      const shown = await present(
        route?.notFounds?.[0],
        props,
        <NotFound {...props} />
      );
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
    const handlers = [
      ...(route?.errors ?? []),
      ...(options.globalError === undefined ? [] : [options.globalError]),
    ];
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
