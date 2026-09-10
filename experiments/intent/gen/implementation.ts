/**
 * Behavior と実装の対応 (§8.2 証明分離パターン)。
 *
 * init のときと違って、ここでは**関数でない担い手**が 2 つ出た。
 * `FILE_TEMPLATES` (雛形の中身) と `GENERATOR_KINDS` (生成できる種類の表) で、
 * どちらも定数。Carrier を関数に限っていたのはこの実験で外した。
 */
import run from '../../../src/cli/gen/cmd.ts';
import {
  generate,
  GENERATOR_KINDS,
  GenerateUsageError,
} from '../../../src/cli/gen/generate.ts';
import { FILE_TEMPLATES } from '../../../src/cli/gen/templates.ts';
import { writeTemplates } from '../../../src/core/scaffold/write.ts';
import { carriedBy, implement } from '../core.ts';
import { ADD_CONVENTIONS_WITHOUT_MEMORIZING } from './intent.ts';

const CMD = 'src/cli/gen/cmd.ts';
const GENERATE = 'src/cli/gen/generate.ts';

export const IMPLEMENTATION = implement(ADD_CONVENTIONS_WITHOUT_MEMORIZING, {
  // 「build と型検査が通る雛形」の実体は文字列の側にある。generate は置くだけ
  'writes-known-conventions': [
    carriedBy(FILE_TEMPLATES, 'src/cli/gen/templates.ts', 'FILE_TEMPLATES'),
    carriedBy(generate, GENERATE),
    carriedBy(writeTemplates, 'src/core/scaffold/write.ts'),
  ],
  // 拡張子と旧名を見るのは generate。実際に書かないのは writeTemplates の 'wx'。
  // init の never-overwrites と writeTemplates を共有している (§11.8 の重なり)
  'keeps-existing-files': [
    carriedBy(generate, GENERATE),
    carriedBy(writeTemplates, 'src/core/scaffold/write.ts'),
  ],
  // 引数の形の検査は CLI 層。generate まで届く前に落とす
  'rejects-bad-arguments': [
    carriedBy(run, CMD),
    carriedBy(GenerateUsageError, GENERATE),
  ],
  'refuses-outside-the-router': [carriedBy(generate, GENERATE)],
  // 実体は generate 内の rejectLinkedDirectories。非公開なので generate で指す
  'refuses-symbolic-links': [carriedBy(generate, GENERATE)],
  // help の文面は GENERATOR_KINDS から組み立てている。種類を足せば help も動く
  'explains-what-can-be-generated': [
    carriedBy(GENERATOR_KINDS, GENERATE, 'GENERATOR_KINDS'),
    carriedBy(run, CMD),
  ],
});
