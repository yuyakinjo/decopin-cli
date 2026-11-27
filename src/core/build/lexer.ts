/**
 * JS の文面から「コードだけ」を取り出す (副作用解析の前処理。ADR 32)。
 *
 * 文字列・テンプレートの本文・コメント・正規表現リテラルを落とし、
 * **テンプレートの `${}` の中は残す** (そこは実行されるコードだから)。
 *
 * 入力は `Bun.Transpiler` で素の JS に直したものを想定している。JSX の
 * 文面 (`<Line>Don't</Line>`) や型注釈は、構文を解さないと文字列と区別
 * できないので、ここでは扱わない。
 *
 * 読み切れない箇所は推測で進めず `doubts` に積む。呼ぶ側はそれを
 * 「このコードから『無い』とは言えない」として扱う。**読み違えたまま
 * 黙って進むと、コードを文字列の中身として捨ててしまう**からである
 */

export interface CodeText {
  /** 文字列などを置き換えたコード。文字列は `""`、正規表現は `/./` になる */
  code: string;
  /** 読み切れなかった理由 (空なら全部読めた) */
  doubts: string[];
}

/** この語の直後の `/` は正規表現の始まり */
const BEFORE_REGEX = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
]);

/** 文脈によって予約語にも名前にもなる語。直後の `/` はどちらとも言えない */
const EITHER = new Set(['of', 'yield', 'await']);

/** `if (...)` のように、閉じ括弧の後ろに文が続く語 */
const HEADS = new Set(['if', 'while', 'for', 'with']);

/**
 * 直前の字句の種類。`/` が割り算か正規表現かはこれで決まる
 * - value: 値で終わった (`a` / `1` / `)` / `]`)。`/` は割り算
 * - operator: 値を待っている (`=` / `(` / `return`)。`/` は正規表現
 * - unsure: どちらもありうる (`}` はブロックの終わりにも値の終わりにもなる)
 */
type Before = 'value' | 'operator' | 'unsure';

interface Template {
  /** 開きのバッククォートを書いた `out` の位置 */
  start: number;
  /** `${}` を 1 つでも持つか (持たなければただの文字列) */
  substituted: boolean;
  /** 本文の中か、`${}` の中か */
  inText: boolean;
  /** `${}` の中での波括弧の深さ */
  depth: number;
}

function isWordChar(char: string | undefined): boolean {
  if (char === undefined) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    code === 36 || // $
    code > 127
  );
}

function lineEnd(source: string, from: number): number {
  const end = source.indexOf('\n', from);
  return end === -1 ? source.length : end;
}

/** @returns 閉じクォートの次の位置。行末までに閉じなければ undefined */
function stringEnd(source: string, start: number): number | undefined {
  const quote = source[start];
  for (let index = start + 1; index < source.length; index++) {
    const char = source[index];
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (char === quote) return index + 1;
    if (char === '\n') return undefined;
  }
  return undefined;
}

/** @returns フラグまで含めた終わりの次の位置。行末までに閉じなければ undefined */
function regexEnd(source: string, start: number): number | undefined {
  let inClass = false;
  for (let index = start + 1; index < source.length; index++) {
    const char = source[index];
    if (char === '\n') return undefined;
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (inClass) {
      if (char === ']') inClass = false;
      continue;
    }
    if (char === '[') {
      inClass = true;
    } else if (char === '/') {
      index += 1;
      while (isWordChar(source[index])) index += 1;
      return index;
    }
  }
  return undefined;
}

/**
 * @param source 素の JS (型注釈と JSX を含まないもの)
 */
export function codeOnly(source: string): CodeText {
  const doubts = new Set<string>();
  const templates: Template[] = [];
  /** 開き括弧ごとに、それが `if (` などの頭かどうか */
  const parens: boolean[] = [];
  let out = '';
  // 下の `wrote` が書き換える。型を広げておかないと初期値に絞り込まれる
  let before = 'operator' as Before;
  /** 直前の字句が語なら、その語 */
  let word = undefined as string | undefined;
  /** 直前に書いた、空白でない 1 字 */
  let lastChar = '';
  // `#!/usr/bin/env bun` はコードではない
  let index = source.startsWith('#!') ? lineEnd(source, 0) : 0;

  const wrote = (text: string, kind: Before): void => {
    out += text;
    before = kind;
    word = undefined;
    lastChar = text[text.length - 1] as string;
  };

  while (index < source.length) {
    const char = source[index] as string;
    const next = source[index + 1];
    const template = templates[templates.length - 1];

    if (template?.inText === true) {
      if (char === '\\') {
        index += 2;
      } else if (char === '`') {
        templates.pop();
        // `${}` が無ければただの文字列。import(`./x`) を「計算された
        // 指定子」と読まないように、文字列と同じ形にする
        wrote('`', 'value');
        if (!template.substituted) out = `${out.slice(0, template.start)}""`;
        index += 1;
      } else if (char === '$' && next === '{') {
        template.substituted = true;
        template.inText = false;
        template.depth = 0;
        wrote('${', 'operator');
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      out += char;
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      index = lineEnd(source, index);
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) doubts.add('a comment that never ends');
      index = end === -1 ? source.length : end + 2;
      out += ' ';
      continue;
    }
    if (char === "'" || char === '"') {
      const end = stringEnd(source, index);
      if (end === undefined) doubts.add('a string that never ends');
      index = end ?? lineEnd(source, index);
      wrote('""', 'value');
      continue;
    }
    if (char === '`') {
      templates.push({
        start: out.length,
        substituted: false,
        inText: true,
        depth: 0,
      });
      out += '`';
      index += 1;
      continue;
    }
    if (char === '/') {
      if (before === 'operator') {
        const end = regexEnd(source, index);
        if (end !== undefined) {
          wrote('/./', 'value');
          index = end;
          continue;
        }
        doubts.add('a regular expression that never ends');
      } else if (before === 'unsure') {
        // 割り算として読む。正規表現だった場合に困るのは、その中の
        // クォートが文字列を開くときと、次の `/` までがコードに見えるとき
        const rest = source.slice(index + 1, lineEnd(source, index));
        if (/[\u0027\u0022\u0060/]/.test(rest)) {
          doubts.add('a "/" that could be division or a regular expression');
        }
      }
      wrote('/', 'operator');
      index += 1;
      continue;
    }
    if (isWordChar(char)) {
      let end = index + 1;
      while (isWordChar(source[end])) end += 1;
      const text = source.slice(index, end);
      // `obj.return` の return はただの名前
      const isName = lastChar === '.';
      // `for await (` の頭は for
      const head = text === 'await' && word === 'for' ? 'for' : text;
      wrote(
        text,
        isName
          ? 'value'
          : BEFORE_REGEX.has(text)
            ? 'operator'
            : EITHER.has(text)
              ? 'unsure'
              : 'value'
      );
      word = isName ? undefined : head;
      index = end;
      continue;
    }

    if (template !== undefined) {
      if (char === '{') {
        template.depth += 1;
      } else if (char === '}') {
        if (template.depth === 0) {
          template.inText = true;
          out += '}';
          index += 1;
          continue;
        }
        template.depth -= 1;
      }
    }

    if (char === '(') {
      parens.push(word !== undefined && HEADS.has(word));
      wrote(char, 'operator');
    } else if (char === ')') {
      // `if (x) /re/.test(y)` — 頭の閉じ括弧の後ろは文の始まり
      wrote(char, parens.pop() === true ? 'operator' : 'value');
    } else if (char === ']') {
      wrote(char, 'value');
    } else if (char === '}') {
      wrote(char, 'unsure');
    } else if ((char === '+' || char === '-') && source[index - 1] === char) {
      // `a++ / b`。`++` の直後に正規表現は来ない
      wrote(char, 'value');
    } else {
      wrote(char, 'operator');
    }
    index += 1;
  }

  if (templates.length > 0) doubts.add('a template literal that never ends');
  return { code: out, doubts: [...doubts] };
}
