/**
 * 宣言 spec の互換 façade。
 * 実装は規約ファイルごとの feature ディレクトリに置く。
 */
export { EMPTY_ARGV_SPEC } from '../features/conventions/argv/spec.ts';
export type {
  ArgSpec,
  ArgvSpec,
  OptionSpec,
} from '../features/conventions/argv/spec.ts';
export type { OutputSpec } from '../features/conventions/output/spec.ts';
export type {
  StdinMode,
  StdinSpec,
} from '../features/conventions/stdin/spec.ts';
export { EMPTY_ENV_SPEC } from '../features/root-only/env/spec.ts';
export type { EnvSpec, VarSpec } from '../features/root-only/env/spec.ts';
export type { VersionSpec } from '../features/root-only/version/spec.ts';
