/**
 * `decopin gen` の Intent。実験 2。§12 Intent Recovery。
 *
 * 元にした事実:
 *
 * - src/cli/gen/cmd.ts の help (「生成できる種類」を人が覚えている前提を外す)
 * - src/cli/gen/generate.ts が、書く前に 4 種類の断り方を持っていること
 * - FILE_TEMPLATES が全規約を網羅すると宣言していること
 *
 * init の Intent (start-by-writing-commands) と近いが、別物として立てた。
 * init は**最初の 1 回**、gen は**2 個目以降**を助ける。carrier が
 * writeTemplates で重なるので、§11.8 の重なり検出の題材にもなる。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const ADD_CONVENTIONS_WITHOUT_MEMORIZING = intent({
  id: 'add-conventions-without-memorizing',
  purpose:
    '規約ファイルの名前・置ける場所・中身の書き出しを覚えていなくても、既にあるプロジェクトに足せるようにする',
  behaviors: BEHAVIORS,
});
