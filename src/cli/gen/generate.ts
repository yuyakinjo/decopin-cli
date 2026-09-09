import { lstat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { ERROR_TAG } from '../../core/errors.ts';
import { writeTemplates } from '../../core/scaffold/write.ts';
import { CONVENTION_FILES } from '../../features/conventions/index.ts';
import { INHERITED_FILES } from '../../features/inherited/index.ts';
import { ROOT_ONLY_FILES } from '../../features/root-only/index.ts';
import { FILE_TEMPLATES } from './templates.ts';

export const GENERATOR_KINDS = {
  conv: CONVENTION_FILES,
  inherited: INHERITED_FILES,
  'root-only': ROOT_ONLY_FILES,
} as const;

export class GenerateUsageError extends Error {
  readonly [ERROR_TAG] = 'GenerateUsageError';
}

export interface GenerateOptions {
  kind: keyof typeof GENERATOR_KINDS;
  name: string;
  /** カレントディレクトリからの配置先。省略時は app。 */
  path?: string;
  /** app ルート。省略時は app。 */
  app?: string;
}

/** ルーターが走査しないリンクを、app ルートから順に検査する。 */
async function rejectLinkedDirectories(app: string, route: string) {
  let directory = app;
  for (const part of ['', ...route.split(sep).filter(Boolean)]) {
    directory = join(directory, part);
    try {
      const stat = await lstat(directory);
      if (stat.isSymbolicLink()) {
        throw new GenerateUsageError(
          `Cannot generate through a symbolic link: ${directory}`
        );
      }
    } catch (error) {
      // 親が存在しなければ、その下にも既存リンクはない。
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
  }
}

export async function generate(options: GenerateOptions) {
  const { kind, name } = options;
  const names: readonly string[] = GENERATOR_KINDS[kind];
  if (!names.includes(name)) {
    throw new GenerateUsageError(
      `Unknown ${kind}: ${name}. Choose: ${names.join(', ')}`
    );
  }
  const app = resolve(options.app ?? 'app');
  const dir = resolve(options.path ?? app);
  const route = relative(app, dir);
  if (isAbsolute(route) || route === '..' || route.startsWith(`..${sep}`)) {
    throw new GenerateUsageError('--path must be inside --app (default: app)');
  }
  if (kind === 'root-only' && route !== '') {
    throw new GenerateUsageError(
      '--root-only files must be placed at the app root'
    );
  }
  if (
    route
      .split(sep)
      .some(
        (part) =>
          part.startsWith('_') ||
          part.startsWith('.') ||
          part === 'node_modules'
      )
  ) {
    throw new GenerateUsageError(
      '--path contains a directory ignored by the router'
    );
  }
  await rejectLinkedDirectories(app, route);
  // .ts と旧 cmd 名も保持し、生成した .tsx で既存の実装を隠さない。
  const bases = name === 'cmd' ? ['cmd', 'command'] : [name];
  for (const base of bases) {
    for (const ext of ['tsx', 'ts']) {
      const file = `${base}.${ext}`;
      try {
        await lstat(join(dir, file));
        return { dir, created: [], skipped: [file] };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }
  const content = FILE_TEMPLATES[name as keyof typeof FILE_TEMPLATES];
  return { dir, ...(await writeTemplates(dir, { [`${name}.tsx`]: content })) };
}
