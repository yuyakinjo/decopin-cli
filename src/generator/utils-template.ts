import { relative, resolve } from 'node:path';

/**
 * 相対パス生成
 */
export function generateRelativePath(appDir: string, filePath: string): string {
  const relativePath = relative(resolve(appDir), filePath).replace(
    '.ts',
    '.js'
  );
  return `app/${relativePath}`;
}

/**
 * params.tsパス生成
 */
export function generateParamsPath(appDir: string, filePath: string): string {
  const dirPath = relative(
    resolve(appDir),
    filePath.replace('/command.ts', '')
  );
  return `./app/${dirPath}/params.js`;
}

/**
 * error.tsパス生成
 */
export function generateErrorPath(appDir: string, filePath: string): string {
  const dirPath = relative(
    resolve(appDir),
    filePath.replace('/command.ts', '')
  );
  return `./app/${dirPath}/error.js`;
}
