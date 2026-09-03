import { FILE_NAME as ARGV_FILE } from './argv/definition.ts';
import { FILE_NAME as CMD_FILE } from './cmd/definition.ts';
import { FILE_NAME as COMPLETE_FILE } from './complete/definition.ts';
import { FILE_NAME as DATA_FILE } from './data/definition.ts';
import { FILE_NAME as ERROR_FILE } from './error/definition.ts';
import { FILE_NAME as HELP_FILE } from './help/definition.ts';
import { FILE_NAME as LAYOUT_FILE } from './layout/definition.ts';
import { FILE_NAME as MIDDLEWARE_FILE } from './middleware/definition.ts';
import { FILE_NAME as NOT_FOUND_FILE } from './not-found/definition.ts';
import { FILE_NAME as OUTPUT_FILE } from './output/definition.ts';
import { FILE_NAME as SHELL_FILE } from './shell/definition.ts';
import { FILE_NAME as STDIN_FILE } from './stdin/definition.ts';

/** 規約で定められたファイルの種類 */
export const CONVENTION_FILES = [
  CMD_FILE,
  ARGV_FILE,
  STDIN_FILE,
  DATA_FILE,
  OUTPUT_FILE,
  ERROR_FILE,
  NOT_FOUND_FILE,
  LAYOUT_FILE,
  MIDDLEWARE_FILE,
  HELP_FILE,
  SHELL_FILE,
  COMPLETE_FILE,
] as const;

export type ConventionFile = (typeof CONVENTION_FILES)[number];
