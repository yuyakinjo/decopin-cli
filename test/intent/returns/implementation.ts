import {
  annotateDeclarations,
  annotateReturnSource,
} from '../../../src/core/build/annotate.ts';
import { generateTypes } from '../../../src/core/build/type-emitter.ts';
/**
 * Behavior と実装の対応。**§8.2 証明分離パターン**で書いた。
 *
 * この実験の狙いは §8.1 一方向パターン (Question C) を試すことだったので、
 * 先に一方向で書いて測った。結果:
 *
 * - `src/core/build/annotate.ts` の `annotateReturnSource` を
 *   `carries(NOTICE_..., [...], function annotateReturnSource(...) {...},
 *   'src/core/build/annotate.ts')` に包む
 * - `bunx tsc --noEmit` → 通る
 * - `bun test test/build/annotate.test.ts` → 17 pass / 0 fail
 * - `bun run build:package` → **落ちる**
 *   `src/core/build/annotate.ts(13,25): error TS6059: File
 *   '.../experiments/intent/core.ts' is not under 'rootDir' '.../src'`
 *
 * つまり一方向パターンは、Intent ランタイムを**配布物の中に置く**ことを
 * 要求する。アプリなら払える代償だが、npm に出すライブラリでは払えない
 * (利用者の node_modules に実験用のコードが入る)。`carries()` の呼び出しを
 * 消せば済む話ではなく、消した瞬間に対応表が消える — それが一方向の要点
 * だからだ。**公開ライブラリの src/ では §8.2 が強制される**、が Question C
 * への答え。予想 (「成立しない」) は当たったが、落ちた場所は型検査でも
 * テストでもなく配布物の組み立てだった。
 *
 * carrier に型は置けない (Carrier は値への参照を持つ) ので、型が主役の
 * Behavior は definition.ts のモジュール名前空間を担い手にしている。
 * ファイルを消す・場所を変えれば、ここが型検査で落ちる
 */
import * as argvDefinition from '../../../src/features/conventions/argv/definition.ts';
import * as dataDefinition from '../../../src/features/conventions/data/definition.ts';
import * as outputDefinition from '../../../src/features/conventions/output/definition.ts';
import * as shellDefinition from '../../../src/features/conventions/shell/definition.ts';
import * as stdinDefinition from '../../../src/features/conventions/stdin/definition.ts';
import * as envDefinition from '../../../src/features/root-only/env/definition.ts';
import * as versionDefinition from '../../../src/features/root-only/version/definition.ts';
import { carriedBy, implement } from '../core.ts';
import { NOTICE_DECLARATION_MISTAKES_WHILE_TYPING } from './intent.ts';

const ANNOTATE = 'src/core/build/annotate.ts';
const EMITTER = 'src/core/build/type-emitter.ts';
const DATA = 'src/features/conventions/data/definition.ts';

/** 6 つの宣言ファイルの返り値型。中身は全部 `Declaration` の別名 (ADR 9) */
const DECLARATIONS = [
  carriedBy(
    argvDefinition,
    'src/features/conventions/argv/definition.ts',
    'ArgvDefinition'
  ),
  carriedBy(
    stdinDefinition,
    'src/features/conventions/stdin/definition.ts',
    'StdinDefinition'
  ),
  carriedBy(
    outputDefinition,
    'src/features/conventions/output/definition.ts',
    'OutputDefinition'
  ),
  carriedBy(
    shellDefinition,
    'src/features/conventions/shell/definition.ts',
    'ShellDefinition'
  ),
  carriedBy(
    envDefinition,
    'src/features/root-only/env/definition.ts',
    'EnvDefinition'
  ),
  carriedBy(
    versionDefinition,
    'src/features/root-only/version/definition.ts',
    'VersionDefinition'
  ),
];

export const IMPLEMENTATION = implement(
  NOTICE_DECLARATION_MISTAKES_WHILE_TYPING,
  {
    'declares-what-each-file-returns': DECLARATIONS,
    // 型で食い違いを捕まえられるのはここだけ。JSX を経由しないため
    'ties-data-to-output': [
      carriedBy(dataDefinition, DATA, 'DataResult'),
      carriedBy(generateTypes, EMITTER),
    ],
    // 生成前の緩さは `N extends keyof DataResults ? ... : unknown` が持つ
    'falls-back-before-generation': [
      carriedBy(dataDefinition, DATA, 'DataResults'),
    ],
    'annotates-while-developing': [
      carriedBy(annotateReturnSource, ANNOTATE),
      carriedBy(annotateDeclarations, ANNOTATE),
    ],
    'never-touches-annotated-files': [
      carriedBy(annotateReturnSource, ANNOTATE),
    ],
    'annotates-data-only-when-declared': [
      carriedBy(annotateDeclarations, ANNOTATE),
    ],
  }
);
