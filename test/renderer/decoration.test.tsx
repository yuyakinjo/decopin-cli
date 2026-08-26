/**
 * Phase 7 の完了条件: 端末幅 40 / 80 / 120 でのスナップショット (§5.3 / §5.5)。
 */
import { describe, expect, test } from 'bun:test';

import {
  Box,
  Columns,
  Danger,
  Indent,
  Info,
  Json,
  KeyValue,
  Line,
  Link,
  List,
  render,
  RenderError,
  Success,
  Table,
  Warn,
} from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

/** 装飾を落として、文字の並びだけを見る */
function plain(node: RenderInput, columns: number) {
  return render(node, {
    color: { stdout: 0, stderr: 0 },
    columns,
    unicode: true,
  }).then((result) => result.stdout);
}

describe('Box', () => {
  const box = (
    <Box border="round" title="summary">
      <Line>hello</Line>
      <Line>日本語も桁がずれない</Line>
    </Box>
  );

  test('内容の幅に合わせて枠を組む (幅 80)', async () => {
    expect(await plain(box, 80)).toBe(
      [
        '╭─ summary ────────────╮',
        '│ hello                │',
        '│ 日本語も桁がずれない │',
        '╰──────────────────────╯',
        '',
      ].join('\n')
    );
  });

  test('幅 120 でも内容に合わせるだけ (端末幅まで広げない)', async () => {
    expect(await plain(box, 120)).toBe(await plain(box, 80));
  });

  test('端末幅に収まらなければ切る (幅 20)', async () => {
    const narrow = await plain(box, 20);
    for (const line of narrow.split('\n').filter((l) => l !== '')) {
      expect(line.length).toBeLessThanOrEqual(20);
    }
    expect(narrow).toContain('…');
  });

  test('border="none" は枠を描かない', async () => {
    expect(
      await plain(
        <Box border="none">
          <Line>bare</Line>
        </Box>,
        80
      )
    ).toBe('bare\n');
  });

  test('ASCII 端末では罫線が + と - になる', async () => {
    const result = await render(
      <Box border="round">
        <Line>x</Line>
      </Box>,
      { color: { stdout: 0 }, columns: 80, unicode: false }
    );
    expect(result.stdout).toBe(['+---+', '| x |', '+---+', ''].join('\n'));
  });
});

describe('Indent', () => {
  test('子ブロック全体を字下げする', async () => {
    expect(
      await plain(
        <>
          <Line>top</Line>
          <Indent by={4}>
            <Line>deep</Line>
            <Indent>
              <Line>deeper</Line>
            </Indent>
          </Indent>
        </>,
        80
      )
    ).toBe('top\n    deep\n      deeper\n');
  });
});

describe('Table', () => {
  const table = (
    <Table
      columns={['NAME', 'ROLE', 'SCORE']}
      rows={[
        ['alice', 'admin', 42],
        ['ボブ', 'user', 1234],
      ]}
      align={['left', 'left', 'right']}
    />
  );

  test('幅 80: 内容から列幅を決め、右寄せもできる', async () => {
    expect(await plain(table, 80)).toBe(
      [
        'NAME   ROLE   SCORE',
        'alice  admin     42',
        'ボブ   user    1234',
        '',
      ].join('\n')
    );
  });

  test('幅 120 でも同じ (内容以上に広げない)', async () => {
    expect(await plain(table, 120)).toBe(await plain(table, 80));
  });

  test('幅 40 に収まらない表は列を縮めて切る', async () => {
    const wide = (
      <Table columns={['A', 'B']} rows={[['x'.repeat(30), 'y'.repeat(30)]]} />
    );
    const narrow = await plain(wide, 40);
    for (const line of narrow.split('\n').filter((l) => l !== '')) {
      expect(line.length).toBeLessThanOrEqual(40);
    }
    expect(narrow).toContain('…');
  });

  test('headless で見出しを消せる', async () => {
    expect(
      await plain(<Table columns={['A']} rows={[['x']]} headless />, 80)
    ).toBe('x\n');
  });
});

describe('Columns', () => {
  const columns = (
    <Columns gap={4}>
      <List items={['one', 'two', 'three']} />
      <List items={['first', 'second']} ordered />
    </Columns>
  );

  test('幅 80: 横に並べ、行末に空白を残さない', async () => {
    expect(await plain(columns, 80)).toBe(
      ['- one      1. first', '- two      2. second', '- three', ''].join('\n')
    );
  });

  test('幅 40 でも収まる範囲で並べる', async () => {
    const narrow = await plain(columns, 40);
    for (const line of narrow.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(40);
    }
  });

  test('幅が足りなければ縮めて切る', async () => {
    const long = (
      <Columns>
        <Line>{'x'.repeat(40)}</Line>
        <Line>{'y'.repeat(40)}</Line>
      </Columns>
    );
    const narrow = await plain(long, 40);
    expect(narrow.split('\n')[0]?.length).toBeLessThanOrEqual(40);
    expect(narrow).toContain('…');
  });
});

describe('List', () => {
  test('箇条書き', async () => {
    expect(await plain(<List items={['a', 'b']} />, 80)).toBe('- a\n- b\n');
  });

  test('記号を変えられる', async () => {
    expect(await plain(<List items={['a']} bullet="•" />, 80)).toBe('• a\n');
  });

  test('番号付きは桁を揃える', async () => {
    const items = Array.from({ length: 10 }, (_, index) => `item${index + 1}`);
    const lines = (await plain(<List items={items} ordered />, 80)).split('\n');
    expect(lines[0]).toBe(' 1. item1');
    expect(lines[9]).toBe('10. item10');
  });
});

describe('KeyValue', () => {
  test('区切りごと桁を合わせる', async () => {
    expect(
      await plain(
        <KeyValue data={{ version: '0.1.0', routes: 6, unicode: true }} />,
        80
      )
    ).toBe('version: 0.1.0\nroutes:  6\nunicode: true\n');
  });

  test('キーを右寄せにできる', async () => {
    expect(
      await plain(<KeyValue data={{ a: 1, long: 2 }} align="right" />, 80)
    ).toBe('   a: 1\nlong: 2\n');
  });
});

describe('Json', () => {
  test('字下げして出す', async () => {
    expect(await plain(<Json value={{ a: 1, b: ['x'], c: null }} />, 80)).toBe(
      [
        '{',
        '  "a": 1,',
        '  "b": [',
        '    "x"',
        '  ],',
        '  "c": null',
        '}',
        '',
      ].join('\n')
    );
  });

  test('空の配列とオブジェクトは 1 行', async () => {
    expect(await plain(<Json value={{ a: [], b: {} }} />, 80)).toBe(
      ['{', '  "a": [],', '  "b": {}', '}', ''].join('\n')
    );
  });

  test('字下げの桁数を変えられる', async () => {
    expect(await plain(<Json value={{ a: 1 }} indent={4} />, 80)).toBe(
      ['{', '    "a": 1', '}', ''].join('\n')
    );
  });
});

describe('状態の記号', () => {
  const all = (
    <>
      <Success>ok</Success>
      <Warn>careful</Warn>
      <Info>fyi</Info>
      <Danger>bad</Danger>
    </>
  );

  test('UTF-8 の端末では記号を使う', async () => {
    expect(await plain(all, 80)).toBe('✔ ok\n⚠ careful\nℹ fyi\n✖ bad\n');
  });

  test('UTF-8 でない端末では ASCII に落ちる', async () => {
    const result = await render(all, {
      color: { stdout: 0 },
      columns: 80,
      unicode: false,
    });
    expect(result.stdout).toBe('+ ok\n! careful\ni fyi\nx bad\n');
  });

  test('色が付く (16 色)', async () => {
    const result = await render(<Success>ok</Success>, {
      color: { stdout: 4 },
      columns: 80,
    });
    expect(result.stdout).toBe('\x1b[32m✔\x1b[0m ok\n');
  });
});

describe('Link', () => {
  test('色を出せる端末では OSC 8 で包む', async () => {
    const result = await render(
      <Line>
        <Link href="https://example.com">docs</Link>
      </Line>,
      { color: { stdout: 4 }, columns: 80 }
    );
    expect(result.stdout).toBe(
      '\x1b]8;;https://example.com\x1b\\docs\x1b]8;;\x1b\\\n'
    );
  });

  test('装飾を落とす場合は URL を添える', async () => {
    expect(
      await plain(
        <Line>
          <Link href="https://example.com">docs</Link>
        </Line>,
        80
      )
    ).toBe('docs (https://example.com)\n');
  });

  test('子が無ければ URL をそのまま出す', async () => {
    expect(
      await plain(
        <Line>
          <Link href="https://example.com" />
        </Line>,
        80
      )
    ).toBe('https://example.com\n');
  });
});

describe('行の中に置けないもの', () => {
  const cases: [string, RenderInput, RegExp][] = [
    [
      '<Box>',
      <Line>
        <Box>
          <Line>x</Line>
        </Box>
      </Line>,
      /<Box> cannot appear inside a <Line>/,
    ],
    [
      '<Indent>',
      <Line>
        <Indent>
          <Line>x</Line>
        </Indent>
      </Line>,
      /<Indent> cannot appear inside a <Line>/,
    ],
    [
      '<Table>',
      <Line>
        <Table columns={['a']} rows={[['x']]} />
      </Line>,
      /<Table> cannot appear inside a <Line>/,
    ],
    [
      '<List>',
      <Line>
        <List items={['x']} />
      </Line>,
      /<List> cannot appear inside a <Line>/,
    ],
  ];

  for (const [name, node, pattern] of cases) {
    test(name, async () => {
      const promise = plain(node, 80);
      await expect(promise).rejects.toThrow(RenderError);
      await expect(promise).rejects.toThrow(pattern);
    });
  }
});

describe('<Line> は自動で折り返さない', () => {
  test('端末幅より長い行もそのまま出す (パイプ先の行単位の処理を壊さない)', async () => {
    const long = 'x'.repeat(200);
    expect(await plain(<Line>{long}</Line>, 40)).toBe(`${long}\n`);
  });
});
