/**
 * シェル補完の候補を返す (`<bin> __complete -- <words...>`。ADR 21)。
 *
 * 情報源は help と同じで argv.tsx の宣言ただ 1 つ (ADR 8)。
 * 最後の語が「いま補完中の語」(空文字のこともある)、それより前が確定済みの語。
 * 候補は 1 行 1 つで `値<TAB>説明` (説明が無ければ値だけ)。
 *
 * 補完はユーザーの入力の途中で走るので、宣言が壊れていても決して投げない。
 * 候補が無ければ黙って空を返し、シェル側がファイル補完に落ちる。
 */
import { parseArgvSpec } from '../declaration/parse.ts';
import { resolveHosts } from '../declaration/resolve.ts';
import { EMPTY_ARGV_SPEC } from '../declaration/spec.ts';
import type { ArgvSpec, OptionSpec } from '../declaration/spec.ts';
import type { TypeNode } from '../declaration/type-node.ts';
import type { Renderable } from '../jsx/types.ts';
import type { RouteTable } from './router.ts';

/** 補完候補 1 つ。description は zsh の `_describe` の説明欄に出る */
export interface Candidate {
  value: string;
  description?: string;
}

/** 値そのものを提案できるのは enum だけ。array / oneOf は中身を見る */
function enumValues(type: TypeNode): string[] {
  if (type.kind === 'enum') return type.values;
  if (type.kind === 'array') return enumValues(type.item);
  if (type.kind === 'oneOf') return type.options.flatMap(enumValues);
  return [];
}

/** argv.tsx を評価する。壊れていても補完を止めない (空の宣言に落とす) */
async function loadSpec(
  loader: (() => Promise<unknown>) | undefined
): Promise<ArgvSpec> {
  if (loader === undefined) return EMPTY_ARGV_SPEC;
  try {
    const loaded = (await loader()) as { default?: unknown };
    const declare = loaded.default;
    if (typeof declare !== 'function') return EMPTY_ARGV_SPEC;
    const hosts = await resolveHosts(
      (declare as () => Renderable)() as Renderable
    );
    return parseArgvSpec(hosts);
  } catch {
    return EMPTY_ARGV_SPEC;
  }
}

/** `--name` / `-a` の形の語を宣言に引き当てる */
function findOption(spec: ArgvSpec, token: string): OptionSpec | undefined {
  if (token.startsWith('--')) {
    const name = token.slice(2);
    return spec.options.find((option) => option.name === name);
  }
  if (token.startsWith('-') && token.length === 2) {
    const alias = token.slice(1);
    return spec.options.find((option) => option.alias === alias);
  }
  return undefined;
}

/** コマンド確定後の語のうち、位置引数が何個すでに並んでいるか */
function positionalCount(spec: ArgvSpec, rest: readonly string[]): number {
  let count = 0;
  let terminated = false;
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index] as string;
    if (token === '--' && !terminated) {
      terminated = true;
      continue;
    }
    if (!terminated && token.startsWith('-')) {
      const option = findOption(spec, token);
      // 値を取るオプションは次の語を消費する
      if (option !== undefined && option.type.kind !== 'boolean') index += 1;
      continue;
    }
    count += 1;
  }
  return count;
}

/**
 * @param words シェルが渡す語の並び。最後の要素が補完中の語 (空文字も可)
 */
export async function completionCandidates(
  table: RouteTable,
  words: readonly string[]
): Promise<Candidate[]> {
  const current = words[words.length - 1] ?? '';
  const prior = words.slice(0, -1);

  // コマンド名になりうるのは、最初のオプションより前の語だけ (router.ts と同じ)
  const commandWords: string[] = [];
  for (const token of prior) {
    if (token.startsWith('-')) break;
    commandWords.push(token);
  }
  const sawOption = commandWords.length < prior.length;

  // 最長一致でコマンドを確定する。どれにも当たらなければルートコマンドに落ちる
  let matched: string | undefined;
  let consumed = 0;
  for (let length = commandWords.length; length > 0; length -= 1) {
    const name = commandWords.slice(0, length).join('/');
    if (Object.hasOwn(table, name)) {
      matched = name;
      consumed = length;
      break;
    }
  }
  if (matched === undefined && Object.hasOwn(table, '')) matched = '';

  const candidates: Candidate[] = [];

  // 1. サブコマンド。オプションが出た後はコマンド名を受け付けない (router.ts)
  if (!sawOption && !current.startsWith('-')) {
    const base = commandWords.join('/');
    const prefix = base === '' ? '' : `${base}/`;
    const seen = new Set<string>();
    for (const name of Object.keys(table)) {
      if (name === '' || !name.startsWith(prefix)) continue;
      const segment = name.slice(prefix.length).split('/')[0] as string;
      if (!segment.startsWith(current) || seen.has(segment)) continue;
      seen.add(segment);
      // 語がコマンドそのものなら説明を添える。グループなら名前だけ
      const route = table[`${prefix}${segment}`];
      const description =
        route === undefined
          ? undefined
          : (await loadSpec(route.argv)).description;
      candidates.push({ value: segment, description });
    }
    candidates.sort((a, b) => (a.value < b.value ? -1 : 1));
  }

  const route = matched === undefined ? undefined : table[matched];
  if (route === undefined) return candidates;

  const spec = await loadSpec(route.argv);
  const rest = prior.slice(consumed);
  const terminated = rest.includes('--');

  // 2. オプション名 (`-` を打ち始めたとき。`--` の後は位置引数なので出さない)
  if (current.startsWith('-') && !terminated) {
    const used = new Set(rest.filter((token) => token.startsWith('-')));
    for (const option of spec.options) {
      if (option.hidden) continue;
      const flag = `--${option.name}`;
      if (!flag.startsWith(current)) continue;
      const typed =
        used.has(flag) ||
        (option.alias !== undefined && used.has(`-${option.alias}`));
      // 繰り返せるのは array だけ。それ以外は一度打ったら候補から消す
      if (typed && option.type.kind !== 'array') continue;
      candidates.push({ value: flag, description: option.description });
    }
    if ('--help'.startsWith(current)) {
      candidates.push({ value: '--help', description: 'show usage' });
    }
    return candidates;
  }

  // 3. 直前の語が値を取るオプションなら、その値の候補
  const previous = terminated ? undefined : rest[rest.length - 1];
  const option =
    previous === undefined ? undefined : findOption(spec, previous);
  if (option !== undefined && option.type.kind !== 'boolean') {
    for (const value of enumValues(option.type)) {
      if (value.startsWith(current)) candidates.push({ value });
    }
    return candidates;
  }

  // 4. 位置引数。いま何番目かを数えて、その宣言の enum を出す
  const index = positionalCount(spec, rest);
  const arg = spec.args[Math.min(index, spec.args.length - 1)];
  if (arg !== undefined && (index < spec.args.length || arg.variadic)) {
    for (const value of enumValues(arg.type)) {
      if (value.startsWith(current)) candidates.push({ value });
    }
  }
  return candidates;
}

/** 候補をプロトコルの形 (1 行 1 候補、`値<TAB>説明`) にする */
export function formatCandidates(candidates: readonly Candidate[]): string {
  return candidates
    .map((candidate) =>
      candidate.description === undefined || candidate.description === ''
        ? `${candidate.value}\n`
        : `${candidate.value}\t${candidate.description}\n`
    )
    .join('');
}
