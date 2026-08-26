/**
 * 生成された型の受け皿 (§4.8)。
 *
 * `decopin build` / `decopin dev` が `.decopin/types.d.ts` を書き、
 * module augmentation で {@link Routes} と {@link Env} を埋める。
 * JSX 式は型引数を運べないので、型はこの経路で配る (ADR 9)。
 */

/** 1 コマンド分の、検証後の入力の形 */
export interface RouteShape {
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  /** stdin.tsx が無ければ never (Phase 6) */
  stdin: unknown;
}

/**
 * 生成された `.decopin/types.d.ts` が埋める。
 * 未生成のうちは空なので、{@link CommandProps} は緩い型にフォールバックする。
 */
export interface Routes {}

/**
 * `app/env.tsx` から生成される (§4.7)。
 * 型の名前を `Env` にすると `<Env>` コンポーネントと衝突するので分けている
 */
export interface EnvVars {}

/** どのコマンドにも共通で渡るもの */
export interface CommandBase {
  /** コマンド名として消費されなかった生の argv */
  argv: readonly string[];
  cwd: string;
  /** `app/env.tsx` から検証済みの環境変数 (無ければ空) */
  env: EnvVars;
}

/** 型が未生成のときの緩いフォールバック */
export interface UntypedCommandProps extends CommandBase {
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  stdin: unknown;
}

/** 型が生成されていればコマンド名を、まだなら任意の文字列を受ける */
export type RouteName = [keyof Routes] extends [never] ? string : keyof Routes;

/**
 * `command.tsx` の props。
 *
 * ```tsx
 * export default function Command({ args, options }: CommandProps<'hello'>) {}
 * ```
 *
 * `decopin build` を通していない状態では `args` / `options` が
 * `Record<string, unknown>` になる。型が欲しければ `decopin dev` を回す。
 */
export type CommandProps<R extends RouteName> = R extends keyof Routes
  ? Routes[R] extends RouteShape
    ? Routes[R] & CommandBase
    : UntypedCommandProps
  : UntypedCommandProps;
