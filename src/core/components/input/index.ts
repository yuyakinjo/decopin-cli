/**
 * 入力宣言コンポーネントの互換 façade。
 * 実装は規約ファイルごとの feature ディレクトリに置く。
 */
export {
  Arg,
  Argv,
  Option,
} from '../../../features/conventions/argv/components.ts';
export type {
  ArgProps,
  ArgvProps,
  OptionProps,
  ShorthandType,
} from '../../../features/conventions/argv/components.ts';
export { Output } from '../../../features/conventions/output/components.ts';
export type { OutputProps } from '../../../features/conventions/output/components.ts';
export { Stdin } from '../../../features/conventions/stdin/components.ts';
export type { StdinProps } from '../../../features/conventions/stdin/components.ts';
export { Env, Var } from '../../../features/root-only/env/components.ts';
export type {
  EnvProps,
  VarProps,
} from '../../../features/root-only/env/components.ts';
export { Version } from '../../../features/root-only/version/components.ts';
export type { VersionProps } from '../../../features/root-only/version/components.ts';
