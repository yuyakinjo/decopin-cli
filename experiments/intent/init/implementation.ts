/**
 * Behavior と Function の対応 (§8.2 証明分離パターン)。
 *
 * 実装そのものは src/ にある普通の TypeScript のままで、ここは何も生成しない。
 * 持っているのは「どの関数がどの Behavior を担っているか」だけ。
 * 参照は文字列ではなく値なので、関数を消すとこのファイルが落ちる。
 */
import run from '../../../src/cli/init/cmd.ts';
import {
  init,
  installDependencies,
  templates,
} from '../../../src/core/init/index.ts';
import { writeTemplates } from '../../../src/core/scaffold/write.ts';
import { carriedBy, implement } from '../core.ts';
import { START_BY_WRITING_COMMANDS } from './intent.ts';

const CORE = 'src/core/init/index.ts';

export const IMPLEMENTATION = implement(START_BY_WRITING_COMMANDS, {
  // 何を置くかを決めているのは templates。init はそれを書き出す
  'runs-from-scratch': [carriedBy(templates, CORE), carriedBy(init, CORE)],
  // 型検査が通るかは tsconfig.json の中身 = templates だけで決まる
  'typechecks-as-generated': [carriedBy(templates, CORE)],
  // 上書きしないことの実体は writeTemplates の 'wx'。init はそれを報告に変える
  'never-overwrites': [
    carriedBy(writeTemplates, 'src/core/scaffold/write.ts'),
    carriedBy(init, CORE),
  ],
  // 出力の順と Next: は CLI 側の担当
  'tells-the-next-step': [carriedBy(run, 'src/cli/init/cmd.ts')],
  // 証明はしないが (waived)、担い手は分かっているので繋いでおく。
  // Carrier と Evidence は別の軸で、証明の免除は実装の免除ではない
  'installs-dependencies': [
    carriedBy(installDependencies, CORE),
    carriedBy(init, CORE),
  ],
});
