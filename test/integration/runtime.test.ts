/**
 * 生成された CLI の結合テスト。
 *
 * ビルドは自前でやる。見ているのは「生成物が宣言どおりに動くか」で、
 * build.test.ts には依存しない (どちらが落ちたのか混ざらないように)。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../src/core/build/index.ts';
import { pipeline } from '../fixtures/pipeline.ts';

const REPO = process.cwd();
let workspace: string;
/** 生成物は 'decopin-cli' を import するので、リポジトリ内に置く */
let workDir: string;
let outPath: string;
/** 生成された entry.ts (--compile の入力) */
let entryPath: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'decopin-runtime-'));
  workDir = await mkdtemp(join(REPO, '.decopin-test-'));
  const result = await build({
    appDir: 'demo/app',
    workDir,
    outDir: join(workspace, 'dist'),
  });
  outPath = result.outPath;
  entryPath = result.files.entry;
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

describe('app/ の階層がそのままコマンドの階層になり、入れ子も引数なしで辿れる', () => {
  test('app/hello/cmd.tsx が hello で動く', async () => {
    const result = await cli(['hello']);
    expect(result.stdout).toBe('hello, world\n');
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
  });

  test('ディレクトリの入れ子がサブコマンドになる', async () => {
    const result = await cli(['user', 'list']);
    expect(result.stdout).toBe('USERS\nalice\nbob\n');
    expect(result.code).toBe(0);
  });
});

describe('argv.tsx の宣言どおりに位置引数・オプション・短縮形・既定値・繰り返し・束ねを受け取る', () => {
  test('宣言どおりに位置引数とオプションを受け取る', async () => {
    const result = await cli(['hello', 'Alice', '--loud']);
    expect(result.stdout).toBe('HELLO, ALICE!\n');
    expect(result.code).toBe(0);
  });

  test('短縮形と既定値が効く', async () => {
    const result = await cli(['hello', 'Bob', '-t', '2']);
    expect(result.stdout).toBe('hello, Bob\nhello, Bob\n');
  });

  test('繰り返し指定は配列になる', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--tag', 'x']);
    expect(result.stdout).toBe('USERS\nalice\nfiltered by: x\n');
  });

  test('boolean の alias を束ねられる (-nu)', async () => {
    const bundled = await cli(['count', '-nu'], 'a\n\na\nb\n');
    const separate = await cli(['count', '-n', '-u'], 'a\n\na\nb\n');
    expect(bundled.stdout).toBe('2\n');
    expect(bundled.stdout).toBe(separate.stdout);
    expect(bundled.code).toBe(0);
  });
});

describe('stdin.tsx の宣言どおりに標準入力を lines / text / json として読む', () => {
  test('mode="lines" はパイプした行を数える', async () => {
    const result = await cli(['count'], 'a\nb\n\nc\n');
    expect(result.stdout).toBe('4\n');
    expect(result.code).toBe(0);
  });

  test('stdin とオプションを組み合わせられる', async () => {
    const result = await cli(['count', '--non-empty'], 'a\n\nb\n');
    expect(result.stdout).toBe('2\n');
  });

  test('mode="text" の trim が効く', async () => {
    const result = await cli(['upper'], 'hello\n');
    expect(result.stdout).toBe('HELLO\n');
  });

  test('JSON の構造を宣言どおりに検証する', async () => {
    const result = await cli(
      ['user', 'import'],
      '[{"name":"alice","admin":true},{"name":"bob"}]'
    );
    expect(result.stdout).toBe('USERS\nalice (admin)\nbob\nimported 2\n');
    expect(result.code).toBe(0);
  });
});

describe('宣言に合わない引数・入力は実行せず、理由を stderr に出して exit 2', () => {
  test('検証に失敗すると exit 2 で stderr に理由が出る', async () => {
    const result = await cli(['hello', '--times', '9']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--times:');
    expect(result.code).toBe(2);
  });

  test('未知のオプションも exit 2', async () => {
    const result = await cli(['hello', '--nope']);
    expect(result.stderr).toContain('Unknown option: --nope');
    expect(result.code).toBe(2);
  });

  test('非配列オプションの重複は exit 2', async () => {
    const result = await cli(['hello', '-t', '1', '-t', '2']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('takes only one value');
    expect(result.code).toBe(2);
  });

  test('JSON が構造に合わなければ exit 2', async () => {
    const result = await cli(['user', 'import'], '[{"admin":true}]');
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('does not match the declared structure');
    expect(result.code).toBe(2);
  });

  test('壊れた JSON も exit 2', async () => {
    const result = await cli(['user', 'import'], 'not json');
    expect(result.stderr).toContain('stdin is not valid JSON');
    expect(result.code).toBe(2);
  });
});

describe('--help が宣言から使い方を組み立て、help.tsx があれば足して stdout に exit 0', () => {
  test('--help は宣言から使い方を出して exit 0', async () => {
    const result = await cli(['hello', '--help']);
    expect(result.stdout).toContain('Usage: decopin-cli hello [name]');
    expect(result.stdout).toContain('-l, --loud');
    expect(result.stdout).toContain('-h, --help');
    expect(result.code).toBe(0);
  });

  test('コマンド単位の help.tsx を生成された使い方に足せる', async () => {
    const result = await cli(['count', '--help']);
    expect(result.stdout).toContain('Stdin:');
    expect(result.stdout).toContain('Examples:');
    expect(result.stdout).toContain('| decopin-cli count');
    expect(result.code).toBe(0);
  });

  test('stdin の宣言も使い方に出る', async () => {
    const result = await cli(['count', '--help']);
    expect(result.stdout).toContain('Stdin:');
    expect(result.stdout).toContain('required (pipe something in)');
    expect(result.code).toBe(0);
  });
});

describe('コマンド名が無い・間違っている・グループ止まりのときは、候補か一覧を stderr に出して exit 2', () => {
  test('未知のコマンドは app/not-found.tsx で表示され exit 2', async () => {
    const result = await cli(['helo']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('no such command: helo');
    expect(result.stderr).toContain('Did you mean');
    expect(result.code).toBe(2);
  });

  test('引数なしはコマンド一覧を stderr に出して exit 2', async () => {
    const result = await cli([]);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage: decopin-cli <command> [options]');
    expect(result.code).toBe(2);
  });

  test('グループ止まりは配下の一覧、--help なら stdout + exit 0', async () => {
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
  });
});

describe('一番近い error.tsx が使われ、無ければ上位を辿り、最後は global-error.tsx に落ちる', () => {
  test('自分の error.tsx が使われ、<Exit> で終了コードを上書きできる', async () => {
    const result = await cli(['crash']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('crash: the command exploded\n');
    expect(result.code).toBe(42);
  });

  test('上位ディレクトリの error.tsx を継承する', async () => {
    const result = await cli(['user', 'list', '-n', '0']);
    expect(result.stderr).toContain('user: --limit:');
    expect(result.stderr).toContain('Try: user list --help');
    expect(result.code).toBe(2);
  });

  test('error.tsx が無いコマンドは global-error.tsx に落ちる', async () => {
    const result = await cli(['hello', '--times', '99']);
    expect(result.stderr).toContain('Invalid usage: --times:');
    expect(result.stderr).toContain('exit code 2');
    expect(result.code).toBe(2);
  });
});

describe('layout.tsx が出力を包む。失敗したときは layout ごと stderr 側に出す', () => {
  test('layout の見出しが出力を包む', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--tag', 'x']);
    expect(result.stdout).toBe('USERS\nalice\nfiltered by: x\n');
  });

  test('失敗したときは layout ごと stderr 側に出す', async () => {
    const result = await cli(['user', 'list', '-n', '0']);
    // 失敗したときに layout の見出しが stdout に出ると誤解を生む
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('USERS');
    expect(result.code).toBe(2);
  });
});

describe('middleware.tsx が next の前後に割り込め、stdout を汚さずに足せる', () => {
  test('middleware は next の後で stderr に足せる', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--verbose']);
    expect(result.stdout).toBe('USERS\nalice\n');
    expect(result.stderr).toMatch(/took \d+ms/);
    expect(result.code).toBe(0);
  });
});

describe('端末でなければ装飾を落とし、パイプの先で読める出力にする', () => {
  test('パイプ経由では装飾を落とす', async () => {
    const result = await cli(['hello']);
    expect(result.stdout).not.toContain('\x1b[');
  });
});

describe('パイプが詰まっても出力を最後まで書いてから終わる。読み手が先に閉じたら黙って終わる', () => {
  // パイプやソケットのバッファに収まらない大きさを出す。手元の実測では、
  // 修正前に届いていたのは 8KB (ソケット) 〜 128KB (stderr、速い読み手) まで。
  // 引数 1 つは Linux で 128KB までなので、長い名前を --times で繰り返す
  const name = 'x'.repeat(100_000);
  const HELLO = ['hello', name, '--times', '5'];
  const greeting = `hello, ${name}\n`.repeat(5);

  /**
   * CLI の stdout を、シェルのパイプで読み手につなぐ。Bun.spawn の
   * 'pipe' は親がすぐ読むので、詰まった状態を作れない。
   * CLI の終了コードは、読み手に渡さない stderr 側に `exit=<code>` で残す
   */
  function piped(reader: string, command = ['bun', outPath]) {
    return pipeline(`{ "$@"; echo "exit=$?" >&2; } | ${reader}`, [
      'sh',
      ...command,
      ...HELLO,
    ]);
  }

  test('読み手が遅くても全量が届く', async () => {
    const result = await piped('(sleep 0.3; cat)');
    expect(result.stdout.length).toBe(greeting.length);
    expect(result.stdout === greeting).toBe(true);
    expect(result.stderr).toBe('exit=0\n');
  }, 30_000);

  test('読み手が速くても全量が届く', async () => {
    const result = await piped('cat');
    expect(result.stdout.length).toBe(greeting.length);
    expect(result.stdout === greeting).toBe(true);
    expect(result.stderr).toBe('exit=0\n');
  }, 30_000);

  test('stderr も、読み手が遅くても全量が届く', async () => {
    // 未知のコマンドは not-found.tsx が stderr に出す。打った語が長ければ出力も長い。
    // 期待する中身は、書き込みが同期になるファイル宛てで取る
    const words = [name, 'y'.repeat(100_000)];
    const file = join(workspace, 'not-found.txt');
    const direct = await pipeline(
      'bun "$0" "$1" "$2" 2>"$3" >/dev/null; echo "exit=$?"',
      [outPath, ...words, file]
    );
    expect(direct.stdout).toBe('exit=2\n');
    const expected = await Bun.file(file).text();
    expect(expected.length).toBeGreaterThan(200_000);

    const result = await pipeline(
      '{ bun "$0" "$1" "$2" 2>&1 >/dev/null; echo "exit=$?" >&2; } | (sleep 0.3; cat)',
      [outPath, ...words]
    );
    expect(result.stdout.length).toBe(expected.length);
    expect(result.stdout === expected).toBe(true);
    expect(result.stderr).toBe('exit=2\n');
  }, 30_000);

  test('ソケットにつながれていても (子プロセスとして呼ばれた形)、読み手が遅くても全量が届く', async () => {
    // ソケットのバッファはパイプより大きいことがある (Linux の既定は 200KB ほど)。
    // 収まってしまうと詰まらないので、それより大きいことを確かめておく
    expect(greeting.length).toBeGreaterThan(256 * 1024);

    const received = join(workspace, 'socket.txt');
    const proc = Bun.spawn(
      [
        'bun',
        join(REPO, 'test/fixtures/slow-socket.ts'),
        received,
        'bun',
        outPath,
        ...HELLO,
      ],
      { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', timeout: 20_000 }
    );
    const [report, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(stderr).toBe('');
    expect(JSON.parse(report)).toEqual({ code: 0, stderr: '' });

    const got = await Bun.file(received).text();
    expect(got.length).toBe(greeting.length);
    expect(got === greeting).toBe(true);
  }, 30_000);

  test('--compile --bytecode のバイナリでも、読み手が遅くても全量が届く', async () => {
    const binary = join(workspace, 'demo-bin');
    const compile = Bun.spawn(
      [
        'bun',
        'build',
        '--compile',
        '--bytecode',
        entryPath,
        '--outfile',
        binary,
      ],
      { cwd: REPO, stdout: 'ignore', stderr: 'pipe' }
    );
    const [problem, compiled] = await Promise.all([
      new Response(compile.stderr).text(),
      compile.exited,
    ]);
    expect({ compiled, problem: compiled === 0 ? '' : problem }).toEqual({
      compiled: 0,
      problem: '',
    });

    const result = await piped('(sleep 0.3; cat)', [binary]);
    expect(result.stdout.length).toBe(greeting.length);
    expect(result.stdout === greeting).toBe(true);
    expect(result.stderr).toBe('exit=0\n');
  }, 60_000);

  test('ファイル宛ては、今までどおり全量を書いて終わる', async () => {
    const file = join(workspace, 'hello.txt');
    const result = await pipeline(
      'out="$1"; shift; bun "$@" >"$out"; echo "exit=$?" >&2',
      ['sh', file, outPath, ...HELLO]
    );
    expect(result.stderr).toBe('exit=0\n');
    expect((await Bun.file(file).text()) === greeting).toBe(true);
  }, 30_000);

  test('stdout が閉じていても、エラーを出さずに終了コードをそのまま返す', async () => {
    const result = await pipeline('bun "$@" >&-; echo "exit=$?" >&2', [
      'sh',
      outPath,
      ...HELLO,
    ]);
    expect(result).toEqual({ stdout: '', stderr: 'exit=0\n', code: 0 });
  }, 30_000);

  test('読み手がすぐ閉じたら、エラーを出さずに終了コードをそのまま返す', async () => {
    const result = await piped('head -c 100 >/dev/null');
    expect(result.stderr).toBe('exit=0\n');
  }, 30_000);

  test('書き残しを待っている間に読み手が閉じても同じ', async () => {
    const result = await piped('(head -c 100 >/dev/null; sleep 0.3)');
    expect(result.stderr).toBe('exit=0\n');
  }, 30_000);
});
