import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** 排他的に作成し、既存ファイル（シンボリックリンクを含む）は保持する。 */
export async function writeTemplates(
  dir: string,
  templates: Record<string, string>
): Promise<{ created: string[]; skipped: string[] }> {
  const created: string[] = [];
  const skipped: string[] = [];
  for (const [path, content] of Object.entries(templates)) {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    try {
      await writeFile(target, content, { flag: 'wx' });
      created.push(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      skipped.push(path);
    }
  }
  return { created, skipped };
}
