/**
 * Behavior と実装の対応 (§8.2 証明分離パターン)。
 *
 * ここで初めて **run が全 Behavior に出る**。src/core/runtime/run.tsx が
 * 規約を順に呼ぶ入口なので、どの結末も run を通る。
 *
 * これは Carrier の解像度としては最低で、run だけを見ても Behavior は
 * 区別できない。区別を付けているのは run と並ぶもう 1 つの Carrier の方。
 * 実験 2 の finding 8 (解像度は公開 API に縛られる) の裏返しで、
 * **入口が 1 つに集まる設計では Carrier が重なるのが正常**になる。
 */
import { resolveColorDepth } from '../../../src/core/renderer/capabilities.ts';
import { run } from '../../../src/core/runtime/run.tsx';
import { tokenize } from '../../../src/features/conventions/argv/tokens.ts';
import { validateArgv } from '../../../src/features/conventions/argv/validation.ts';
import {
  commandsUnder,
  resolveTarget,
  suggest,
} from '../../../src/features/conventions/cmd/router.ts';
import { Help } from '../../../src/features/conventions/help/runtime.tsx';
import { applyLayouts } from '../../../src/features/conventions/layout/runtime.tsx';
import { runMiddleware } from '../../../src/features/conventions/middleware/runtime.ts';
import { NotFound } from '../../../src/features/conventions/not-found/runtime.tsx';
import { evaluateStdin } from '../../../src/features/conventions/stdin/evaluate.ts';
import { readStdin } from '../../../src/features/conventions/stdin/runtime.ts';
import { handleError } from '../../../src/features/inherited/error/runtime.tsx';
import { withGlobalError } from '../../../src/features/root-only/global-error/runtime.ts';
import { carriedBy, implement } from '../core.ts';
import { RUN_COMMANDS_AS_DECLARED } from './intent.ts';

const RUN = 'src/core/runtime/run.tsx';
const ROUTER = 'src/features/conventions/cmd/router.ts';

export const IMPLEMENTATION = implement(RUN_COMMANDS_AS_DECLARED, {
  'routes-directories-to-commands': [
    carriedBy(resolveTarget, ROUTER),
    carriedBy(run, RUN),
  ],
  'parses-argv-as-declared': [
    carriedBy(tokenize, 'src/features/conventions/argv/tokens.ts'),
    carriedBy(run, RUN),
  ],
  'reads-stdin-as-declared': [
    carriedBy(readStdin, 'src/features/conventions/stdin/runtime.ts'),
    carriedBy(evaluateStdin, 'src/features/conventions/stdin/evaluate.ts'),
    carriedBy(run, RUN),
  ],
  // 引数の検証と入力の検証は別の関数だが、利用者から見た結末は同じ exit 2
  'rejects-invalid-input': [
    carriedBy(validateArgv, 'src/features/conventions/argv/validation.ts'),
    carriedBy(evaluateStdin, 'src/features/conventions/stdin/evaluate.ts'),
    carriedBy(run, RUN),
  ],
  'explains-usage-from-declarations': [
    carriedBy(Help, 'src/features/conventions/help/runtime.tsx'),
    carriedBy(run, RUN),
  ],
  'guides-when-the-command-is-missing': [
    carriedBy(suggest, ROUTER),
    carriedBy(commandsUnder, ROUTER),
    carriedBy(NotFound, 'src/features/conventions/not-found/runtime.tsx'),
    carriedBy(run, RUN),
  ],
  'handles-errors-where-declared': [
    carriedBy(handleError, 'src/features/inherited/error/runtime.tsx'),
    carriedBy(
      withGlobalError,
      'src/features/root-only/global-error/runtime.ts'
    ),
    carriedBy(run, RUN),
  ],
  'wraps-output-in-layout': [
    carriedBy(applyLayouts, 'src/features/conventions/layout/runtime.tsx'),
    carriedBy(run, RUN),
  ],
  'runs-middleware-around-the-command': [
    carriedBy(runMiddleware, 'src/features/conventions/middleware/runtime.ts'),
    carriedBy(run, RUN),
  ],
  // 装飾を落とす判断は色深度の解決に集まっている。run は出力の宛先を決めるだけ
  'keeps-pipes-clean': [
    carriedBy(resolveColorDepth, 'src/core/renderer/capabilities.ts'),
    carriedBy(run, RUN),
  ],
});
