/**
 * `decopin gen` の Behavior。
 *
 * 粒度は init と同じ基準 (§18 Question B):「利用者が観測できる結末」で割り、
 * 失敗の仕方が違えば別の Behavior にする。`lstat` を何回呼ぶかといった手順は
 * Behavior にしない (§11.4)。
 *
 * init が 4 + 1 だったのに対しここは 6。増えたぶんは全部「断り方」で、
 * gen は**作らないと決める条件が多い**コマンドだった。
 */
import { behavior } from '../core.ts';

/** 種類と名前を選べば、そのまま build と型検査を通る雛形が置かれること */
export const WRITES_KNOWN_CONVENTIONS = behavior(
  'writes-known-conventions',
  '知っている規約の雛形を指定の場所に置き、それだけで build と型検査が通る'
);

/**
 * 既にある実装を隠さないこと。
 *
 * `.tsx` を作ると同名の `.ts` や旧 `command` を覆い隠せてしまうので、
 * 拡張子と旧名も見てから決める。
 */
export const KEEPS_EXISTING_FILES = behavior(
  'keeps-existing-files',
  '同じ規約のファイルが既にあれば書かず、残したものとして報告する'
);

/** 引数の組み合わせが成立しないとき、何も作らずに使い方へ戻すこと */
export const REJECTS_BAD_ARGUMENTS = behavior(
  'rejects-bad-arguments',
  '種類の指定が無い・重複する・値が欠けるときは、ファイルを作らず usage を出して exit 2'
);

/**
 * ルーターが読まない場所に置かないこと。
 *
 * ここで止めないと、生成は成功したのにコマンドが現れない、という
 * いちばん分かりにくい失敗になる。
 */
export const REFUSES_OUTSIDE_THE_ROUTER = behavior(
  'refuses-outside-the-router',
  'app の外・_private・root-only の位置違いには作らず、理由を出して exit 2'
);

/**
 * リンクを辿った先に書かないこと。
 *
 * ルーターはシンボリックリンクを走査しないので、`refuses-outside-the-router`
 * と結末は同じに見えるが、判定は配置先だけでなく **app ルートから途中の
 * ディレクトリまで**を見る必要があり、失敗の仕方が違う。
 */
export const REFUSES_SYMBOLIC_LINKS = behavior(
  'refuses-symbolic-links',
  '配置先・途中のディレクトリ・app ルートのいずれかがリンクなら作らない'
);

/** 何が生成できるかを、コマンド自身が答えられること */
export const EXPLAINS_WHAT_CAN_BE_GENERATED = behavior(
  'explains-what-can-be-generated',
  '--help が生成できる種類の一覧と使用例を出す'
);

export const BEHAVIORS = [
  WRITES_KNOWN_CONVENTIONS,
  KEEPS_EXISTING_FILES,
  REJECTS_BAD_ARGUMENTS,
  REFUSES_OUTSIDE_THE_ROUTER,
  REFUSES_SYMBOLIC_LINKS,
  EXPLAINS_WHAT_CAN_BE_GENERATED,
] as const;
