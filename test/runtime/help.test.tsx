import { describe, expect, test } from 'bun:test';

import { render } from 'decopin-cli';

import type { ArgvSpec } from '../../src/declaration/spec.ts';
import { CommandList, Help } from '../../src/runtime/help.tsx';

const plain = { color: { stdout: 0 as const, stderr: 0 as const } };

const spec: ArgvSpec = {
  description: 'Greet someone.',
  args: [
    {
      name: 'name',
      description: 'who to greet',
      required: false,
      defaultValue: 'world',
      variadic: false,
      type: { kind: 'string' },
    },
  ],
  options: [
    {
      name: 'loud',
      alias: 'l',
      description: 'shout it',
      required: false,
      defaultValue: false,
      hidden: false,
      type: { kind: 'boolean' },
    },
    {
      name: 'times',
      description: 'repeat count',
      required: false,
      hidden: false,
      type: { kind: 'number' },
    },
    {
      name: 'secret',
      required: false,
      hidden: true,
      type: { kind: 'string' },
    },
  ],
};

async function help(argv: ArgvSpec, command = 'hello') {
  const result = await render(
    <Help program="cli" command={command} spec={argv} />,
    plain
  );
  return result.stdout;
}

describe('Help', () => {
  test('宣言から使い方を組み立てる', async () => {
    const text = await help(spec);
    expect(text).toContain('Usage: cli hello [name] [options]');
    expect(text).toContain('Greet someone.');
    expect(text).toContain('name');
    expect(text).toContain('who to greet (default: "world")');
    expect(text).toContain('-l, --loud');
    expect(text).toContain('shout it (default: false)');
    expect(text).toContain('--times <number>');
    expect(text).toContain('-h, --help');
  });

  test('必須の位置引数は <> で囲む', async () => {
    const text = await help({
      args: [
        {
          name: 'target',
          required: true,
          variadic: false,
          type: { kind: 'string' },
        },
      ],
      options: [],
    });
    expect(text).toContain('Usage: cli hello <target>');
  });

  test('variadic は ... を付ける', async () => {
    const text = await help({
      args: [
        {
          name: 'files',
          required: true,
          variadic: true,
          type: { kind: 'string' },
        },
      ],
      options: [],
    });
    expect(text).toContain('<files...>');
  });

  test('hidden なオプションは出さない', async () => {
    expect(await help(spec)).not.toContain('secret');
  });

  test('サブコマンドは空白区切りで出す', async () => {
    const text = await help({ args: [], options: [] }, 'user/create');
    expect(text).toContain('Usage: cli user create');
  });

  test('説明が縦に揃う', async () => {
    const lines = (await help(spec)).split('\n');
    const loud = lines.find((line) => line.includes('--loud')) ?? '';
    const times = lines.find((line) => line.includes('--times')) ?? '';
    expect(loud.indexOf('shout it')).toBe(times.indexOf('repeat count'));
  });
});

describe('CommandList', () => {
  test('コマンドを一覧にする', async () => {
    const result = await render(
      <CommandList program="cli" commands={['hello', 'user/list']} />,
      plain
    );
    expect(result.stdout).toContain('Usage: cli <command> [options]');
    expect(result.stdout).toContain('hello');
    expect(result.stdout).toContain('user list');
    expect(result.stdout).toContain('Run "cli <command> --help" for details.');
  });
});
