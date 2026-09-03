import { FILE_NAME as ERROR_FILE } from './error/definition.ts';
import { FILE_NAME as LAYOUT_FILE } from './layout/definition.ts';
import { FILE_NAME as MIDDLEWARE_FILE } from './middleware/definition.ts';
import { FILE_NAME as NOT_FOUND_FILE } from './not-found/definition.ts';

/** 上位ディレクトリから子コマンドに継承されるファイル (ADR 7 / ADR 13) */
export const INHERITED_FILES = [
  ERROR_FILE,
  NOT_FOUND_FILE,
  LAYOUT_FILE,
  MIDDLEWARE_FILE,
] as const;

export type InheritedFile = (typeof INHERITED_FILES)[number];
