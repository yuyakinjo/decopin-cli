/**
 * 宣言 parser の互換 façade。
 * 実装は規約ファイルごとの feature ディレクトリに置く。
 */
export { parseArgvSpec } from '../features/conventions/argv/parse.ts';
export { parseOutputSpec } from '../features/conventions/output/parse.ts';
export { parseStdinSpec } from '../features/conventions/stdin/parse.ts';
export { parseEnvSpec } from '../features/root-only/env/parse.ts';
export { parseVersionSpec } from '../features/root-only/version/parse.ts';
export { rejectObjectFor, toTypeNode } from './parse-helpers.ts';
export type { InputSource } from './parse-helpers.ts';
