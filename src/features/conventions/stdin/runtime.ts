/**
 * 標準入力を読む (ADR 2)。
 *
 * 一番大事なのは「**宣言のないコマンドは stdin に触らない**」こと。
 * 端末で実行したときに入力待ちでフリーズする、という最頻出の事故を
 * 構造的に起こせないようにしている。
 */
import { resolveHosts } from '../../../core/jsx/resolve.ts';
import type { Renderable } from '../../../core/jsx/types.ts';
import { EXIT_CODE } from '../../../core/runtime/exit.ts';
import { toSchema, validateValue } from '../../../core/validation/schema.ts';
import type { GenericSchema } from '../../../core/validation/schema.ts';
import { CliError } from '../error/errors.ts';
import { parseStdinSpec } from './parse.ts';
import type { StdinSpec } from './spec.ts';

/** stdin.tsx を読み、実行時の標準入力宣言を組み立てる。 */
export async function loadStdinSpec(
  loader: (() => Promise<unknown>) | undefined,
  invalidDefaultExportError?: () => Error
): Promise<StdinSpec | undefined> {
  if (loader === undefined) return undefined;
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw (
      invalidDefaultExportError?.() ??
      new CliError(
        'stdin.tsx must default-export a function that returns <Stdin>'
      )
    );
  }
  const hosts = await resolveHosts(
    (declare as () => Renderable)() as Renderable
  );
  return parseStdinSpec(hosts);
}

/** 標準入力の口。テストから差し替えられるように関数で持つ */
export interface StdinSource {
  /** 端末に繋がっているか。パイプとリダイレクトはどちらも false */
  isTTY: boolean;
  read: () => Promise<string>;
  /**
   * 届いた順に少しずつ読む。MCP サーバ (ADR 33) は入力の終わりを待たずに
   * 応答するのでこちらを使う。無ければ read() の全文を 1 回で流したものとして扱う
   */
  stream?: () => AsyncIterable<Uint8Array | string>;
}

function stdinError(message: string, hints: string[] = []): CliError {
  return new CliError(message, {
    kind: 'stdin',
    exitCode: EXIT_CODE.usage,
    issues: [message, ...hints],
  });
}

/** 実際の process / Bun の標準入力 */
export function processStdin(): StdinSource {
  return {
    isTTY: process.stdin.isTTY === true,
    read: () => Bun.stdin.text(),
    stream: () => Bun.stdin.stream(),
  };
}

/**
 * @returns 宣言された mode に応じた値。読まない場合は undefined
 */
export async function readStdin(
  spec: StdinSpec,
  source: StdinSource
): Promise<unknown> {
  // 端末なら「何も渡されていない」。required でなければ読まずに諦める
  if (source.isTTY) {
    if (spec.required) {
      throw stdinError('This command requires input on stdin', [
        'Pipe something in, e.g. echo "..." | <command>',
      ]);
    }
    return undefined;
  }

  const raw = await source.read();

  if (spec.mode === 'text') {
    return spec.trim ? raw.trimEnd() : raw;
  }

  if (spec.mode === 'lines') {
    const lines = raw.split(/\r?\n/);
    // 末尾の改行で空行が 1 つ増えるので落とす
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw stdinError('stdin is not valid JSON', [
      error instanceof Error ? error.message : String(error),
    ]);
  }

  // schema エスケープハッチが優先。どちらも無ければ検証しない (ADR 9)
  const schema =
    spec.schema !== undefined
      ? (spec.schema as GenericSchema)
      : spec.type !== undefined
        ? toSchema(spec.type)
        : undefined;
  if (schema === undefined) return parsed;

  const validated = validateValue(schema, parsed);
  if (!validated.ok) {
    throw stdinError(
      'stdin does not match the declared structure',
      validated.messages
    );
  }
  return validated.value;
}
