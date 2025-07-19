import { relative, resolve } from 'node:path';

/**
 * 相対パス生成
 */
export function generateRelativePath(appDir: string, filePath: string): string {
  return relative(resolve(appDir), filePath).replace('.ts', '.js');
}

/**
 * params.tsパス生成
 */
export function generateParamsPath(appDir: string, filePath: string): string {
  const dirPath = relative(
    resolve(appDir),
    filePath.replace('/command.ts', '')
  );
  return `./${dirPath}/params.js`;
}

/**
 * error.tsパス生成
 */
export function generateErrorPath(appDir: string, filePath: string): string {
  const dirPath = relative(
    resolve(appDir),
    filePath.replace('/command.ts', '')
  );
  return `./${dirPath}/error.js`;
}
