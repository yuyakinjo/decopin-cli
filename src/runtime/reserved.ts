/**
 * フレームワークが自分で処理するオプション。
 * 利用者が argv.tsx で同じ名前を宣言することはできない。
 */
export const RESERVED_OPTION_NAMES = ['help', 'version', 'no-color'] as const;

/** 予約された短縮形。`-v` / `-V` は予約しない (大文字小文字の違いで意味が変わるのは誤操作を誘うため) */
export const RESERVED_OPTION_ALIASES = ['h'] as const;

export const HELP_FLAGS = ['--help', '-h'] as const;

/**
 * シェル補完の入口 (ADR 21)。生成された補完シムだけが叩く。
 * scanner は `_` 始まりのディレクトリをルートにしない (ADR 3) ので、
 * 利用者のコマンドとこの名前が衝突することは構造的にない。
 */
export const COMPLETE_COMMAND = '__complete';
export const VERSION_FLAG = '--version';
export const NO_COLOR_FLAG = '--no-color';

export function isReservedName(name: string): boolean {
  return (RESERVED_OPTION_NAMES as readonly string[]).includes(name);
}

export function isReservedAlias(alias: string): boolean {
  return (RESERVED_OPTION_ALIASES as readonly string[]).includes(alias);
}
