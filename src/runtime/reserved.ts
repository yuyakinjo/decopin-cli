/**
 * フレームワークが自分で処理するオプション。
 * 利用者が argv.tsx で同じ名前を宣言することはできない。
 */
export const RESERVED_OPTION_NAMES = ['help', 'version', 'no-color'] as const;

export const RESERVED_OPTION_ALIASES = ['h'] as const;

export const HELP_FLAGS = ['--help', '-h'] as const;
export const VERSION_FLAG = '--version';
export const NO_COLOR_FLAG = '--no-color';

export function isReservedName(name: string): boolean {
  return (RESERVED_OPTION_NAMES as readonly string[]).includes(name);
}

export function isReservedAlias(alias: string): boolean {
  return (RESERVED_OPTION_ALIASES as readonly string[]).includes(alias);
}
