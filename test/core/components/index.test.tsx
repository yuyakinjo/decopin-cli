/**
 * 組み込みコンポーネントの一覧 (src/core/components/index.ts)。
 *
 * 各部品がレンダラーの解釈する種類 (`$host`) と表示名を正しく持つこと、
 * JSX で書いたときに props がそのまま要素に載ることを見る。
 * 描画結果そのものは test/core/renderer/ が受け持つ
 */
import { describe, expect, test } from 'bun:test';

import { render } from 'decopin-cli';

import {
  Box,
  Br,
  Columns,
  Dynamic,
  Exit,
  Indent,
  Json,
  KeyValue,
  Line,
  Link,
  List,
  ProgressBar,
  Spinner,
  Stderr,
  Stdout,
  Symbol as StatusSymbol,
  Table,
  Text,
} from '../../../src/core/components/index.ts';
import { isElement } from '../../../src/core/jsx/types.ts';

describe('組み込みの種類と名前', () => {
  const table: Array<[{ $host: string; name: string }, string, string]> = [
    [Text, 'text', 'Text'],
    [Line, 'line', 'Line'],
    [Br, 'br', 'Br'],
    [Stdout, 'stdout', 'Stdout'],
    [Stderr, 'stderr', 'Stderr'],
    [Exit, 'exit', 'Exit'],
    [Dynamic, 'dynamic', 'Dynamic'],
    [Link, 'link', 'Link'],
    [Indent, 'indent', 'Indent'],
    [Box, 'box', 'Box'],
    [Columns, 'columns', 'Columns'],
    [StatusSymbol, 'symbol', 'Symbol'],
    [Spinner, 'spinner', 'Spinner'],
    [ProgressBar, 'progress', 'ProgressBar'],
    [List, 'list', 'List'],
    [Table, 'table', 'Table'],
    [KeyValue, 'keyvalue', 'KeyValue'],
    [Json, 'json', 'Json'],
  ];

  for (const [component, kind, name] of table) {
    test(`${name} は ${kind} として解釈される`, () => {
      expect(component.$host).toBe(kind);
      expect(component.name).toBe(name);
    });
  }

  test('種類はどれも重ならない', () => {
    const kinds = table.map(([component]) => component.$host);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

describe('JSX で書いたときの要素', () => {
  test('props と children がそのまま要素に載る', () => {
    const node = (
      <Box border="double" title="t" maxWidth={30}>
        <Line>body</Line>
      </Box>
    );
    expect(isElement(node)).toBe(true);
    if (!isElement(node)) return;
    expect(node.type).toBe(Box);
    expect(node.props.border).toBe('double');
    expect(node.props.title).toBe('t');
    expect(node.props.maxWidth).toBe(30);
    const child = node.props.children;
    expect(isElement(child) && child.type === Line).toBe(true);
  });

  test('Exit の code は描画結果の exitCode になる', async () => {
    const result = await render(
      <>
        <Exit code={1} />
        <Exit code={3} />
      </>,
      { env: { NO_COLOR: '1' }, columns: 40 }
    );
    // 最後に評価されたものが勝つ
    expect(result.exitCode).toBe(3);
  });

  test('Stdout と Stderr で出力先が分かれる', async () => {
    const result = await render(
      <>
        <Stdout>
          <Line>out</Line>
        </Stdout>
        <Stderr>
          <Line>err</Line>
        </Stderr>
      </>,
      { env: { NO_COLOR: '1' }, columns: 40 }
    );
    expect(result.stdout).toBe('out\n');
    expect(result.stderr).toBe('err\n');
  });
});
