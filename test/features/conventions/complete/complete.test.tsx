/**
 * `complete/runtime.ts` と `complete/build.ts` の単体テスト。
 *
 * `__complete` を経由した結末は test/intent/complete/ が見ているので、
 * ここでは `completionCandidates` を直に呼んで候補の中身 (説明の出どころ、
 * 隠しオプション、位置引数の数え方、complete.tsx に渡る文脈) と、
 * プロトコル形式への整形 `formatCandidates`、bin 名の解決の落ち方を見る。
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Arg, Argv, Line, Option, Type } from 'decopin-cli';
import type { RouteTable } from 'decopin-cli';

import { resolveBinaryName } from '../../../../src/features/conventions/complete/build.ts';
import {
  completionCandidates,
  formatCandidates,
} from '../../../../src/features/conventions/complete/runtime.ts';
import type { CompleteProps } from '../../../../src/features/conventions/complete/runtime.ts';

function loader(value: unknown) {
  return async () => ({ default: value });
}

const cmd = loader(() => <Line>ok</Line>);

const table: RouteTable = {
  '': {
    cmd,
    argv: loader(() => (
      <Argv>
        <Option name="verbose" type="boolean" default={false} />
      </Argv>
    )),
  },
  build: {
    cmd,
    argv: loader(() => (
      <Argv description="Build the app.">
        <Arg name="target" required>
          <Type.Enum values={['web', 'cli']} />
        </Arg>
        <Option name="out" type="string" default="dist" description="where" />
        <Option name="secret" type="string" default="" hidden />
      </Argv>
    )),
  },
  copy: {
    cmd,
    argv: loader(() => (
      <Argv>
        <Arg name="files" variadic>
          <Type.Array>
            <Type.Enum values={['a.txt', 'b.txt']} />
          </Type.Array>
        </Arg>
      </Argv>
    )),
  },
  'db/migrate': { cmd },
};

describe('completionCandidates: サブコマンド', () => {
  test('コマンドには argv.tsx の description が、グループには何も付かない', async () => {
    expect(await completionCandidates(table, [''])).toEqual([
      { value: 'build', description: 'Build the app.' },
      { value: 'copy', description: undefined },
      { value: 'db', description: undefined },
    ]);
  });

  test('どのコマンドにも当たらない語の後はルートコマンドの宣言で補う', async () => {
    const candidates = await completionCandidates(table, ['nope', '--v']);
    expect(candidates).toEqual([
      { value: '--verbose', description: undefined },
    ]);
  });
});

describe('completionCandidates: オプションと位置引数', () => {
  test('hidden のオプションは出さず、--help は常に最後に足す', async () => {
    expect(await completionCandidates(table, ['build', '--'])).toEqual([
      { value: '--out', description: 'where' },
      { value: '--help', description: 'show usage' },
    ]);
  });

  test('宣言した位置引数より後ろは候補を出さない', async () => {
    expect(await completionCandidates(table, ['build', 'w'])).toEqual([
      { value: 'web' },
    ]);
    expect(await completionCandidates(table, ['build', 'web', ''])).toEqual([]);
  });

  test('variadic の位置引数は何語目でも同じ宣言で補う', async () => {
    expect(await completionCandidates(table, ['copy', 'a.txt', 'b'])).toEqual([
      { value: 'b.txt' },
    ]);
  });
});

describe('completionCandidates: complete.tsx', () => {
  test('context の env / cwd がそのまま渡る', async () => {
    const seen: CompleteProps[] = [];
    const dynamic: RouteTable = {
      pick: {
        cmd,
        argv: loader(() => (
          <Argv>
            <Arg name="item" type="string" required />
          </Argv>
        )),
        complete: loader((props: CompleteProps) => {
          seen.push(props);
          return [props.env.PREFIX ?? 'none'];
        }),
      },
    };
    const candidates = await completionCandidates(dynamic, ['pick', ''], {
      env: { PREFIX: 'from-env' },
      cwd: '/somewhere',
    });
    expect(candidates).toEqual([{ value: 'from-env' }]);
    expect(seen[0]).toMatchObject({
      name: 'item',
      partial: '',
      cwd: '/somewhere',
    });
  });

  test('default export が関数でなければ候補を足さない (投げない)', async () => {
    const odd: RouteTable = {
      pick: {
        cmd,
        argv: loader(() => (
          <Argv>
            <Arg name="item" type="string" required />
          </Argv>
        )),
        complete: loader(['not', 'a', 'function']),
      },
    };
    expect(await completionCandidates(odd, ['pick', ''])).toEqual([]);
  });
});

describe('formatCandidates', () => {
  test('1 行 1 候補で、説明があれば TAB で区切る', () => {
    expect(
      formatCandidates([
        { value: 'web', description: 'browser build' },
        { value: 'cli' },
        { value: 'empty', description: '' },
      ])
    ).toBe('web\tbrowser build\ncli\nempty\n');
  });

  test('候補が無ければ空文字 (シェルはファイル補完に落ちる)', () => {
    expect(formatCandidates([])).toBe('');
  });
});

describe('resolveBinaryName', () => {
  const original = process.cwd();
  let dir: string | undefined;

  afterEach(async () => {
    process.chdir(original);
    if (dir !== undefined) await rm(dir, { recursive: true, force: true });
    dir = undefined;
  });

  async function inDir(packageJson?: unknown) {
    dir = await mkdtemp(join(tmpdir(), 'decopin-complete-'));
    if (packageJson !== undefined) {
      await Bun.write(join(dir, 'package.json'), JSON.stringify(packageJson));
    }
    process.chdir(dir);
  }

  test('bin が文字列なら、スコープを除いたパッケージ名になる', async () => {
    await inDir({ name: '@acme/tool', bin: './cli.js' });
    expect(await resolveBinaryName('@acme/tool')).toBe('tool');
  });

  test('bin がオブジェクトなら最初のキー', async () => {
    await inDir({ name: 'tool', bin: { tl: './cli.js', other: './o.js' } });
    expect(await resolveBinaryName('tool')).toBe('tl');
  });

  test('package.json が無くても投げずに program から決める', async () => {
    await inDir();
    expect(await resolveBinaryName('@acme/fallback')).toBe('fallback');
  });
});
