import type { ArgSpec, ArgvSpec, OptionSpec } from '../declaration/spec.ts';
import type { TypeNode } from '../declaration/type-node.ts';
/**
 * argv を宣言 (§4.1) に照らして検証し、コマンドに渡す値を作る。
 *
 * 流れ: トークン分解 → 型に合わせて変換 → valibot で検証。
 * 失敗はすべて集めてから返す (1 つ直すたびに実行し直す手間を減らすため)。
 */
import { coerce, coerceAll } from './coerce.ts';
import { toSchema, validateValue, withDefault } from './schema.ts';
import { tokenize } from './tokens.ts';

export interface ValidatedArgv {
  args: Record<string, unknown>;
  options: Record<string, unknown>;
}

export type ValidateResult =
  | { ok: true; value: ValidatedArgv }
  | { ok: false; issues: string[] };

/** 「省略できるか」を反映したスキーマを作る (§4.1 の存在と型の分離) */
function presenceSchema(
  type: TypeNode,
  required: boolean,
  defaultValue: unknown
) {
  const schema = toSchema(type);
  return required ? schema : withDefault(schema, defaultValue);
}

function label(option: OptionSpec): string {
  return `--${option.name}`;
}

export function validateArgv(
  spec: ArgvSpec,
  tokens: readonly string[]
): ValidateResult {
  const parsed = tokenize(tokens, spec);
  const issues: string[] = [
    ...parsed.unknownOptions.map((name) => `Unknown option: ${name}`),
    ...parsed.errors,
  ];

  const options: Record<string, unknown> = {};
  for (const option of spec.options) {
    const raws = parsed.options.get(option.name);
    const schema = presenceSchema(
      option.type,
      option.required,
      option.defaultValue
    );

    if (raws === undefined) {
      if (option.required) {
        issues.push(`Missing required option: ${label(option)}`);
        continue;
      }
      const validated = validateValue(schema, undefined);
      if (validated.ok) options[option.name] = validated.value;
      continue;
    }

    const coerced = coerceAll(option.type, raws);
    if (!coerced.ok) {
      issues.push(`${label(option)}: ${coerced.message}`);
      continue;
    }
    const validated = validateValue(schema, coerced.value);
    if (!validated.ok) {
      issues.push(
        ...validated.messages.map((message) => `${label(option)}: ${message}`)
      );
      continue;
    }
    options[option.name] = validated.value;
  }

  const args = assignArgs(spec.args, parsed.positionals, issues);

  return issues.length === 0
    ? { ok: true, value: { args, options } }
    : { ok: false, issues };
}

/** 位置引数を宣言順に割り当てる。variadic は残り全部を受け取る */
function assignArgs(
  specs: ArgSpec[],
  positionals: string[],
  issues: string[]
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  let cursor = 0;

  for (const arg of specs) {
    if (arg.variadic) {
      const raws = positionals.slice(cursor);
      cursor = positionals.length;
      const values: unknown[] = [];
      let failed = false;
      for (const raw of raws) {
        const coerced = coerce(arg.type, raw);
        if (!coerced.ok) {
          issues.push(`${arg.name}: ${coerced.message}`);
          failed = true;
          break;
        }
        values.push(coerced.value);
      }
      if (failed) continue;
      if (arg.required && values.length === 0) {
        issues.push(`Missing required argument: ${arg.name}`);
        continue;
      }
      const schema = presenceSchema(
        { kind: 'array', item: arg.type },
        arg.required,
        arg.defaultValue
      );
      const validated = validateValue(
        schema,
        values.length === 0 ? undefined : values
      );
      if (validated.ok) args[arg.name] = validated.value;
      else {
        issues.push(
          ...validated.messages.map((message) => `${arg.name}: ${message}`)
        );
      }
      continue;
    }

    const raw = positionals[cursor];
    cursor += 1;
    const schema = presenceSchema(arg.type, arg.required, arg.defaultValue);

    if (raw === undefined) {
      if (arg.required) {
        issues.push(`Missing required argument: ${arg.name}`);
        continue;
      }
      const validated = validateValue(schema, undefined);
      if (validated.ok) args[arg.name] = validated.value;
      continue;
    }

    const coerced = coerce(arg.type, raw);
    if (!coerced.ok) {
      issues.push(`${arg.name}: ${coerced.message}`);
      continue;
    }
    const validated = validateValue(schema, coerced.value);
    if (validated.ok) args[arg.name] = validated.value;
    else {
      issues.push(
        ...validated.messages.map((message) => `${arg.name}: ${message}`)
      );
    }
  }

  for (const extra of positionals.slice(cursor)) {
    issues.push(`Unexpected argument: ${extra}`);
  }

  return args;
}
