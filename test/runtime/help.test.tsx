import { describe, expect, test } from 'bun:test';

import { render } from 'decopin-cli';

import type { ArgvSpec, StdinSpec } from '../../src/declaration/spec.ts';
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

async function help(argv: ArgvSpec, command = 'hello', stdin?: StdinSpec) {
  const result = await render(
    <Help program="cli" command={command} spec={argv} stdin={stdin} />,
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

describe('Help — stdin の宣言', () => {
  test('宣言が無ければ Stdin の節を出さない', async () => {
    expect(await help(spec)).not.toContain('Stdin:');
  });

  test('required なら「パイプしてください」と伝える', async () => {
    const text = await help(spec, 'count', {
      mode: 'lines',
      required: true,
      trim: false,
    });
    expect(text).toContain('Stdin:');
    expect(text).toContain('lines');
    expect(text).toContain('required (pipe something in)');
  });

  test('required でなければ端末では undefined になると伝える', async () => {
    const text = await help(spec, 'upper', {
      mode: 'text',
      required: false,
      trim: true,
    });
    expect(text).toContain('optional (undefined when run in a terminal)');
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

  test('group を渡すと usage 行と表示名がその配下になる', async () => {
    const result = await render(
      <CommandList
        program="cli"
        commands={['user/import', 'user/list']}
        group="user"
      />,
      plain
    );
    expect(result.stdout).toContain('Usage: cli user <command> [options]');
    // グループ名を除いた、打つべき残りの語だけを出す
    expect(result.stdout).toContain('  import');
    expect(result.stdout).toContain('  list');
    expect(result.stdout).not.toContain('user import');
    expect(result.stdout).toContain('Run "cli user <command> --help"');
  });

  test('説明があれば名前を揃えて添える。無いものは名前だけ', async () => {
    const result = await render(
      <CommandList
        program="cli"
        commands={['a', 'longer', 'user/list']}
        descriptions={{ a: 'first', 'user/list': 'List users.' }}
      />,
      plain
    );
    expect(result.stdout).toContain('  a          first');
    expect(result.stdout).toContain('  longer\n');
    expect(result.stdout).toContain('  user list  List users.');
  });

  test('行末に空白を残さない', async () => {
    const result = await render(
      <CommandList
        program="cli"
        commands={['a', 'longer']}
        descriptions={{ a: 'x' }}
      />,
      plain
    );
    for (const line of result.stdout.split('\n')) {
      expect(line).toBe(line.trimEnd());
    }
  });
});
