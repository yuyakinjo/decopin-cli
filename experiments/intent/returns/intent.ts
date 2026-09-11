/**
 * 宣言ファイルの返り値型の Intent。実験 6。**Intent-First**。
 *
 * 元にした事実は、ADR 9 の測り直し (TS 7.0.2 でも JSX 式の型は
 * `JSX.Element` に潰れる) と、`cmd.tsx` にだけ `CmdProps` があって
 * 宣言ファイルには何も無い、という非対称。
 *
 * **「型安全にする」を purpose にしなかった。** JSX を返す宣言では、
 * 返り値型は「要素を返す」以上を言えない (ADR 9)。取り違え
 * (`env.tsx` に `<Argv>`) を捕まえるのは今も build 時の DeclarationError で、
 * そこは動かない。型で本当に効くのは data.tsx × output.tsx の 1 か所だけ。
 * 残りで効くのは**書き方が揃うこと**なので、purpose はそちら側に置いた。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const NOTICE_DECLARATION_MISTAKES_WHILE_TYPING = intent({
  id: 'notice-declaration-mistakes-while-typing',
  purpose:
    '規約ファイルが何を返すのかを書かなくても型として見えるようにし、宣言と食い違う値は CLI を動かす前に気付けるようにする',
  behaviors: BEHAVIORS,
});
