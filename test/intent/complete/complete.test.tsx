/**
 * Intent `complete-from-the-declarations` の Evidence。
 *
 * 旧 `test/runtime/` の補完テスト (28 件) と旧 `test/build/` の zsh シムの
 * テスト (8 件) をここへ移して Behavior に結び直したもの。中身の考え方は
 * 変えていない。describe 8 つが Behavior 8 つに 1 対 1 で対応した訳ではなく、
 * 「値の補完」「短縮形に = を付けた形」「解釈は実行時のトークナイザと同じ」の
 * 3 つは結末で見て 2 つに束ね直した (behavior.ts のヘッダ)。
 *
 * プロトコル: `cli __complete -- <words...>` の最後の語が補完中の語で、
 * 候補は stdout に 1 行 1 つ (`値<TAB>説明`)。候補が無くても exit 0。
 * 候補の情報源は --help と同じ argv.tsx の宣言 (ADR 8)。
 */
import { expect } from 'bun:test';

import { Arg, Argv, Line, Option, run, Type } from 'decopin-cli';
import type { RouteTable } from 'decopin-cli';

import {
  binaryName,
  completionFileName,
  generateZshCompletion,
  resolveBinaryName,
} from '../../../src/features/conventions/complete/build.ts';
import { completionCandidates } from '../../../src/features/conventions/complete/runtime.ts';
import { describeBehavior, proves, report } from '../evidence.bun.ts';
import { IMPLEMENTATION as COMPLETE } from './implementation.ts';

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

/** `cli __complete -- <words...>` を叩き、stdout と終了コードを返す */
async function complete(table: RouteTable, words: string[]) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv: ['__complete', '--', ...words],
    env: { NO_COLOR: '1' },
    program: 'cli',
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

const deployArgv = () => (
  <Argv description="Deploy the app.">
    <Arg name="target" type="string" required description="what to deploy" />
    <Option name="env" alias="e" default="dev" description="environment">
      <Type.Enum values={['dev', 'prod']} />
    </Option>
    <Option
      name="force"
      type="boolean"
      default={false}
      description="skip checks"
    />
    <Option name="token" type="string" default="" hidden />
    <Option name="tag" description="repeatable">
      <Type.Array>
        <Type.String />
      </Type.Array>
    </Option>
  </Argv>
);

const modeArgv = () => (
  <Argv>
    <Arg name="mode" description="how fast">
      <Type.Enum values={['fast', 'slow']} />
    </Arg>
    {/* Type.Array<Type.Boolean> は繰り返せるフラグで、値を取らない */}
    <Option name="verbose" alias="v" description="say more">
      <Type.Array>
        <Type.Boolean />
      </Type.Array>
    </Option>
  </Argv>
);

const table: RouteTable = {
  hello: { cmd: loader(() => <Line>hi</Line>) },
  deploy: { cmd: loader(() => <Line>ok</Line>), argv: loader(deployArgv) },
  mode: { cmd: loader(() => <Line>ok</Line>), argv: loader(modeArgv) },
  'user/list': { cmd: loader(() => <Line>ok</Line>) },
  'user/create': { cmd: loader(() => <Line>ok</Line>) },
};

/** complete.tsx (ADR 38) を持つ表。seen には complete.tsx が受け取った props が溜まる */
const seen: unknown[] = [];
const dynamicTable: RouteTable = {
  branch: {
    argv: loader(() => (
      <Argv>
        <Arg name="name" type="string" required />
        <Option name="remote" type="string" default="origin" />
        <Option name="kind" default="feature">
          <Type.Enum values={['feature', 'fix']} />
        </Option>
      </Argv>
    )),
    cmd: loader(() => <Line>unused</Line>),
    complete: loader((props: unknown) => {
      seen.push(props);
      const { name } = props as { name: string };
      if (name === 'name')
        return ['main', 'feat/a', { value: 'fix/b', description: 'bugfix' }];
      if (name === 'remote') return ['origin', 'upstream'];
      return [];
    }),
  },
  slow: {
    argv: loader(() => (
      <Argv>
        <Arg name="x" type="string" required />
      </Argv>
    )),
    cmd: loader(() => <Line>unused</Line>),
    complete: loader(() => new Promise(() => {})),
  },
  broken: {
    argv: loader(() => (
      <Argv>
        <Arg name="x" type="string" required />
      </Argv>
    )),
    cmd: loader(() => <Line>unused</Line>),
    complete: loader(() => {
      throw new Error('boom');
    }),
  },
};

describeBehavior(COMPLETE, 'completes-commands', () => {
  proves('語が空なら、直下のコマンドとグループを昇順で出す', async () => {
    const result = await complete(table, ['']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    // 説明は argv.tsx の description。グループ (user) は名前だけ
    expect(result.stdout).toBe('deploy\tDeploy the app.\nhello\nmode\nuser\n');
  });

  proves('打ちかけの語で絞る。グループは 1 回だけ出る', async () => {
    const result = await complete(table, ['us']);
    expect(result.stdout).toBe('user\n');
  });

  proves('グループの下は、その下だけを出す', async () => {
    const result = await complete(table, ['user', '']);
    expect(result.stdout).toBe('create\nlist\n');
  });

  proves('当たらない語の下には何も出さない', async () => {
    const result = await complete(table, ['zzz', '']);
    expect(result).toEqual({ code: 0, stdout: '', stderr: '' });
  });
});

describeBehavior(COMPLETE, 'completes-options-once', () => {
  proves(
    '`-` を打ったら宣言したオプションと --help を出す (hidden は出さない)',
    async () => {
      const result = await complete(table, ['deploy', '-']);
      expect(result.stdout).toContain('--env\tenvironment\n');
      expect(result.stdout).toContain('--force\tskip checks\n');
      expect(result.stdout).toContain('--help\tshow usage\n');
      expect(result.stdout).not.toContain('--token');
    }
  );

  proves('一度打ったオプションは候補から消える', async () => {
    const result = await complete(table, ['deploy', '--env', 'dev', '-']);
    expect(result.stdout).not.toContain('--env');
    expect(result.stdout).toContain('--force');
  });

  proves('alias で打った場合も消える', async () => {
    const result = await complete(table, ['deploy', '-e', 'dev', '-']);
    expect(result.stdout).not.toContain('--env');
  });

  proves('`--name=value` で確定済みのオプションも消える', async () => {
    const result = await complete(table, ['deploy', '--env=dev', '-']);
    expect(result.stdout).not.toContain('--env');
    expect(result.stdout).toContain('--force');
  });

  proves('array のオプションは繰り返せるので消えない', async () => {
    const result = await complete(table, ['deploy', '--tag', 'a', '-']);
    expect(result.stdout).toContain('--tag');
  });
});

describeBehavior(COMPLETE, 'completes-declared-values', () => {
  proves('enum のオプションは値を出す', async () => {
    const result = await complete(table, ['deploy', '--env', '']);
    expect(result.stdout).toBe('dev\nprod\n');
  });

  proves('打ちかけの値で絞る', async () => {
    const result = await complete(table, ['deploy', '--env', 'p']);
    expect(result.stdout).toBe('prod\n');
  });

  proves('alias 経由でも値を出す', async () => {
    const result = await complete(table, ['deploy', '-e', '']);
    expect(result.stdout).toBe('dev\nprod\n');
  });

  proves('enum の位置引数は値を出す', async () => {
    const result = await complete(table, ['mode', 'f']);
    expect(result.stdout).toBe('fast\n');
  });

  proves('`--` の後は位置引数として補完する', async () => {
    const result = await complete(table, ['mode', '--', 'f']);
    expect(result.stdout).toBe('fast\n');
  });

  proves('`--name=` の形でも値を補完する (語全体を返す)', async () => {
    const result = await complete(table, ['deploy', '--env=']);
    expect(result.stdout).toBe('--env=dev\n--env=prod\n');
  });

  proves('`--name=部分` で絞る', async () => {
    const result = await complete(table, ['deploy', '--env=p']);
    expect(result.stdout).toBe('--env=prod\n');
  });

  proves('-e=pr は --env の値として補完する', async () => {
    const result = await complete(table, ['deploy', 'web', '-e=pr']);
    expect(result.stdout).toBe('-e=prod\n');
  });
});

describeBehavior(COMPLETE, 'reads-words-as-the-runtime-does', () => {
  proves(
    'boolean のオプションは値を取らない (次は位置引数に進む)',
    async () => {
      // target は string なので候補なし。シェル側がファイル補完に落ちる
      const result = await complete(table, ['deploy', '--force', '']);
      expect(result.stdout).toBe('');
    }
  );

  proves('単独の `-` は位置引数 (次の補完位置を 1 つ進める)', async () => {
    // mode の位置引数は 1 つだけ。`-` が 1 番目を埋めるので 2 番目は無い
    const result = await complete(table, ['mode', '-', '']);
    expect(result.stdout).toBe('');
  });

  proves(
    'Type.Array<Type.Boolean> のフラグは次の語を値として食わない',
    async () => {
      const result = await complete(table, ['mode', '--verbose', 'f']);
      expect(result.stdout).toBe('fast\n');
    }
  );

  proves('`--no-flag` の形も認識する', async () => {
    const result = await complete(table, ['mode', '--no-verbose', 'f']);
    expect(result.stdout).toBe('fast\n');
  });
});

describeBehavior(COMPLETE, 'asks-complete-tsx-at-runtime', () => {
  proves('位置引数の候補を返し、前方一致と説明を揃える', async () => {
    seen.length = 0;
    const result = await complete(dynamicTable, ['branch', 'f']);
    expect(result.stdout).toBe('feat/a\nfix/b\tbugfix\n');
    expect(seen[0]).toMatchObject({ name: 'name', partial: 'f', args: [] });
  });

  proves('オプションの値も補完し、宣言の enum と共存する', async () => {
    const remote = await complete(dynamicTable, [
      'branch',
      'main',
      '--remote',
      'up',
    ]);
    expect(remote.stdout).toBe('upstream\n');
    const inline = await complete(dynamicTable, [
      'branch',
      'main',
      '--remote=or',
    ]);
    expect(inline.stdout).toBe('--remote=origin\n');
    // enum は宣言から、complete.tsx は呼ばれても空を返す。両方が並ぶ
    const kind = await complete(dynamicTable, [
      'branch',
      'main',
      '--kind',
      'f',
    ]);
    expect(kind.stdout).toBe('feature\nfix\n');
  });

  proves('打った分は生の文字列で渡る', async () => {
    seen.length = 0;
    await complete(dynamicTable, ['branch', '--remote', 'upstream', 'ma']);
    expect(seen[0]).toMatchObject({
      name: 'name',
      partial: 'ma',
      options: { remote: ['upstream'] },
    });
  });
});

describeBehavior(COMPLETE, 'never-breaks-the-shell', () => {
  proves('complete.tsx が投げたら空で済む', async () => {
    const broken = await complete(dynamicTable, ['broken', 'x']);
    expect(broken.code).toBe(0);
    expect(broken.stdout).toBe('');
  });

  proves(
    'complete.tsx が返ってこなければ諦めて空 (打鍵を待たせない)',
    async () => {
      const started = performance.now();
      const candidates = await completionCandidates(
        dynamicTable,
        ['slow', 'x'],
        {
          timeoutMs: 50,
        }
      );
      expect(candidates).toEqual([]);
      expect(performance.now() - started).toBeLessThan(1000);
    }
  );

  proves('argv.tsx が壊れていても exit 0 で出せる分を返す', async () => {
    const broken: RouteTable = {
      boom: {
        cmd: loader(() => <Line>ok</Line>),
        argv: async () => {
          throw new Error('broken declaration');
        },
      },
    };
    const result = await complete(broken, ['boom', '-']);
    expect(result.code).toBe(0);
    // 宣言が読めない分の候補は無いが、--help は常に出せる
    expect(result.stdout).toBe('--help\tshow usage\n');
    expect(result.stderr).toBe('');
  });
});

describeBehavior(COMPLETE, 'leaves-normal-arguments-alone', () => {
  proves('`--` が無ければ補完ではなく、通常の引数として扱う', async () => {
    // ルートコマンドは未知の第 1 引数も位置引数として受け取れる。
    // `__complete` という文字列がその入力空間を奪ってはいけない
    const rootTable: RouteTable = {
      '': {
        cmd: loader(({ argv }: { argv: readonly string[] }) => (
          <Line>{argv.join(',')}</Line>
        )),
      },
    };
    const stdout = recorder();
    const stderr = recorder();
    const code = await run(rootTable, {
      argv: ['__complete', 'x'],
      env: { NO_COLOR: '1' },
      program: 'cli',
      targets: { stdout, stderr },
    });
    expect(code).toBe(0);
    expect(stdout.text).toBe('__complete,x\n');
  });
});

describeBehavior(COMPLETE, 'ships-a-shim-that-only-asks', () => {
  const shim = generateZshCompletion('my-cli');

  proves('1 行目は #compdef で、対象のコマンド名を宣言する', () => {
    expect(shim.startsWith('#compdef my-cli\n')).toBe(true);
  });

  proves('候補は CLI 自身に聞く (__complete)', () => {
    expect(shim).toContain('my-cli __complete -- ');
  });

  proves('コマンドの構成 (サブコマンド名) を含まない', () => {
    // シムに固有名詞が焼き込まれないことの代表値として、生成物が
    // program 名以外の入力を持たないことを見る: 同じ program なら常に同一
    expect(generateZshCompletion('my-cli')).toBe(shim);
  });

  proves('候補ゼロならファイル補完に落ちる', () => {
    expect(shim).toContain('_files');
  });

  proves('スコープ付きパッケージ名は bin 名に落とす', () => {
    expect(binaryName('@scope/tool')).toBe('tool');
    expect(completionFileName('@scope/tool')).toBe('_tool');
    const scoped = generateZshCompletion('@scope/tool');
    expect(scoped.startsWith('#compdef tool\n')).toBe(true);
    expect(scoped).toContain('tool __complete -- ');
    expect(scoped).not.toContain('@scope');
  });

  proves(
    '生成したシムは zsh がそのまま読める (手元に zsh があるとき)',
    async () => {
      if (Bun.which('zsh') === null) return;
      const proc = Bun.spawn(['zsh', '-n'], {
        stdin: new Blob([generateZshCompletion('my-cli')]),
        stderr: 'pipe',
      });
      expect(await proc.exited).toBe(0);
    }
  );

  proves('zsh の関数名に使えない文字は潰す', () => {
    const odd = generateZshCompletion('my.cli');
    expect(odd).toContain('_my_cli() {');
    expect(odd).toContain('compdef _my_cli my.cli');
  });

  proves(
    'コマンド名は package.json の bin のキー (name ではない)',
    async () => {
      // このリポジトリ自身が name: decopin-cli / bin: decopin の実例
      expect(await resolveBinaryName('decopin-cli')).toBe('decopin');
    }
  );
});

// 全 Behavior が証明されたかを見て、.decopin-intent/ へ書き出す。必ず最後に呼ぶ
report(COMPLETE);
