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
import { takesValue, tokenize } from '../validation/tokens.ts';
import type { RouteTable } from './router.ts';

/**
 * 「いま補完中の語がどの位置に落ちるか」を本物のトークナイザに聞くための印。
 * 実際の入力には現れない文字を使う。独自に解析すると、単独の `-` (位置引数)、
 * `--name=value`、束ねた alias (`-lv`)、`--no-flag` で実行時の解釈とずれる
 */
const PROBE = '\u0000';

/** 補完候補 1 つ。description は zsh の `_describe` の説明欄に出る */
export interface Candidate {
  value: string;
  description?: string;
}

/**
 * `complete.tsx` が受け取るもの (ADR 38)。
 *
 * 値が実行時にしか決まらない (クラスタ名、ブランチ名 ...) ものは宣言に書けない。
 * Tab のたびにこの関数が呼ばれ、返した候補が `Type.Enum` の値と同じ扱いになる
 */
export interface CompleteProps {
  /** 補完しようとしている位置引数 / オプションの名前 */
  name: string;
  /** 打ちかけの文字。候補の前方一致は枠組みがやるので、全部返してよい */
  partial: string;
  /** ここまでに打たれたオプション (生の文字列。array は並び、boolean は true) */
  options: Record<string, readonly (string | true)[]>;
  /** ここまでに打たれた位置引数 (生の文字列) */
  args: readonly string[];
  env: Record<string, string | undefined>;
  cwd: string;
}

/** complete.tsx の default export の形。文字列だけでも、説明つきでもよい */
export type Completer = (
  props: CompleteProps
) => Promise<readonly (string | Candidate)[]> | readonly (string | Candidate)[];

/** 補完はユーザーの打鍵を待たせるので、これ以上かかる候補は諦める */
const COMPLETER_TIMEOUT_MS = 5000;

/**
 * complete.tsx を呼ぶ。壊れていても、遅くても、補完を止めない (空を返す)。
 * 候補の前方一致はここで揃える (宣言の enum と同じ振る舞いにするため)
 */
async function dynamicValues(
  loader: (() => Promise<unknown>) | undefined,
  props: CompleteProps
): Promise<Candidate[]> {
  if (loader === undefined) return [];
  try {
    const loaded = (await loader()) as { default?: unknown };
    const completer = loaded.default;
    if (typeof completer !== 'function') return [];
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('completion timed out')),
        COMPLETER_TIMEOUT_MS
      ).unref?.();
    });
    const result = await Promise.race([
      Promise.resolve((completer as Completer)(props)),
      timeout,
    ]);
    return result
      .map((item) => (typeof item === 'string' ? { value: item } : item))
      .filter((item) => item.value.startsWith(props.partial));
  } catch {
    return [];
  }
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

/**
 * @param words シェルが渡す語の並び。最後の要素が補完中の語 (空文字も可)
 */
export async function completionCandidates(
  table: RouteTable,
  words: readonly string[],
  context: { env?: Record<string, string | undefined>; cwd?: string } = {}
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

  // 確定済みの語の解釈は実行時と同じトークナイザに任せる (tokens.ts)。
  // probe は「いま補完中の語」を差し込んだときにどこへ落ちるかを見る
  const typed = tokenize(rest, spec);
  const probe = tokenize([...rest, PROBE], spec);

  // 実行時に決まる候補 (complete.tsx)。打った分は生の文字列で渡す
  const completeProps = (name: string, partial: string): CompleteProps => ({
    name,
    partial,
    options: Object.fromEntries(typed.options),
    args: typed.positionals,
    env: context.env ?? process.env,
    cwd: context.cwd ?? process.cwd(),
  });

  // 2. 直前の語が値を待っているオプションなら、その値の候補
  const pending = spec.options.find((option) =>
    probe.options.get(option.name)?.includes(PROBE)
  );
  if (pending !== undefined) {
    for (const value of enumValues(pending.type)) {
      if (value.startsWith(current)) candidates.push({ value });
    }
    candidates.push(
      ...(await dynamicValues(
        route.complete,
        completeProps(pending.name, current)
      ))
    );
    return candidates;
  }

  const terminated = rest.includes('--');
  if (current.startsWith('-') && !terminated) {
    // 3. `--name=` の形は、= の後ろを値として補完する (語全体を置き換えるので
    //    候補も `--name=値` の形で返す)
    const equals = current.indexOf('=');
    if (equals !== -1) {
      const flag = current.slice(0, equals);
      const partial = current.slice(equals + 1);
      const option = findOption(spec, flag);
      if (option !== undefined && takesValue(option)) {
        for (const value of enumValues(option.type)) {
          if (value.startsWith(partial)) {
            candidates.push({ value: `${flag}=${value}` });
          }
        }
        for (const item of await dynamicValues(
          route.complete,
          completeProps(option.name, partial)
        )) {
          candidates.push({ ...item, value: `${flag}=${item.value}` });
        }
      }
      return candidates;
    }

    // 4. オプション名。打ったものは消す (`--name=value` や `-a` の形も
    //    トークナイザが long 名に寄せてくれる)。繰り返せる array は残す
    for (const option of spec.options) {
      if (option.hidden) continue;
      const flag = `--${option.name}`;
      if (!flag.startsWith(current)) continue;
      if (typed.options.has(option.name) && option.type.kind !== 'array') {
        continue;
      }
      candidates.push({ value: flag, description: option.description });
    }
    if ('--help'.startsWith(current)) {
      candidates.push({ value: '--help', description: 'show usage' });
    }
    return candidates;
  }

  // 5. 位置引数。probe が何番目の位置引数に落ちたかで宣言を選ぶ
  const index = probe.positionals.indexOf(PROBE);
  if (index === -1) return candidates;
  const arg = spec.args[Math.min(index, spec.args.length - 1)];
  if (arg !== undefined && (index < spec.args.length || arg.variadic)) {
    for (const value of enumValues(arg.type)) {
      if (value.startsWith(current)) candidates.push({ value });
    }
    candidates.push(
      ...(await dynamicValues(route.complete, completeProps(arg.name, current)))
    );
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
