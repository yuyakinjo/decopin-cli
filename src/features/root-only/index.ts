import { FILE_NAME as ENV_FILE } from './env/definition.ts';
import { FILE_NAME as GLOBAL_ERROR_FILE } from './global-error/definition.ts';
import { FILE_NAME as NOT_FOUND_FILE } from './not-found/definition.ts';
import { FILE_NAME as VERSION_FILE } from './version/definition.ts';

/** ルート直下にだけ置けるファイル */
export const ROOT_ONLY_FILES = [
  GLOBAL_ERROR_FILE,
  NOT_FOUND_FILE,
  ENV_FILE,
  VERSION_FILE,
] as const;

export type RootOnlyFile = (typeof ROOT_ONLY_FILES)[number];
