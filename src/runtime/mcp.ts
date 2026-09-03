/**
 * コマンドを MCP のツールとして出す (ADR 33)。
 *
 * `<bin> __mcp` で起動すると stdio で JSON-RPC 2.0 を話す。宣言は全部
 * 既にある: argv.tsx が `inputSchema`、output.tsx が `outputSchema`、
 * data.tsx の戻り値が `structuredContent`、ビルド時の副作用の判定が
 * `annotations`。ここでは変換だけをして、新しい宣言は要求しない。
 *
 * 公式 SDK は使わない。stdio で必要なのは改行区切りの JSON と 4 つの
 * メソッドだけで、SDK の 4.3MB / 17 依存 (express, zod, ajv ...) と釣り合わない。
 *
 * ツールの実行は `run()` をそのまま呼ぶ。引数を argv に戻して `--json` を
 * 付けるので、検証・middleware・output.tsx の検査・エラーの構造化 (ADR 29)
 * がすべて CLI と同じ経路を通る。MCP のためだけの経路を持たない
 */
import { toJsonSchema } from '../declaration/json-schema-core.ts';
import type { JsonSchema } from '../declaration/json-schema-core.ts';
import {
  argumentsSchema,
  STDIN_ARGUMENT,
} from '../features/conventions/argv/json-schema.ts';
import { loadArgvSpec } from '../features/conventions/argv/runtime.ts';
import type { ArgvSpec } from '../features/conventions/argv/spec.ts';
import type {
  RouteLoaders,
  RouteTable,
} from '../features/conventions/cmd/router.ts';
import { loadOutputSpec } from '../features/conventions/output/runtime.ts';
import type { OutputSpec } from '../features/conventions/output/spec.ts';
import { loadStdinSpec } from '../features/conventions/stdin/runtime.ts';
import type { StdinSpec } from '../features/conventions/stdin/spec.ts';
import { loadVersionSpec } from '../features/root-only/version/runtime.ts';
import type { EffectVerdicts } from '../types/effects.ts';
import { EXIT_CODE } from './exit.ts';
import { JSON_FLAG } from './reserved.ts';
import type { RunOptions } from './run.tsx';

/** 対応しているプロトコル改訂。相手が挙げたものが無ければ先頭を返す */
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'] as const;

/** JSON-RPC 2.0 のエラーコード */
const RPC = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
} as const;

/** MCP の ToolAnnotations のうち、宣言から導けるもの */
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * `_meta` に載せる生の判定のキー。仕様はサーバ固有のキーに接頭辞を求める
 * (`modelcontextprotocol` / `mcp` 始まりは予約)
 */
export const EFFECTS_META_KEY = 'decopin-cli/effects';

/** `tools/list` の 1 件 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: ToolAnnotations;
  /**
   * 生の判定 (ADR 32) をそのまま載せる。hint は `none` のときしか動かさない
   * ので、`unknown` で hint が消えた理由や、`detected` の内訳はここでしか
   * 読めない。ホストが自分の基準で判断できるように
   */
  _meta?: { [EFFECTS_META_KEY]: EffectVerdicts };
}

interface RpcRequest {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

type RpcResponse =
  | { jsonrpc: '2.0'; id: unknown; result: unknown }
  | {
      jsonrpc: '2.0';
      id: unknown;
      error: { code: number; message: string; data?: unknown };
    };

/** JSON-RPC の途中で投げる。応答の error になる */
class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * 副作用の判定を MCP のヒントにする。
 *
 * 既定 (readOnlyHint: false, destructiveHint: true, openWorldHint: true) が
 * 最も保守的なので、**`none` を確かめたときだけ安全側に動かす**。
 * `unknown` が 1 つでもあれば何も言わない (既定のまま = 保証しない)。
 *
 * - readOnlyHint: 書き込み・spawn・process の変更・network がすべて `none`。
 *   network は読みだけかもしれないが、POST と GET はモジュール粒度では
 *   区別できないので、書かない側に倒す (健全性を精度より優先。ADR 32)
 * - destructiveHint: 読むだけなら壊さない。書くものは既定 (true) のまま
 * - openWorldHint: network も spawn も `none` なら閉じた世界。spawn は任意の
 *   コマンドに届くので「外」に数える
 * - idempotentHint: 静的解析では言えないので導かない
 */
export function annotationsFor(
  verdicts: EffectVerdicts | undefined
): ToolAnnotations | undefined {
  if (verdicts === undefined) return undefined;
  if (Object.values(verdicts).includes('unknown')) return undefined;
  const none = (category: keyof EffectVerdicts) =>
    verdicts[category] === 'none';

  const closedWorld = none('network') && none('process.spawn');
  const readOnly = closedWorld && none('fs.write') && none('process.mutate');

  const hints: ToolAnnotations = {};
  if (readOnly) {
    hints.readOnlyHint = true;
    hints.destructiveHint = false;
  }
  if (closedWorld) hints.openWorldHint = false;
  return Object.keys(hints).length === 0 ? undefined : hints;
}

/**
 * ルート名をツール名にする。MCP は `^[a-zA-Z0-9_-]{1,64}$` を求めるので、
 * `/` は `_` に、その他の文字も `_` に落とす。ルートコマンドはプログラム名
 */
export function toolName(route: string, program: string): string {
  const raw = route === '' ? program : route.split('/').join('_');
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'root';
}

function invalidDefaultExport(expected: string): () => Error {
  return () => new Error(`${expected} must default-export a function`);
}

interface Declarations {
  argv: ArgvSpec;
  stdin?: StdinSpec;
  output?: OutputSpec;
}

async function loadDeclarations(route: RouteLoaders): Promise<Declarations> {
  return {
    argv: await loadArgvSpec(route.argv, invalidDefaultExport('argv.tsx')),
    stdin: await loadStdinSpec(route.stdin, invalidDefaultExport('stdin.tsx')),
    output: await loadOutputSpec(
      route.output,
      invalidDefaultExport('output.tsx')
    ),
  };
}

/** ツール一覧。宣言ファイルを読むので非同期 */
export async function listTools(
  table: RouteTable,
  program: string
): Promise<McpTool[]> {
  const tools: McpTool[] = [];
  for (const [name, route] of Object.entries(table)) {
    const { argv, stdin, output } = await loadDeclarations(route);
    const tool: McpTool = {
      name: toolName(name, program),
      description:
        argv.description ??
        `Run \`${[program, ...name.split('/')].filter(Boolean).join(' ')}\``,
      inputSchema: argumentsSchema(argv, stdin),
    };
    // valibot の schema prop は内省しないので、Type.* で書いたときだけ出る
    if (output?.type !== undefined)
      tool.outputSchema = toJsonSchema(output.type);
    const annotations = annotationsFor(route.effects);
    if (annotations !== undefined) tool.annotations = annotations;
    if (route.effects !== undefined) {
      tool._meta = { [EFFECTS_META_KEY]: route.effects };
    }
    tools.push(tool);
  }
  return tools;
}

/** 引数の値を argv の 1 トークンにする。Temporal / Date は ISO 文字列 */
function asToken(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

/**
 * ツールの引数を argv に戻す。
 *
 * オプションは `--name=value` の形 (値が `-` で始まっても壊れない)。
 * boolean は `--flag` / `--no-flag`。配列は繰り返し。位置引数は `--` の
 * 後ろに宣言順で置く。argv に戻すのは、検証と変換を CLI と同じ経路に
 * 通すため。ここで独自に検証すると 2 つの真実ができる
 */
export function toArgv(
  spec: ArgvSpec,
  args: Record<string, unknown>,
  hasStdin: boolean
): { argv: string[]; stdin?: string; issues: string[] } {
  const issues: string[] = [];
  const known = new Set<string>([
    ...spec.args.map((arg) => arg.name),
    ...spec.options.filter((option) => !option.hidden).map((o) => o.name),
    ...(hasStdin ? [STDIN_ARGUMENT] : []),
  ]);
  for (const key of Object.keys(args)) {
    if (!known.has(key)) issues.push(`Unknown argument: ${key}`);
  }

  const options: string[] = [];
  for (const option of spec.options) {
    if (option.hidden) continue;
    const value = args[option.name];
    if (value === undefined || value === null) continue;
    const isBoolean =
      option.type.kind === 'boolean' ||
      (option.type.kind === 'array' && option.type.item.kind === 'boolean');
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (isBoolean && typeof item === 'boolean') {
        options.push(item ? `--${option.name}` : `--no-${option.name}`);
      } else {
        options.push(`--${option.name}=${asToken(item)}`);
      }
    }
  }

  const positionals: string[] = [];
  let gap: string | undefined;
  for (const arg of spec.args) {
    const value = args[arg.name];
    if (value === undefined || value === null) {
      gap = arg.name;
      continue;
    }
    // 位置引数は順番でしか渡せない。前が抜けているのに後ろがあると表せない
    if (gap !== undefined) {
      issues.push(`Cannot pass "${arg.name}" without "${gap}"`);
      break;
    }
    if (arg.variadic) {
      positionals.push(
        ...(Array.isArray(value) ? value : [value]).map(asToken)
      );
    } else {
      positionals.push(asToken(value));
    }
  }

  const stdinValue = hasStdin ? args[STDIN_ARGUMENT] : undefined;
  const stdin =
    stdinValue === undefined || stdinValue === null
      ? undefined
      : typeof stdinValue === 'string'
        ? stdinValue
        : JSON.stringify(stdinValue);

  return {
    argv: [
      ...options,
      ...(positionals.length === 0 ? [] : ['--', ...positionals]),
    ],
    stdin,
    issues,
  };
}

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

/** `tools/call` の結果 */
export interface CallResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

type Runner = (table: RouteTable, options: RunOptions) => Promise<number>;

/**
 * ツールを 1 回実行する。
 *
 * data.tsx があるコマンドは `--json` で走らせ、stdout の JSON を
 * `structuredContent` に、その文面を text にも出す (仕様の後方互換の勧めどおり)。
 * 無いコマンドは表示そのもの (色なし) を text で返す。
 *
 * 失敗は `isError: true`。入力の誤りはプロトコルのエラーではなく
 * ツールの失敗として返す (仕様: モデルが読んで直せるように)。`--json` の
 * 経路なら stderr は ADR 29 の構造化された JSON なので、そのまま text に載せる
 */
export async function callTool(
  table: RouteTable,
  options: RunOptions,
  run: Runner,
  name: string,
  args: Record<string, unknown>
): Promise<CallResult> {
  const program = options.program ?? 'cli';
  const entry = Object.entries(table).find(
    ([route]) => toolName(route, program) === name
  );
  if (entry === undefined) {
    throw new RpcError(RPC.invalidParams, `Unknown tool: ${name}`);
  }
  const [routeName, route] = entry;
  const { argv: spec, stdin: stdinSpec } = await loadDeclarations(route);
  const converted = toArgv(spec, args, stdinSpec !== undefined);
  if (converted.issues.length > 0) {
    const payload = {
      error: {
        code: 'validation',
        message: converted.issues[0],
        exitCode: EXIT_CODE.usage,
        ...(converted.issues.length > 1 ? { issues: converted.issues } : {}),
      },
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      isError: true,
    };
  }

  const structured = route.data !== undefined;
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    ...options,
    argv: [
      ...routeName.split('/').filter(Boolean),
      ...(structured ? [JSON_FLAG] : []),
      ...converted.argv,
    ],
    targets: { stdout, stderr },
    isTTY: { stdout: false, stderr: false },
    stdin:
      converted.stdin === undefined
        ? { isTTY: true, read: async () => '' }
        : { isTTY: false, read: async () => converted.stdin as string },
  });

  if (code !== EXIT_CODE.success) {
    const text = stderr.text.trim() || stdout.text.trim() || `exit ${code}`;
    return { content: [{ type: 'text', text }], isError: true };
  }
  const text = stdout.text.trimEnd();
  if (!structured) return { content: [{ type: 'text', text }] };
  return {
    content: [{ type: 'text', text }],
    structuredContent: JSON.parse(text) as unknown,
  };
}

/** version.tsx があれば serverInfo に載せる */
async function serverVersion(options: RunOptions): Promise<string> {
  if (options.versionFile === undefined) return '0.0.0';
  try {
    return (
      await loadVersionSpec(
        options.versionFile,
        invalidDefaultExport('version.tsx')
      )
    ).version;
  } catch {
    return '0.0.0';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 1 リクエストを処理して result を返す。通知 (id 無し) は呼ばれない */
async function dispatch(
  request: RpcRequest,
  table: RouteTable,
  options: RunOptions,
  run: Runner
): Promise<unknown> {
  const params = isRecord(request.params) ? request.params : {};
  switch (request.method) {
    case 'initialize': {
      const asked = params.protocolVersion;
      const protocolVersion = (PROTOCOL_VERSIONS as readonly string[]).includes(
        asked as string
      )
        ? (asked as string)
        : PROTOCOL_VERSIONS[0];
      return {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: {
          name: options.program ?? 'cli',
          version: await serverVersion(options),
        },
      };
    }
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: await listTools(table, options.program ?? 'cli') };
    case 'tools/call': {
      if (typeof params.name !== 'string') {
        throw new RpcError(RPC.invalidParams, 'tools/call needs params.name');
      }
      const args = isRecord(params.arguments) ? params.arguments : {};
      return callTool(table, options, run, params.name, args);
    }
    default:
      throw new RpcError(
        RPC.methodNotFound,
        `Method not found: ${String(request.method)}`
      );
  }
}

/** 改行区切りで届く入力を 1 行ずつにする。最後の行は改行が無くても流す */
async function* lines(
  source: AsyncIterable<Uint8Array | string>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let rest = '';
  for await (const chunk of source) {
    rest +=
      typeof chunk === 'string'
        ? chunk
        : decoder.decode(chunk, { stream: true });
    let index = rest.indexOf('\n');
    while (index !== -1) {
      yield rest.slice(0, index);
      rest = rest.slice(index + 1);
      index = rest.indexOf('\n');
    }
  }
  rest += decoder.decode();
  if (rest !== '') yield rest;
}

/**
 * stdio の MCP サーバ。stdin が閉じるまで 1 行 1 リクエストで応答し、
 * 閉じたら成功で終わる。
 *
 * リクエストは届いた順に 1 つずつ処理する。ツールの実行はプロセスの
 * cwd や stdin を共有するので、並べて走らせると互いの前提を壊しうる
 */
export async function serveMcp(
  table: RouteTable,
  options: RunOptions,
  run: Runner,
  input: AsyncIterable<Uint8Array | string>,
  output: { write: (chunk: string) => unknown }
): Promise<number> {
  const respond = (response: RpcResponse) => {
    output.write(`${JSON.stringify(response)}\n`);
  };

  for await (const line of lines(input)) {
    if (line.trim() === '') continue;
    let request: RpcRequest;
    try {
      request = JSON.parse(line) as RpcRequest;
    } catch {
      respond({
        jsonrpc: '2.0',
        id: null,
        error: { code: RPC.parseError, message: 'Parse error' },
      });
      continue;
    }
    if (!isRecord(request) || typeof request.method !== 'string') {
      respond({
        jsonrpc: '2.0',
        id: isRecord(request) ? (request.id ?? null) : null,
        error: { code: RPC.invalidRequest, message: 'Invalid Request' },
      });
      continue;
    }
    // 通知には応答しない (notifications/initialized など)
    if (request.id === undefined) continue;

    try {
      const result = await dispatch(request, table, options, run);
      respond({ jsonrpc: '2.0', id: request.id, result });
    } catch (error) {
      const rpc =
        error instanceof RpcError
          ? error
          : new RpcError(
              -32603,
              error instanceof Error ? error.message : String(error)
            );
      respond({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: rpc.code, message: rpc.message },
      });
    }
  }
  return EXIT_CODE.success;
}
