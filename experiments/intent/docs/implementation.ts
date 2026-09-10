import run from '../../../src/cli/docs/cmd.ts';
import { documentApp } from '../../../src/cli/docs/document.ts';
import { loadExamples } from '../../../src/features/conventions/example/runtime.ts';
import {
  argUsage,
  optionLabel,
} from '../../../src/features/conventions/help/runtime.tsx';
/**
 * Behavior と実装の対応 (§8.2 証明分離パターン)。
 *
 * **Intent-First なので、この表は Behavior を書いた後・実装した後に作った。**
 * Intent Recovery のときと違い、埋める先が最初は存在しなかった。
 * 「実装が無いので carrier が書けない」状態が、そのまま「まだ作っていない」
 * ことの表示になる
 */
import { carriedBy, implement } from '../core.ts';
import { KNOW_WHAT_A_COMMAND_DOES_WITHOUT_RUNNING_IT } from './intent.ts';

const DOCS = 'src/cli/docs/document.ts';
const CMD = 'src/cli/docs/cmd.ts';
const EXAMPLE = 'src/features/conventions/example/runtime.ts';
const HELP = 'src/features/conventions/help/runtime.tsx';

export const IMPLEMENTATION = implement(
  KNOW_WHAT_A_COMMAND_DOES_WITHOUT_RUNNING_IT,
  {
    'lists-every-command': [carriedBy(documentApp, DOCS)],
    // 打つときの形は help と同じ規則を使う。二重に持つと必ずずれる (ADR 8)
    'shows-how-to-call': [
      carriedBy(documentApp, DOCS),
      carriedBy(argUsage, HELP),
      carriedBy(optionLabel, HELP),
    ],
    'runs-the-declared-examples': [
      carriedBy(documentApp, DOCS),
      carriedBy(loadExamples, EXAMPLE),
    ],
    // 「宣言があるものだけ」の境界は loadExamples が持つ (無ければ空を返す)
    'only-runs-what-was-declared': [
      carriedBy(loadExamples, EXAMPLE),
      carriedBy(documentApp, DOCS),
    ],
    'shows-a-failure-as-a-failure': [carriedBy(documentApp, DOCS)],
    'writes-where-told': [carriedBy(run, CMD, 'run')],
  }
);
