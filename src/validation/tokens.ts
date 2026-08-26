/**
 * argv のトークンを「位置引数」と「オプション」に分ける。
 *
 * 対応する書き方:
 *   --name value / --name=value / -a value / -a=value
 *   --flag (boolean は値を取らない) / --no-flag (boolean を false にする)
 *   -- 以降はすべて位置引数として扱う
 *
 * v1 では短縮形の結合 (`-abc`) は解釈しない。未知のオプションとして扱う。
 */
import type { ArgvSpec, OptionSpec } from '../declaration/spec.ts';
import type { RawValue } from './coerce.ts';

export interface TokenizeResult {
  positionals: string[];
  /** オプション名 (long) → 現れた順の値 */
  options: Map<string, RawValue[]>;
  /** 宣言されていないオプション */
  unknownOptions: string[];
  /** 値が足りないなどの、形の誤り */
  errors: string[];
}

interface Lookup {
  byName: Map<string, OptionSpec>;
  byAlias: Map<string, OptionSpec>;
}

function buildLookup(spec: ArgvSpec): Lookup {
  const byName = new Map<string, OptionSpec>();
  const byAlias = new Map<string, OptionSpec>();
  for (const option of spec.options) {
    byName.set(option.name, option);
    if (option.alias !== undefined) byAlias.set(option.alias, option);
  }
  return { byName, byAlias };
}

/** boolean は `--flag` だけで真になるので、次のトークンを値として食わない */
function takesValue(option: OptionSpec): boolean {
  if (option.type.kind === 'boolean') return false;
  if (option.type.kind === 'array' && option.type.item.kind === 'boolean') {
    return false;
  }
  return true;
}

function push(
  options: Map<string, RawValue[]>,
  name: string,
  value: RawValue
): void {
  const current = options.get(name);
  if (current === undefined) options.set(name, [value]);
  else current.push(value);
}

export function tokenize(
  tokens: readonly string[],
  spec: ArgvSpec
): TokenizeResult {
  const { byName, byAlias } = buildLookup(spec);
  const result: TokenizeResult = {
    positionals: [],
    options: new Map(),
    unknownOptions: [],
    errors: [],
  };

  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index] as string;
    index += 1;

    // `--` 以降はすべて位置引数
    if (token === '--') {
      result.positionals.push(...tokens.slice(index));
      break;
    }

    if (!token.startsWith('-') || token === '-') {
      result.positionals.push(token);
      continue;
    }

    const isLong = token.startsWith('--');
    const body = isLong ? token.slice(2) : token.slice(1);
    const equals = body.indexOf('=');
    const key = equals === -1 ? body : body.slice(0, equals);
    const inlineValue = equals === -1 ? undefined : body.slice(equals + 1);

    // `--no-flag` で boolean を false にする
    if (isLong && inlineValue === undefined && key.startsWith('no-')) {
      const negated = byName.get(key.slice(3));
      if (negated !== undefined && !takesValue(negated)) {
        push(result.options, negated.name, 'false');
        continue;
      }
    }

    const option = isLong ? byName.get(key) : byAlias.get(key);
    if (option === undefined) {
      result.unknownOptions.push(isLong ? `--${key}` : `-${key}`);
      continue;
    }

    if (!takesValue(option)) {
      push(result.options, option.name, inlineValue ?? true);
      continue;
    }

    if (inlineValue !== undefined) {
      push(result.options, option.name, inlineValue);
      continue;
    }

    const next = tokens[index];
    if (next === undefined) {
      result.errors.push(`--${option.name} requires a value`);
      continue;
    }
    index += 1;
    push(result.options, option.name, next);
  }

  return result;
}
