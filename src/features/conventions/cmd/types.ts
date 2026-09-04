/**
 * 生成されたコマンド型の受け皿 (ADR 9)。
 *
 * `decopin build` / `decopin dev` が `.decopin/types.d.ts` を書き、
 * module augmentation で {@link Routes} を埋める。JSX 式は型引数を
 * 運べないので、型はこの経路で配る。
 */
import type { EnvVars } from '../../root-only/env/types.ts';

/** 1 コマンド分の、検証後の入力の形 */
export interface RouteShape {
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  /** stdin.tsx が無ければ never */
  stdin: unknown;
  /** data.tsx の戻り値。無ければ never (ADR 25) */
  data: unknown;
}

/**
 * 生成された `.decopin/types.d.ts` が埋める。
 * 未生成のうちは空なので、{@link CmdProps} は緩い型にフォールバックする。
 */
export interface Routes {}

/** どのコマンドにも共通で渡るもの */
export interface CommandBase {
  /** コマンド名として消費されなかった生の argv */
  argv: readonly string[];
  cwd: string;
  /** `app/env.tsx` から検証済みの環境変数 (無ければ空) */
  env: EnvVars;
  /**
   * `--dry-run` が付いているか (ADR 37)。真なら何も変えず、何をするつもり
   * だったかを見せる。枠組みは差し替えをしないので、従うのはコマンドの責任
   */
  dryRun: boolean;
}

/** 型が未生成のときの緩いフォールバック */
export interface UntypedCmdProps extends CommandBase {
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  stdin: unknown;
  data: unknown;
}

/** 型が生成されていればコマンド名を、まだなら任意の文字列を受ける */
export type RouteName = [keyof Routes] extends [never] ? string : keyof Routes;

/**
 * `cmd.tsx` の props。
 *
 * ```tsx
 * export default function Command({ args, options }: CmdProps<'hello'>) {}
 * ```
 *
 * `decopin build` を通していない状態では `args` / `options` が
 * `Record<string, unknown>` になる。型が欲しければ `decopin dev` を回す。
 */
export type CmdProps<R extends RouteName> = R extends keyof Routes
  ? Routes[R] extends RouteShape
    ? Routes[R] & CommandBase
    : UntypedCmdProps
  : UntypedCmdProps;
