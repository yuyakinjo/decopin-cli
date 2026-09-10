/**
 * `decopin dev` の Intent。実験 4。§12 Intent Recovery。
 *
 * 元にした事実:
 *
 * - src/core/build/watch.ts の冒頭: 型は生成物なので、これを回していないと
 *   cmd.tsx の props の型が古くなる。バンドルも毎回やり直す (ADR 43)
 * - debounce と pending の実装が「エディタの保存の仕方」に合わせてあること
 * - src/cli/dev/cmd.ts が SIGINT/SIGTERM を成功として扱うこと
 *
 * build の Intent (ship-what-the-directories-declare) と目的が近いが、別物。
 * build は**配れるものを作る**、dev は**書いている間ずれないようにする**。
 * carrier が build() で重なるので、§11.8 の重なり検出の 2 例目になる。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const KEEP_TYPES_HONEST_WHILE_EDITING = intent({
  id: 'keep-types-honest-while-editing',
  purpose:
    '書いている最中に、生成物 (型と dist) が手で書いたファイルから遅れないようにする',
  behaviors: BEHAVIORS,
});
