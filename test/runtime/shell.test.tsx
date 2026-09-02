/**
 * shell.tsx (ADR 35)。
 *
 * 親シェルへの指示は stdout ではなく、シェル関数が `DECOPIN_SHELL_FILE` で
 * 渡す一時ファイルに書く。成功したときだけ書き、フックが無ければ stderr で言う。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  Arg,
  Argv,
  Br,
  Exit,
  generateShellHook,
  Line,
  renderShell,
  run,
  Shell,
} from 'decopin-cli';
import type { RouteTable } from 'decopin-cli';

import { resolveHosts } from '../../src/declaration/resolve.ts';

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'decopin-shell-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

function loader(value: unknown) {
  return async () => ({ default: value });
}

const table: RouteTable = {
  go: {
    argv: loader(() => (
      <Argv>
        <Arg name="to" type="string" required />
      </Argv>
    )),
    command: loader(({ args }: { args: { to: string } }) => (
      <Line>{`cd ${args.to}`}</Line>
    )),
    shell: loader(({ args }: { args: { to: string } }) => (
      <>
        <Shell.Cd to={args.to} />
        <Shell.Export name="LAST" value={args.to} />
      </>
    )),
  },
  fail: {
    command: loader(() => <Exit code={3} />),
    shell: loader(() => <Shell.Cd to="/never" />),
  },
  quiet: {
    command: loader(() => <Line>nothing to do</Line>),
    shell: loader(() => null),
  },
};

async function invoke(argv: string[], env: Record<string, string> = {}) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    program: 'cli',
    env,
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

describe('renderShell', () => {
  test('値は単一クォートで包み、中の引用符も安全に通す', async () => {
    const hosts = await resolveHosts(
      <>
        <Shell.Cd to="/tmp/it's here" />
        <Shell.Export name="TOKEN" value='a"b$c' />
        <Shell.Unset name="OLD" />
        <Shell.Alias name="ll" command="ls -la" />
        <Shell.Source file="~/.env" />
        <Shell.Raw code="echo raw" />
      </>
    );
    expect(renderShell(hosts)).toBe(
      [
        "cd '/tmp/it'\\''s here'",
        "export TOKEN='a\"b$c'",
        'unset OLD',
        "alias ll='ls -la'",
        "source '~/.env'",
        'echo raw',
        '',
      ].join('\n')
    );
  });

  test('識別子でない名前と、Shell.* 以外の部品は宣言の誤り', async () => {
    const bad = await resolveHosts(<Shell.Export name="1x" value="v" />);
    expect(() => renderShell(bad)).toThrow(/not a valid shell identifier/);
    const wrong = await resolveHosts(<Br />);
    expect(() => renderShell(wrong)).toThrow(/cannot be used in shell.tsx/);
  });
});

describe('run() と shell.tsx', () => {
  test('成功したら DECOPIN_SHELL_FILE に書き、stdout には出さない', async () => {
    const file = join(dir, 'out.sh');
    const result = await invoke(['go', 'docs'], { DECOPIN_SHELL_FILE: file });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('cd docs\n');
    expect(result.stderr).toBe('');
    expect(await Bun.file(file).text()).toBe("cd 'docs'\nexport LAST='docs'\n");
  });

  test('失敗したら書かない (エラーを読む前に足場を動かさない)', async () => {
    const file = join(dir, 'fail.sh');
    const result = await invoke(['fail'], { DECOPIN_SHELL_FILE: file });
    expect(result.code).toBe(3);
    expect(await Bun.file(file).exists()).toBe(false);
  });

  test('フックが無いなら stderr で言う。何も宣言しなければ黙る', async () => {
    const result = await invoke(['go', 'docs']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('cd docs\n');
    expect(result.stderr).toContain('Shell changes were not applied');
    expect(result.stderr).toContain('eval "$(cli __shell zsh)"');

    const quiet = await invoke(['quiet']);
    expect(quiet.stderr).toBe('');
  });
});

describe('__shell', () => {
  test('同名の関数を出す。本体は command で呼び、ファイルがあれば source する', async () => {
    const result = await invoke(['__shell', 'zsh']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(generateShellHook('cli', 'zsh'));
    expect(result.stdout).toContain('cli() {');
    expect(result.stdout).toContain(
      'DECOPIN_SHELL_FILE="$__decopin_cli_out" command cli "$@"'
    );
    expect(result.stdout).toContain('. "$__decopin_cli_out"');
  });

  test('対応していないシェルは使い方を出して exit 2', async () => {
    const result = await invoke(['__shell', 'fish']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('__shell <zsh|bash>');
  });

  test('出した関数は zsh と bash がそのまま読める', async () => {
    for (const shell of ['zsh', 'bash'] as const) {
      const proc = Bun.spawn([shell, '-n'], {
        stdin: new Blob([generateShellHook('my-cli', shell)]),
        stderr: 'pipe',
      });
      expect(await proc.exited).toBe(0);
    }
  });
});
