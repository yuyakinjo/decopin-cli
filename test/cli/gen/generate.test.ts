/**
 * `decopin gen` の本体 generate() (src/cli/gen/generate.ts)。
 *
 * 関数を直に呼び、戻り値 (dir・created・skipped) と投げるエラーの種類を見る。
 * CLI から通したときの終了コードや出力は test/intent/gen/ の側にある
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { generate, GenerateUsageError } from '../../../src/cli/gen/generate.ts';
import { FILE_TEMPLATES } from '../../../src/cli/gen/templates.ts';
import { errorTag } from '../../../src/core/errors.ts';

let root: string;
let app: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'decopin-generate-'));
  app = join(root, 'app');
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** 投げたものが GenerateUsageError で、メッセージが含むものを返す */
async function usageError(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(GenerateUsageError);
    expect(errorTag(error)).toBe('GenerateUsageError');
    return (error as Error).message;
  }
  throw new Error('generate() did not throw');
}

describe('generate: 書く', () => {
  test('path に <name>.tsx を雛形どおりに書き、created で返す', async () => {
    const dir = join(app, 'hello');
    const result = await generate({
      kind: 'conv',
      name: 'cmd',
      path: dir,
      app,
    });
    expect(result).toEqual({ dir, created: ['cmd.tsx'], skipped: [] });
    expect(await readFile(join(dir, 'cmd.tsx'), 'utf8')).toBe(
      FILE_TEMPLATES.cmd
    );
  });

  test('path を省くと app ルートに書く', async () => {
    const result = await generate({ kind: 'root-only', name: 'env', app });
    expect(result.dir).toBe(app);
    expect(result.created).toEqual(['env.tsx']);
  });

  test('継承ファイルは入れ子の途中にも置ける', async () => {
    const dir = join(app, 'user', 'admin');
    const result = await generate({
      kind: 'inherited',
      name: 'layout',
      path: dir,
      app,
    });
    expect(result.created).toEqual(['layout.tsx']);
    expect(await readdir(dir)).toEqual(['layout.tsx']);
  });
});

describe('generate: 既存を残す', () => {
  test('.ts の同名ファイルがあれば .tsx を書かず skipped で返す', async () => {
    const dir = join(app, 'hello');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'argv.ts'), 'export default 1;\n');
    const result = await generate({
      kind: 'conv',
      name: 'argv',
      path: dir,
      app,
    });
    expect(result).toEqual({ dir, created: [], skipped: ['argv.ts'] });
    expect(await readdir(dir)).toEqual(['argv.ts']);
  });

  test('cmd は旧名 command.tsx があっても書かない', async () => {
    const dir = join(app, 'hello');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'command.tsx'), 'old\n');
    const result = await generate({
      kind: 'conv',
      name: 'cmd',
      path: dir,
      app,
    });
    expect(result.skipped).toEqual(['command.tsx']);
    expect(result.created).toEqual([]);
  });

  test('cmd 以外は旧名の扱いを持たない (command.tsx があっても argv は書く)', async () => {
    const dir = join(app, 'hello');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'command.tsx'), 'old\n');
    const result = await generate({
      kind: 'conv',
      name: 'argv',
      path: dir,
      app,
    });
    expect(result.created).toEqual(['argv.tsx']);
  });
});

describe('generate: 断る', () => {
  test('種類に無い名前は、選べる名前を並べて断る', async () => {
    const message = await usageError(
      generate({ kind: 'root-only', name: 'cmd', app })
    );
    expect(message).toStartWith('Unknown root-only: cmd. Choose: ');
    expect(message).toContain('env');
  });

  test('app の外、または app の親を指す path は断る', async () => {
    for (const path of [root, join(root, 'elsewhere')]) {
      expect(
        await usageError(generate({ kind: 'conv', name: 'cmd', path, app }))
      ).toBe('--path must be inside --app (default: app)');
    }
  });

  test('名前が `..` で始まるだけの子ディレクトリは外とみなさない', async () => {
    const dir = join(app, '..hidden-like');
    // `.` で始まるので、別の理由 (ルーターが走査しない) で断られる
    expect(
      await usageError(generate({ kind: 'conv', name: 'cmd', path: dir, app }))
    ).toBe('--path contains a directory ignored by the router');
  });

  test('root-only は app ルート以外に置けない', async () => {
    expect(
      await usageError(
        generate({ kind: 'root-only', name: 'env', path: join(app, 'x'), app })
      )
    ).toBe('--root-only files must be placed at the app root');
  });

  test('`_`・`.`・node_modules を含む path は断る', async () => {
    for (const part of ['_private', '.cache', 'node_modules']) {
      const path = join(app, 'user', part, 'deep');
      expect(
        await usageError(generate({ kind: 'conv', name: 'cmd', path, app }))
      ).toBe('--path contains a directory ignored by the router');
    }
  });

  test('途中のディレクトリがシンボリックリンクなら断り、何も書かない', async () => {
    const real = join(root, 'real');
    await mkdir(real, { recursive: true });
    await mkdir(app, { recursive: true });
    await symlink(real, join(app, 'linked'), 'dir');
    const message = await usageError(
      generate({
        kind: 'conv',
        name: 'cmd',
        path: join(app, 'linked', 'child'),
        app,
      })
    );
    expect(message).toBe(
      `Cannot generate through a symbolic link: ${join(app, 'linked')}`
    );
    expect(await readdir(real)).toEqual([]);
  });
});
