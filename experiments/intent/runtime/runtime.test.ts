/**
 * Intent `run-commands-as-declared` の Evidence。
 *
 * test/integration/build.test.ts の `describe('生成された CLI')` 22 テストを
 * ここへ移して Behavior に結び直したもの。検証の中身は変えていない。
 *
 * ビルドは自前でやる。この Intent が見ているのは「生成物が宣言どおりに動くか」
 * で、build の Evidence には依存しない (どちらが落ちたのか混ざらないように)。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../../src/core/build/index.ts';
import { toDocument, toReport } from '../core.ts';
import { describeBehavior, proves, report } from '../evidence.bun.ts';
import { IMPLEMENTATION as RUNTIME } from './implementation.ts';

const REPO = process.cwd();
let workspace: string;
/** 生成物は 'decopin-cli' を import するので、リポジトリ内に置く */
let workDir: string;
let outPath: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'decopin-runtime-'));
  workDir = await mkdtemp(join(REPO, '.decopin-test-'));
  const result = await build({
    appDir: 'demo/app',
    workDir,
    outDir: join(workspace, 'dist'),
  });
  outPath = result.outPath;
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
  await rm(workDir, { recursive: true, force: true });
});

/** ビルド済みの CLI を別プロセスで実行する */
async function cli(args: string[], input?: string) {
  const proc = Bun.spawn(['bun', outPath, ...args], {
    // input を渡さない場合は空の入力 (端末ではないので TTY 判定は false)
    stdin: new Blob([input ?? '']),
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

describeBehavior(RUNTIME, 'routes-directories-to-commands', () => {
  proves('app/hello/cmd.tsx が hello で動く', async () => {
    const result = await cli(['hello']);
    expect(result.stdout).toBe('hello, world\n');
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
  });

  proves('ディレクトリの入れ子がサブコマンドになる', async () => {
    const result = await cli(['user', 'list']);
    expect(result.stdout).toBe('USERS\nalice\nbob\n');
    expect(result.code).toBe(0);
  });
});

describeBehavior(RUNTIME, 'parses-argv-as-declared', () => {
  proves('宣言どおりに位置引数とオプションを受け取る', async () => {
    const result = await cli(['hello', 'Alice', '--loud']);
    expect(result.stdout).toBe('HELLO, ALICE!\n');
    expect(result.code).toBe(0);
  });

  proves('短縮形と既定値が効く', async () => {
    const result = await cli(['hello', 'Bob', '-t', '2']);
    expect(result.stdout).toBe('hello, Bob\nhello, Bob\n');
  });

  proves('繰り返し指定は配列になる', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--tag', 'x']);
    expect(result.stdout).toBe('USERS\nalice\nfiltered by: x\n');
  });

  proves('boolean の alias を束ねられる (-nu)', async () => {
    const bundled = await cli(['count', '-nu'], 'a\n\na\nb\n');
    const separate = await cli(['count', '-n', '-u'], 'a\n\na\nb\n');
    expect(bundled.stdout).toBe('2\n');
    expect(bundled.stdout).toBe(separate.stdout);
    expect(bundled.code).toBe(0);
  });
});

describeBehavior(RUNTIME, 'reads-stdin-as-declared', () => {
  proves('mode="lines" はパイプした行を数える', async () => {
    const result = await cli(['count'], 'a\nb\n\nc\n');
    expect(result.stdout).toBe('4\n');
    expect(result.code).toBe(0);
  });

  proves('stdin とオプションを組み合わせられる', async () => {
    const result = await cli(['count', '--non-empty'], 'a\n\nb\n');
    expect(result.stdout).toBe('2\n');
  });

  proves('mode="text" の trim が効く', async () => {
    const result = await cli(['upper'], 'hello\n');
    expect(result.stdout).toBe('HELLO\n');
  });

  proves('JSON の構造を宣言どおりに検証する', async () => {
    const result = await cli(
      ['user', 'import'],
      '[{"name":"alice","admin":true},{"name":"bob"}]'
    );
    expect(result.stdout).toBe('USERS\nalice (admin)\nbob\nimported 2\n');
    expect(result.code).toBe(0);
  });
});

describeBehavior(RUNTIME, 'rejects-invalid-input', () => {
  proves('検証に失敗すると exit 2 で stderr に理由が出る', async () => {
    const result = await cli(['hello', '--times', '9']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--times:');
    expect(result.code).toBe(2);
  });

  proves('未知のオプションも exit 2', async () => {
    const result = await cli(['hello', '--nope']);
    expect(result.stderr).toContain('Unknown option: --nope');
    expect(result.code).toBe(2);
  });

  proves('非配列オプションの重複は exit 2', async () => {
    const result = await cli(['hello', '-t', '1', '-t', '2']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('takes only one value');
    expect(result.code).toBe(2);
  });

  proves('JSON が構造に合わなければ exit 2', async () => {
    const result = await cli(['user', 'import'], '[{"admin":true}]');
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('does not match the declared structure');
    expect(result.code).toBe(2);
  });

  proves('壊れた JSON も exit 2', async () => {
    const result = await cli(['user', 'import'], 'not json');
    expect(result.stderr).toContain('stdin is not valid JSON');
    expect(result.code).toBe(2);
  });
});

describeBehavior(RUNTIME, 'explains-usage-from-declarations', () => {
  proves('--help は宣言から使い方を出して exit 0', async () => {
    const result = await cli(['hello', '--help']);
    expect(result.stdout).toContain('Usage: decopin-cli hello [name]');
    expect(result.stdout).toContain('-l, --loud');
    expect(result.stdout).toContain('-h, --help');
    expect(result.code).toBe(0);
  });

  proves('コマンド単位の help.tsx を生成された使い方に足せる', async () => {
    const result = await cli(['count', '--help']);
    expect(result.stdout).toContain('Stdin:');
    expect(result.stdout).toContain('Examples:');
    expect(result.stdout).toContain('| decopin-cli count');
    expect(result.code).toBe(0);
  });

  proves('stdin の宣言も使い方に出る', async () => {
    const result = await cli(['count', '--help']);
    expect(result.stdout).toContain('Stdin:');
    expect(result.stdout).toContain('required (pipe something in)');
    expect(result.code).toBe(0);
  });
});

describeBehavior(RUNTIME, 'guides-when-the-command-is-missing', () => {
  proves('未知のコマンドは app/not-found.tsx で表示され exit 2', async () => {
    const result = await cli(['helo']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('no such command: helo');
    expect(result.stderr).toContain('Did you mean');
    expect(result.code).toBe(2);
  });

  proves('引数なしはコマンド一覧を stderr に出して exit 2', async () => {
    const result = await cli([]);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage: decopin-cli <command> [options]');
    expect(result.code).toBe(2);
  });

  proves(
    'グループ止まりは配下の一覧、--help なら stdout + exit 0',
    async () => {
      const implicit = await cli(['user']);
      expect(implicit.stdout).toBe('');
      expect(implicit.stderr).toContain('Usage: decopin-cli user <command>');
      expect(implicit.code).toBe(2);

      const explicit = await cli(['user', '--help']);
      expect(explicit.stderr).toBe('');
      expect(explicit.stdout).toContain('Usage: decopin-cli user <command>');
      // app/user/help.tsx の上書きが効く
      expect(explicit.stdout).toContain('users are read from');
      expect(explicit.code).toBe(0);
    }
  );
});

describeBehavior(RUNTIME, 'handles-errors-where-declared', () => {
  proves(
    '自分の error.tsx が使われ、<Exit> で終了コードを上書きできる',
    async () => {
      const result = await cli(['crash']);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('crash: the command exploded\n');
      expect(result.code).toBe(42);
    }
  );

  proves('上位ディレクトリの error.tsx を継承する', async () => {
    const result = await cli(['user', 'list', '-n', '0']);
    expect(result.stderr).toContain('user: --limit:');
    expect(result.stderr).toContain('Try: user list --help');
    expect(result.code).toBe(2);
  });

  proves('error.tsx が無いコマンドは global-error.tsx に落ちる', async () => {
    const result = await cli(['hello', '--times', '99']);
    expect(result.stderr).toContain('Invalid usage: --times:');
    expect(result.stderr).toContain('exit code 2');
    expect(result.code).toBe(2);
  });
});

describeBehavior(RUNTIME, 'wraps-output-in-layout', () => {
  proves('layout の見出しが出力を包む', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--tag', 'x']);
    expect(result.stdout).toBe('USERS\nalice\nfiltered by: x\n');
  });

  proves('失敗したときは layout ごと stderr 側に出す', async () => {
    const result = await cli(['user', 'list', '-n', '0']);
    // 失敗したときに layout の見出しが stdout に出ると誤解を生む
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('USERS');
    expect(result.code).toBe(2);
  });
});

describeBehavior(RUNTIME, 'runs-middleware-around-the-command', () => {
  proves('middleware は next の後で stderr に足せる', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--verbose']);
    expect(result.stdout).toBe('USERS\nalice\n');
    expect(result.stderr).toMatch(/took \d+ms/);
    expect(result.code).toBe(0);
  });
});

describeBehavior(RUNTIME, 'keeps-pipes-clean', () => {
  proves('パイプ経由では装飾を落とす', async () => {
    const result = await cli(['hello']);
    expect(result.stdout).not.toContain('\x1b[');
  });
});

/** Graph そのものの検査。Behavior の証明ではないので proves() は使わない */
describe('Intent Graph', () => {
  test('Implementation が指すファイルが実在する', async () => {
    const missing: string[] = [];
    for (const carriers of Object.values(RUNTIME.carriers)) {
      for (const carrier of carriers) {
        if (!(await Bun.file(join(REPO, carrier.where)).exists())) {
          missing.push(carrier.where);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('ここまでの Evidence でドキュメントが組み立つ', () => {
    const doc = toDocument(toReport(RUNTIME));
    expect(doc).toContain('Intent: run-commands-as-declared');
    expect(doc).not.toContain('✗');
  });
});

// 全 Behavior が証明されたかを見て、.decopin-intent/ へ書き出す。必ず最後に呼ぶ
report(RUNTIME);
