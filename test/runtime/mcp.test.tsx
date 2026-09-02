/**
 * MCP 輸出 (`__mcp`。ADR 33)。
 *
 * プロトコル: stdin に 1 行 1 リクエストの JSON-RPC 2.0、stdout に 1 行 1 応答。
 * ツール一覧は argv.tsx / output.tsx / ビルド時の副作用判定から導き、
 * 実行は `--json` と同じ経路を通る (ADR 25 / 29)。
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  annotationsFor,
  Arg,
  EFFECTS_META_KEY,
  Argv,
  Line,
  Option,
  Output,
  run,
  Stdin,
  Type,
  Version,
} from 'decopin-cli';
import type { EffectVerdicts, McpTool, RouteTable } from 'decopin-cli';

import { build } from '../../src/build/index.ts';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

function loader(value: unknown) {
  return async () => ({ default: value });
}

interface Response {
  jsonrpc: '2.0';
  id: unknown;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** リクエストを流し込み、応答を 1 行ずつ JSON として返す */
async function talk(
  table: RouteTable,
  requests: (object | string)[],
  options: { versionFile?: () => Promise<unknown> } = {}
) {
  const stdout = recorder();
  const stderr = recorder();
  const text = requests
    .map((request) =>
      typeof request === 'string' ? request : JSON.stringify(request)
    )
    .join('\n');
  const code = await run(table, {
    argv: ['__mcp'],
    env: {},
    program: 'cli',
    targets: { stdout, stderr },
    stdin: { isTTY: false, read: async () => text },
    ...options,
  });
  const responses = stdout.text
    .trim()
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as Response);
  return { code, responses, stderr: stderr.text };
}

function call(id: number, name: string, args: Record<string, unknown> = {}) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args },
  };
}

const NONE: EffectVerdicts = {
  'fs.read': 'none',
  'fs.write': 'none',
  network: 'none',
  'process.spawn': 'none',
  'process.mutate': 'none',
};

const table: RouteTable = {
  'user/show': {
    argv: loader(() => (
      <Argv description="Show one user.">
        <Arg name="name" type="string" required description="who" />
        <Option name="fields" description="which fields">
          <Type.Array>
            <Type.String />
          </Type.Array>
        </Option>
        <Option name="raw" type="boolean" default={false} />
      </Argv>
    )),
    data: loader(
      ({
        args,
        options,
      }: {
        args: { name: string };
        options: { fields?: string[]; raw: boolean };
      }) => ({
        name: args.name,
        fields: options.fields ?? [],
        raw: options.raw,
      })
    ),
    output: loader(() => (
      <Output>
        <Type.Object>
          <Type.Field name="name" required>
            <Type.String />
          </Type.Field>
          <Type.Field name="fields" required>
            <Type.Array>
              <Type.String />
            </Type.Array>
          </Type.Field>
          <Type.Field name="raw" required>
            <Type.Boolean />
          </Type.Field>
        </Type.Object>
      </Output>
    )),
    cmd: loader(() => <Line>unused</Line>),
    effects: NONE,
  },
  greet: {
    argv: loader(() => (
      <Argv description="Say hi.">
        <Arg name="name" type="string" default="you" />
        <Option name="times" type="number" default={1} />
      </Argv>
    )),
    cmd: loader(
      ({
        args,
        options,
      }: {
        args: { name: string };
        options: { times: number };
      }) => <Line>{`hi ${args.name} x${options.times}`}</Line>
    ),
    effects: { ...NONE, network: 'detected' },
  },
  count: {
    stdin: loader(() => <Stdin mode="lines" required />),
    data: loader(({ stdin }: { stdin: string[] }) => ({ lines: stdin.length })),
    cmd: loader(() => <Line>unused</Line>),
    effects: { ...NONE, 'fs.write': 'unknown' },
  },
  bare: {
    cmd: loader(() => <Line>bare</Line>),
  },
};

describe('handshake', () => {
  test('initialize は相手の改訂を受け、tools だけを名乗る', async () => {
    const { code, responses } = await talk(
      table,
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {} },
        },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { jsonrpc: '2.0', id: 2, method: 'ping' },
      ],
      { versionFile: loader(() => <Version version="1.2.3" />) }
    );
    expect(code).toBe(0);
    expect(responses).toEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'cli', version: '1.2.3' },
        },
      },
      { jsonrpc: '2.0', id: 2, result: {} },
    ]);
  });

  test('知らない改訂を求められたら、対応している最新を返す', async () => {
    const { responses } = await talk(table, [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '1999-01-01' },
      },
    ]);
    expect(responses[0]?.result?.protocolVersion).toBe('2025-11-25');
  });

  test('壊れた行・形の違うリクエスト・知らないメソッドは JSON-RPC のエラー', async () => {
    const { code, responses } = await talk(table, [
      'not json',
      { jsonrpc: '2.0', id: 7, method: 'resources/list' },
      { jsonrpc: '2.0', id: 8 },
    ]);
    expect(code).toBe(0);
    expect(responses.map((r) => [r.id, r.error?.code])).toEqual([
      [null, -32700],
      [7, -32601],
      [8, -32600],
    ]);
  });
});

describe('tools/list', () => {
  let tools: McpTool[];
  beforeAll(async () => {
    const { responses } = await talk(table, [
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    ]);
    tools = ((responses[0] as Response).result as { tools: McpTool[] }).tools;
  });

  test('全コマンドが出て、名前は / を _ にしたもの', () => {
    expect(tools.map((tool) => tool.name)).toEqual([
      'user_show',
      'greet',
      'count',
      'bare',
    ]);
  });

  test('inputSchema は argv.tsx、outputSchema は output.tsx から', () => {
    const show = tools.find((tool) => tool.name === 'user_show') as McpTool;
    expect(show.description).toBe('Show one user.');
    expect(show.inputSchema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string', description: 'who' },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'which fields',
        },
        raw: { type: 'boolean', default: false },
      },
      required: ['name'],
      additionalProperties: false,
    });
    expect(show.outputSchema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        fields: { type: 'array', items: { type: 'string' } },
        raw: { type: 'boolean' },
      },
      required: ['name', 'fields', 'raw'],
    });
  });

  test('宣言が無いコマンドも出る (引数なし・説明は実行の形)', () => {
    const bare = tools.find((tool) => tool.name === 'bare') as McpTool;
    expect(bare.description).toBe('Run `cli bare`');
    expect(bare.inputSchema).toEqual({
      type: 'object',
      properties: {},
      additionalProperties: false,
    });
    expect(bare.outputSchema).toBeUndefined();
    // effects が無い (手書きの表) なら hint も無い
    expect(bare.annotations).toBeUndefined();
  });

  test('annotations は副作用の判定から。unknown があれば何も言わない', () => {
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
    expect(byName.user_show?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
    // network に届くものは read-only とも closed-world とも言わない
    expect(byName.greet?.annotations).toBeUndefined();
    expect(byName.count?.annotations).toBeUndefined();
  });

  test('_meta には生の判定が載る。hint が無い理由はここで読める', () => {
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
    expect(byName.greet?._meta).toEqual({
      [EFFECTS_META_KEY]: { ...NONE, network: 'detected' },
    });
    expect(byName.count?._meta?.[EFFECTS_META_KEY]['fs.write']).toBe('unknown');
    // 手書きの表 (判定なし) なら _meta も無い
    expect(byName.bare?._meta).toBeUndefined();
  });
});

describe('annotationsFor の導出規則', () => {
  test('none のときだけ既定より安全側に動かす', () => {
    expect(annotationsFor(NONE)).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
    // 読むだけの fs は read-only を崩さない
    expect(annotationsFor({ ...NONE, 'fs.read': 'detected' })).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
    // 書くが外には出ない: closed world だけ言える
    expect(annotationsFor({ ...NONE, 'fs.write': 'detected' })).toEqual({
      openWorldHint: false,
    });
    expect(annotationsFor({ ...NONE, 'process.mutate': 'detected' })).toEqual({
      openWorldHint: false,
    });
    // spawn は任意のコマンドに届くので「外」
    expect(
      annotationsFor({ ...NONE, 'process.spawn': 'detected' })
    ).toBeUndefined();
    expect(annotationsFor({ ...NONE, network: 'detected' })).toBeUndefined();
  });

  test('unknown が 1 つでもあれば hint を出さない (既定 = 最も保守的)', () => {
    expect(annotationsFor({ ...NONE, 'fs.read': 'unknown' })).toBeUndefined();
    expect(annotationsFor(undefined)).toBeUndefined();
  });
});

describe('tools/call', () => {
  test('data.tsx があれば structuredContent と、その文面の text', async () => {
    const { responses } = await talk(table, [
      call(1, 'user_show', { name: 'alice', fields: ['a', 'b'], raw: true }),
    ]);
    const result = responses[0]?.result as {
      content: { type: string; text: string }[];
      structuredContent: unknown;
      isError?: boolean;
    };
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      name: 'alice',
      fields: ['a', 'b'],
      raw: true,
    });
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual(
      result.structuredContent
    );
  });

  test('data.tsx が無ければ表示そのものを text で返す', async () => {
    const { responses } = await talk(table, [
      call(1, 'greet', { name: '-dash', times: 2 }),
      call(2, 'greet'),
    ]);
    expect(responses[0]?.result).toEqual({
      content: [{ type: 'text', text: 'hi -dash x2' }],
    });
    expect(responses[1]?.result).toEqual({
      content: [{ type: 'text', text: 'hi you x1' }],
    });
  });

  test('stdin 引数はパイプの中身として渡る', async () => {
    const { responses } = await talk(table, [
      call(1, 'count', { stdin: 'a\nb\n\nc\n' }),
    ]);
    expect(responses[0]?.result?.structuredContent).toEqual({ lines: 4 });
  });

  test('入力の誤りはツールの失敗 (isError) で、--json と同じ形の文面', async () => {
    const { responses } = await talk(table, [
      call(1, 'user_show', {}),
      call(2, 'user_show', { name: 'x', bogus: 1 }),
      call(3, 'count', {}),
    ]);
    const texts = responses.map((response) => {
      const result = response.result as {
        isError?: boolean;
        content: { text: string }[];
      };
      expect(result.isError).toBe(true);
      return JSON.parse(result.content[0]?.text ?? '') as {
        error: { code: string; message: string; exitCode: number };
      };
    });
    expect(texts[0]?.error.code).toBe('validation');
    expect(texts[0]?.error.message).toBe('Missing required argument: name');
    expect(texts[1]?.error).toEqual({
      code: 'validation',
      message: 'Unknown argument: bogus',
      exitCode: 2,
    });
    expect(texts[2]?.error.code).toBe('stdin');
  });

  test('知らないツールはプロトコルのエラー (-32602)', async () => {
    const { responses } = await talk(table, [call(1, 'nope')]);
    expect(responses[0]?.error).toEqual({
      code: -32602,
      message: 'Unknown tool: nope',
    });
  });
});

describe('ビルドした app/ から', () => {
  let tools: McpTool[];
  beforeAll(async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'decopin-mcp-'));
    await build({ appDir: 'app', workDir: '.decopin', outDir: workspace });
    const generated = (await import('../../.decopin/routes.ts')) as {
      routes: RouteTable;
    };
    const { responses } = await talk(generated.routes, [
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    ]);
    tools = ((responses[0] as Response).result as { tools: McpTool[] }).tools;
  });

  test('副作用の判定が routes.ts を通って annotations になる', () => {
    const stats = tools.find((tool) => tool.name === 'stats') as McpTool;
    expect(stats.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
    expect(stats.outputSchema?.type).toBe('object');
  });

  test('全コマンドがツールになる', () => {
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'config',
      'count',
      'crash',
      'deploy',
      'go',
      'hello',
      'publish',
      'stats',
      'upper',
      'user_import',
      'user_list',
      'user_show',
    ]);
  });
});
