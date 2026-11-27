/**
 * 副作用解析の前処理 (ADR 32)。
 *
 * ここが読み違えると、**コードを文字列の中身として捨てる**。捨てたコードに
 * `Bun.write` があれば、解析は「書き込みは無い」と言ってしまう。だから
 * 「コードが残ること」と「読み切れないときに黙らないこと」を見る
 */
import { describe, expect, test } from 'bun:test';

import { codeOnly } from '../../../src/core/build/lexer.ts';

/** 残ったコードに SINK という名前が見えるか */
function keeps(source: string): boolean {
  const { code, doubts } = codeOnly(source);
  return doubts.length > 0 || code.includes('SINK');
}

describe('文字列・コメント・正規表現を落とす', () => {
  test('文字列は "" になり、中身は残らない', () => {
    const { code, doubts } = codeOnly(
      `const a = 'SINK'; const b = "SINK"; const c = \`SINK\`;`
    );
    expect(code).toBe('const a = ""; const b = ""; const c = "";');
    expect(doubts).toEqual([]);
  });

  test('エスケープしたクォートで文字列は終わらない', () => {
    expect(codeOnly(`f('it\\'s SINK', "a\\"SINK")`).code).toBe('f("", "")');
  });

  test('コメントは消える', () => {
    const { code } = codeOnly('a; // SINK\n/* SINK\n SINK */ b;');
    expect(code).not.toContain('SINK');
    expect(code).toContain('a;');
    expect(code).toContain('b;');
  });

  test('正規表現は /./ になる。中のクォートは文字列を開かない', () => {
    const { code, doubts } = codeOnly(
      `const re = /it's [/"] \`/g; SINK(); const s = 'x';`
    );
    expect(code).toBe('const re = /./; SINK(); const s = "";');
    expect(doubts).toEqual([]);
  });

  test('先頭の #! はコードではない', () => {
    const { code, doubts } = codeOnly('#!/usr/bin/env bun\nSINK();');
    expect(code.trim()).toBe('SINK();');
    expect(doubts).toEqual([]);
  });
});

describe('テンプレートの ${} の中は残す', () => {
  test('式はコードとして残り、本文は消える', () => {
    const { code, doubts } = codeOnly('const t = `hidden ${SINK("x")} text`;');
    expect(code).toBe('const t = `${SINK("")}`;');
    expect(doubts).toEqual([]);
  });

  test('入れ子のテンプレートと、式の中の波括弧', () => {
    const { code } = codeOnly(
      'const t = `a ${f({ k: `b ${SINK()} c` })} d ${g()}`;'
    );
    expect(code).toBe('const t = `${f({ k: `${SINK()}` })}${g()}`;');
  });

  test('${} の無いテンプレートは、ただの文字列と同じ形にする', () => {
    expect(codeOnly('import(`./x.ts`)').code).toBe('import("")');
  });

  test('エスケープした \\${ は式を開かない', () => {
    expect(codeOnly('const t = `\\${SINK()}`;').code).toBe('const t = "";');
  });
});

describe('`/` を読み違えない', () => {
  const division: [string, string][] = [
    ['名前の後ろ', 'const x = a / b; SINK(); const y = c / d;'],
    ['閉じ括弧の後ろ', 'const x = (a + b) / 2; SINK(); const y = 1 / 2;'],
    ['添字の後ろ', 'const x = a[0] / 2; SINK(); const y = 1 / 2;'],
    ['++ の後ろ', 'let i = 0; const x = i++ / 2; SINK(); const y = 1 / 2;'],
    [
      'プロパティ名が予約語',
      'const x = o.return / 2; SINK(); const y = 1 / 2;',
    ],
  ];
  for (const [label, source] of division) {
    test(`割り算: ${label}`, () => {
      const { code, doubts } = codeOnly(source);
      expect(code).toContain('SINK()');
      expect(doubts).toEqual([]);
    });
  }

  const regex: [string, string][] = [
    ['代入の右', `const re = /'/; SINK(); const s = "'";`],
    ['引数', `f(/'/, 1); SINK(); g("'");`],
    ['return の後ろ', `function f() { return /'/; } SINK(); g("'");`],
    ['if (...) の後ろ', `if (a) /'/.test(b); SINK(); g("'");`],
    [
      'for await (...) の後ろ',
      `for await (const a of b) /'/.test(a); SINK(); g("'");`,
    ],
    ['文字クラスの中の /', `const re = /[/']/; SINK(); g("'");`],
  ];
  for (const [label, source] of regex) {
    test(`正規表現: ${label}`, () => {
      const { code, doubts } = codeOnly(source);
      expect(code).toContain('SINK()');
      expect(doubts).toEqual([]);
    });
  }
});

describe('読み切れないときは黙らない', () => {
  const doubtful: [string, string][] = [
    ['閉じない文字列', `const a = 'never ends\nSINK();`],
    ['閉じないテンプレート', 'const a = `never ends ${1}\nSINK();'],
    ['閉じないコメント', '/* never ends\nSINK();'],
    ['閉じない正規表現', 'const a = = /never ends\nSINK();'],
    // ブロックの終わりにも値の終わりにもなる。どちらとも読める
    ['} の後ろの / とクォート', `}\n/'/.test(a); SINK(); g("'");`],
    ['} の後ろの / が 2 つ', '} / a; SINK(); b / c;'],
  ];
  for (const [label, source] of doubtful) {
    test(label, () => {
      expect(keeps(source)).toBe(true);
    });
  }

  test('} の後ろの / でも、紛れが無ければ疑わない', () => {
    expect(codeOnly('const r = { a: 1 }.a / 2;\nSINK();').doubts).toEqual([]);
  });

  test('行をまたいだ文字列は、その行で打ち切る (次の行のコードを飲まない)', () => {
    const { code, doubts } = codeOnly(`const a = 'broken\nSINK('x');`);
    expect(code).toContain('SINK("")');
    expect(doubts).toEqual(['a string that never ends']);
  });
});
