/**
 * 入力が端末を操作できないことの検査。
 *
 * 診断には入力がそのまま入る (`Unknown command: <打たれた語>`、
 * `received "<値>"`)。入力に ESC や復帰文字があると、端末はそれを命令として
 * 読み、エラーの行を消したり、別の文面を描いたりできる。入力は打った本人の
 * ものとは限らない (パイプの向こうのファイル、別のプログラムが組んだ argv)。
 *
 * 守っている不変条件:
 *   1. 色を切った stderr に制御文字が 1 バイトも出ない (改行とタブを除く)
 *   2. 色を付けた stderr に出る ESC は、枠組みが付けた装飾 (SGR) だけ
 *   3. `error.tsx` / `not-found.tsx` が受け取る文面も同じ (そのまま描いてよい)
 *   4. 入力の改行で、診断の行は増えない
 *
 * 文字そのものではなくバイトを見る。端末が読むのはバイトだから
 */
import { describe, expect, test } from 'bun:test';

import {
  Arg,
  Argv,
  authRequired,
  Line,
  notFound,
  Option,
  run,
  Stdin,
  Type,
} from 'decopin-cli';
import type { RouteTable, RunOptions } from 'decopin-cli';

const ESC = String.fromCharCode(0x1b);
const CR = String.fromCharCode(0x0d);
/** 8 ビットの CSI。ESC 無しで同じことができる */
const CSI = String.fromCharCode(0x9b);
const BEL = String.fromCharCode(0x07);
const DEL = String.fromCharCode(0x7f);
/** 行を消して先頭に戻り、別の文面を描く */
const PAYLOAD = `untrusted${ESC}[2K${CR}marker${CSI}1A${BEL}${DEL}`;

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

/** 改行とタブを除く制御文字 (C0・DEL・C1) の文字コード */
function controls(text: string): number[] {
  const found: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code === 0x0a || code === 0x09) continue;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) found.push(code);
  }
  return found;
}

const table: RouteTable = {
  num: {
    argv: loader(() => (
      <Argv>
        <Arg name="who" type="string" />
        <Option name="count">
          <Type.Number />
        </Option>
        <Option name="level">
          <Type.Enum values={['low', 'high']} />
        </Option>
      </Argv>
    )),
    cmd: loader(() => <Line>ok</Line>),
  },
  'from-stdin': {
    stdin: loader(() => (
      <Stdin mode="json">
        <Type.Number />
      </Stdin>
    )),
    cmd: loader(() => <Line>ok</Line>),
  },
  find: {
    argv: loader(() => (
      <Argv>
        <Arg name="name" type="string" required />
      </Argv>
    )),
    cmd: loader(({ args }: { args: { name: string } }) =>
      notFound({ what: 'user', requested: args.name, available: ['ada'] })
    ),
  },
  throws: {
    argv: loader(() => (
      <Argv>
        <Arg name="name" type="string" required />
      </Argv>
    )),
    cmd: loader(({ args }: { args: { name: string } }) => {
      throw new Error(`could not open ${args.name}`);
    }),
  },
};

/**
 * 入力を診断に埋める組み込みの経路。
 * `shows` は、入力が見える表記で残っていることを確かめる文字列
 */
const SHOWN = 'untrusted\\x1b[2K\\rmarker';
const CASES: Record<
  string,
  { argv: string[]; stdin?: string; shows?: string }
> = {
  未知のコマンド: { argv: [`bo${PAYLOAD}gus`] },
  未知のオプション: { argv: ['num', `--bo${PAYLOAD}gus`] },
  数値に直せないオプション: { argv: ['num', `--count=${PAYLOAD}`] },
  選択肢の外のオプション: { argv: ['num', `--level=${PAYLOAD}`] },
  余った位置引数: { argv: ['num', 'a', PAYLOAD] },
  '宣言と合わない JSON の標準入力': {
    argv: ['from-stdin'],
    stdin: JSON.stringify(PAYLOAD),
  },
  'JSON として読めない標準入力': {
    argv: ['from-stdin'],
    // JSON の読み手は最初に読めなかった字だけを文面に入れる
    stdin: `${ESC}[2K${CR}marker`,
    shows: '\\x1b',
  },
  'notFound() に渡した値': { argv: ['find', PAYLOAD] },
  利用者のコードが投げたエラーの文面: { argv: ['throws', PAYLOAD] },
};

async function invoke(
  name: keyof typeof CASES,
  extra: RunOptions = {},
  routes: RouteTable = table
) {
  const { argv, stdin, shows = SHOWN } = CASES[name] as (typeof CASES)[string];
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(routes, {
    argv,
    program: 'cli',
    env: { NO_COLOR: '1' },
    targets: { stdout, stderr },
    stdin:
      stdin === undefined
        ? { isTTY: true, read: async () => '' }
        : { isTTY: false, read: async () => stdin },
    ...extra,
  });
  return { code, stdout: stdout.text, stderr: stderr.text, shows };
}

describe('色を切った stderr に制御文字が出ない', () => {
  for (const name of Object.keys(CASES)) {
    test(name, async () => {
      const result = await invoke(name);
      expect(result.code).not.toBe(0);
      expect(result.stdout).toBe('');
      // 入力は消さずに見える表記で残す (何が渡されたか分かるように)
      expect(result.stderr).toContain(result.shows);
      expect(controls(result.stderr)).toEqual([]);
    });
  }
});

describe('色を付けた stderr に出る ESC は、枠組みの装飾だけ', () => {
  const SGR = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
  for (const name of Object.keys(CASES)) {
    test(name, async () => {
      const result = await invoke(name, {
        env: { FORCE_COLOR: '1' },
        isTTY: { stdout: true, stderr: true },
      });
      // 装飾が実際に付いていること (付いていなければこの検査は空振り)
      expect(result.stderr).toMatch(SGR);
      expect(controls(result.stderr.replace(SGR, ''))).toEqual([]);
    });
  }
});

describe('error.tsx / not-found.tsx が受け取る文面にも制御文字が無い', () => {
  // 利用者の表示係は受け取った文面をそのまま描くのが普通
  const echo = loader(
    ({ error }: { error: { message: string; issues: string[] } }) => (
      <Line>{[error.message, ...error.issues].join(' | ')}</Line>
    )
  );
  const withHandler: RouteTable = Object.fromEntries(
    Object.entries(table).map(([name, route]) => [
      name,
      { ...route, errors: [echo] },
    ])
  );

  for (const name of [
    '未知のオプション',
    '数値に直せないオプション',
    '選択肢の外のオプション',
    '余った位置引数',
    '宣言と合わない JSON の標準入力',
    'JSON として読めない標準入力',
    'notFound() に渡した値',
    '利用者のコードが投げたエラーの文面',
  ] as const) {
    test(`error.tsx: ${name}`, async () => {
      const result = await invoke(name, {}, withHandler);
      expect(result.stderr).toContain(result.shows);
      expect(controls(result.stderr)).toEqual([]);
    });
  }

  test('error.tsx: 利用者のコードが付けた hints', async () => {
    const hinted: RouteTable = {
      hinted: {
        errors: [
          loader(({ error }: { error: { hints: string[] } }) => (
            <Line>{error.hints.join(' | ')}</Line>
          )),
        ],
        cmd: loader(() => {
          authRequired({ fix: `tool login ${PAYLOAD}` });
        }),
      },
    };
    const stderr = recorder();
    await run(hinted, {
      argv: ['hinted'],
      program: 'cli',
      env: { NO_COLOR: '1' },
      targets: { stdout: recorder(), stderr },
    });
    expect(stderr.text).toContain(SHOWN);
    expect(controls(stderr.text)).toEqual([]);
  });

  test('not-found.tsx: 未知のコマンド', async () => {
    const result = await invoke('未知のコマンド', {
      notFound: loader(({ requested }: { requested: string }) => (
        <Line>{`no ${requested}`}</Line>
      )),
    });
    expect(result.stderr).toContain('no bountrusted\\x1b[2K\\rmarker');
    expect(controls(result.stderr)).toEqual([]);
  });
});

describe('入力の改行で診断の行は増えない', () => {
  const FORGED = 'x\n✖ Fatal: disk failure';
  const cases: Record<string, string[]> = {
    未知のコマンド: [FORGED],
    未知のオプション: ['num', `--${FORGED}`],
    数値に直せないオプション: ['num', `--count=${FORGED}`],
  };
  for (const [name, argv] of Object.entries(cases)) {
    test(name, async () => {
      const stderr = recorder();
      await run(table, {
        argv,
        program: 'cli',
        env: { NO_COLOR: '1' },
        targets: { stdout: recorder(), stderr },
      });
      expect(stderr.text).toContain('x\\n✖ Fatal: disk failure');
      // 行頭に「✖」が立つのは、枠組みが出した 1 行だけ
      expect(
        stderr.text.split('\n').filter((line) => line.startsWith('✖'))
      ).toHaveLength(1);
    });
  }
});
