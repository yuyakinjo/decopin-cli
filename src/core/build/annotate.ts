/**
 * `decopin dev --annotate` (ADR 44)。cmd.tsx の default export の props に
 * `CmdProps<'<name>'>` を補う。
 *
 * 型注釈が無い `export default function Command(props)` を見つけたら
 * `Command(props: CmdProps<'hello'>)` に書き換え、import が無ければ足す。
 * 既に何らかの型注釈が付いていれば触らない (手書きの型も尊重する)。
 *
 * TypeScript の AST は使わず、文字列やコメントを空白にした同じ長さの view で
 * default export と括弧の対応を読む。ユーザーのソースを書き換えるので、変更は
 * 引数の型注釈と import に限り、それ以外のバイトは動かさない
 */
import type { Route } from './scanner.ts';

const DEFAULT_FUNCTION =
  /\bexport\s+default\s+(?:async[^\S\r\n\u2028\u2029]+)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\(/g;
const DECOPIN_IMPORT =
  /import\s+(type\s+)?\{([^}]*)\}\s*from\s*([\x22\x27])decopin-cli\3\s*;?/g;
const TSX_TRANSPILER = new Bun.Transpiler({ loader: 'tsx' });

const CLOSING = new Map([
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
]);
const CLOSE = new Set(CLOSING.values());

/** quote で始まる文字列の直後。閉じていなければ末尾 */
function quotedEnd(source: string, start: number, quote: string): number {
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] === '\\') {
      index++;
      continue;
    }
    if (source[index] === quote) return index + 1;
  }
  return source.length;
}

function lineCommentEnd(source: string, start: number): number {
  for (let index = start + 2; index < source.length; index++) {
    if (/[\r\n\u2028\u2029]/.test(source[index] as string)) return index;
  }
  return source.length;
}

function blockCommentEnd(source: string, start: number): number {
  const close = source.indexOf('*/', start + 2);
  return close === -1 ? source.length : close + 2;
}

/** 正規表現リテラルの直後。正規表現でなければ undefined */
function regexEnd(source: string, start: number): number | undefined {
  let inClass = false;
  for (let index = start + 1; index < source.length; index++) {
    const char = source[index];
    if (char === '\\') {
      index++;
      continue;
    }
    if (/[\r\n\u2028\u2029]/.test(char ?? '')) return undefined;
    if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (char === '/' && !inClass) {
      index++;
      while (/[A-Za-z]/.test(source[index] ?? '')) index++;
      return index;
    }
  }
  return undefined;
}

const REGEX_PREFIX_WORDS = new Set([
  'await',
  'case',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);

/** 直前の code から `/` が正規表現を始められる位置かを保守的に見る */
function canStartRegex(view: string[], index: number): boolean {
  let before = index - 1;
  while (before >= 0 && /\s/.test(view[before] as string)) before--;
  if (before < 0) return true;
  const char = view[before] as string;
  if ('([{,:;=!?&|+-*%^~<>'.includes(char)) return true;
  if (!/[A-Za-z0-9_$]/.test(char)) return false;

  let start = before;
  while (start > 0 && /[A-Za-z0-9_$]/.test(view[start - 1] as string)) {
    start--;
  }
  return REGEX_PREFIX_WORDS.has(view.slice(start, before + 1).join(''));
}

/** template の `${ ... }` の直後。template の入れ子も飛ばす */
function templateExpressionEnd(source: string, start: number): number {
  let depth = 1;
  for (let index = start; index < source.length;) {
    const char = source[index] as string;
    const next = source[index + 1];
    if (char === "'" || char === '"') {
      index = quotedEnd(source, index, char);
    } else if (char === '`') {
      index = templateEnd(source, index);
    } else if (char === '/' && next === '/') {
      index = lineCommentEnd(source, index);
    } else if (char === '/' && next === '*') {
      index = blockCommentEnd(source, index);
    } else if (char === '{') {
      depth++;
      index++;
    } else if (char === '}') {
      depth--;
      index++;
      if (depth === 0) return index;
    } else {
      index++;
    }
  }
  return source.length;
}

/** backtick で始まる template literal の直後。閉じていなければ末尾 */
function templateEnd(source: string, start: number): number {
  for (let index = start + 1; index < source.length;) {
    const char = source[index];
    if (char === '\\') {
      index += 2;
    } else if (char === '`') {
      return index + 1;
    } else if (char === '$' && source[index + 1] === '{') {
      index = templateExpressionEnd(source, index + 2);
    } else {
      index++;
    }
  }
  return source.length;
}

/**
 * 文字列・template・正規表現は先頭を `x`、残りを空白にし、コメントは空白にする。
 * 長さを保つので、この view で得た index を元ソースへそのまま使える。
 */
function lexicalView(source: string): string {
  const view = source.split('');
  const mask = (start: number, end: number, value: boolean): void => {
    for (let index = start; index < end; index++) {
      view[index] = /[\r\n\u2028\u2029]/.test(source[index] as string)
        ? (source[index] as string)
        : ' ';
    }
    if (value && start < end) view[start] = 'x';
  };

  for (let index = 0; index < source.length;) {
    const char = source[index] as string;
    const next = source[index + 1];
    if (char === "'" || char === '"') {
      const end = quotedEnd(source, index, char);
      mask(index, end, true);
      index = end;
    } else if (char === '`') {
      const end = templateEnd(source, index);
      mask(index, end, true);
      index = end;
    } else if (char === '/' && next === '/') {
      const end = lineCommentEnd(source, index);
      mask(index, end, false);
      index = end;
    } else if (char === '/' && next === '*') {
      const end = blockCommentEnd(source, index);
      mask(index, end, false);
      index = end;
    } else if (char === '/' && canStartRegex(view, index)) {
      const end = regexEnd(source, index);
      if (end === undefined) {
        index++;
      } else {
        mask(index, end, true);
        index = end;
      }
    } else {
      index++;
    }
  }
  return view.join('');
}

/**
 * 候補だけを一意な named export にした probe を Bun の構文 scan に掛ける。
 * regex だけでは JSX text をコードと区別できないため、実際に export と解釈
 * される候補だけを残す。
 */
function isDefaultExport(
  source: string,
  view: string,
  candidateIndex: number
): boolean {
  const exportIndex = view.indexOf('export', candidateIndex);
  if (exportIndex === -1) return false;
  DEFAULT_FUNCTION.lastIndex = candidateIndex;
  const match = DEFAULT_FUNCTION.exec(view);
  if (match === null || match.index !== candidateIndex) return false;

  let existingExports: string[];
  try {
    existingExports = TSX_TRANSPILER.scan(source).exports;
  } catch {
    return false;
  }
  let probeName = '__decopin_annotate_candidate__';
  let suffix = 2;
  while (source.includes(probeName) || existingExports.includes(probeName)) {
    probeName = `__decopin_annotate_candidate_${suffix++}__`;
  }
  const async = /\basync\s+function\b/.test(match[0]) ? 'async ' : '';
  const replacement = `export ${async}function ${probeName}(`;
  const end = match.index + match[0].length;
  const probe = source.slice(0, match.index) + replacement + source.slice(end);

  try {
    return TSX_TRANSPILER.scan(probe).exports.includes(probeName);
  } catch {
    return false;
  }
}

/** 候補自身を一意な import にした probe で、実際の import 文か確かめる */
function isImportStatement(
  source: string,
  candidateIndex: number,
  length: number
): boolean {
  let probePath = '__decopin_annotate_import_probe__';
  let suffix = 2;
  while (source.includes(probePath)) {
    probePath = `__decopin_annotate_import_probe_${suffix++}__`;
  }
  const replacement = `import {} from '${probePath}';`;
  const probe =
    source.slice(0, candidateIndex) +
    replacement +
    source.slice(candidateIndex + length);
  try {
    return TSX_TRANSPILER.scan(probe).imports.some(
      (item) => item.kind === 'import-statement' && item.path === probePath
    );
  } catch {
    return false;
  }
}

/** `(` の位置から、対応する `)` の位置を返す。壊れた対応なら -1 */
function closingParen(view: string, openIndex: number): number {
  const stack = ['('];
  for (let index = openIndex + 1; index < view.length; index++) {
    const char = view[index] as string;
    if (CLOSING.has(char)) {
      stack.push(char);
    } else if (CLOSE.has(char)) {
      const open = stack.pop();
      if (open === undefined || CLOSING.get(open) !== char) return -1;
      if (stack.length === 0) return index;
    }
  }
  return -1;
}

/** 型注釈・既定値・複数引数など、安全に追記できない引数なら true */
function unsupportedParams(params: string): boolean {
  const stack: string[] = [];
  for (const char of params) {
    if (CLOSING.has(char)) {
      stack.push(char);
    } else if (CLOSE.has(char)) {
      const open = stack.pop();
      if (open === undefined || CLOSING.get(open) !== char) return true;
    } else if (
      stack.length === 0 &&
      (char === ':' || char === '=' || char === ',')
    ) {
      return true;
    }
  }
  if (stack.length > 0) return true;

  const value = params.trim();
  if (value.startsWith('...')) return true;
  if (/^[A-Za-z_$][\w$]*\??$/.test(value)) return false;
  return !(
    (value.startsWith('{') && value.endsWith('}')) ||
    (value.startsWith('[') && value.endsWith(']'))
  );
}

interface DecopinImport {
  index: number;
  statement: string;
  typeOnly: string | undefined;
  names: string;
  quote: string;
}

/** コメントや文字列中の偽 import を除き、実際の named import を探す */
function findDecopinImport(
  source: string,
  view = lexicalView(source)
): DecopinImport | undefined {
  DECOPIN_IMPORT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DECOPIN_IMPORT.exec(source)) !== null) {
    if (
      view.slice(match.index, match.index + 'import'.length) === 'import' &&
      isImportStatement(source, match.index, match[0].length)
    ) {
      return {
        index: match.index,
        statement: match[0],
        typeOnly: match[1],
        names: match[2] as string,
        quote: match[3] as string,
      };
    }
    // 偽 import が本物をまたいでも、重なった位置から探し直す
    DECOPIN_IMPORT.lastIndex = match.index + 1;
  }
  return undefined;
}

/** `CmdProps as Props` も含め、import 済みならローカル名を返す */
function commandPropsLocalName(names: string): string | undefined {
  const clean = names
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\r\n]*/g, ' ');
  for (const part of clean.split(',')) {
    const match =
      /^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(
        part.trim()
      );
    if (match?.[1] === 'CmdProps') return match[2] ?? 'CmdProps';
  }
  return undefined;
}

/** 既存のローカル binding と衝突しない import 名を選ぶ */
function availableCmdPropsName(view: string): string {
  const isUsed = (name: string): boolean =>
    new RegExp(`\\b${name}\\b`).test(view);
  if (!isUsed('CmdProps')) return 'CmdProps';
  if (!isUsed('DecopinCmdProps')) return 'DecopinCmdProps';
  for (let suffix = 2; ; suffix++) {
    const candidate = `DecopinCmdProps${suffix}`;
    if (!isUsed(candidate)) return candidate;
  }
}

function prependImport(source: string, statement: string): string {
  const bom = source.startsWith('\uFEFF') ? 1 : 0;
  if (source.startsWith('#!', bom)) {
    const relativeEnd = source.slice(bom).search(/[\r\n\u2028\u2029]/);
    if (relativeEnd !== -1) {
      let lineEnd = bom + relativeEnd + 1;
      if (source[lineEnd - 1] === '\r' && source[lineEnd] === '\n') lineEnd++;
      return source.slice(0, lineEnd) + statement + source.slice(lineEnd);
    }
  }
  return source.slice(0, bom) + statement + source.slice(bom);
}

/** `import { A, B } from 'decopin-cli'` に `type CmdProps` を足す */
function ensureImport(
  source: string,
  quote: string,
  localName: string
): string {
  const imported =
    localName === 'CmdProps' ? 'CmdProps' : `CmdProps as ${localName}`;
  const standalone = `import { type ${imported} } from ${quote}decopin-cli${quote};\n`;
  const found = findDecopinImport(source);
  if (found === undefined) return prependImport(source, standalone);
  const { index, statement, typeOnly, names } = found;
  if (commandPropsLocalName(names) !== undefined) return source;
  // コメントの前後へ comma を足すと意味が変わり得るので、別 import にする
  if (/\/[/*]/.test(names)) return prependImport(source, standalone);

  const specifier = typeOnly === undefined ? `type ${imported}` : imported;
  const trimmed = names.replace(/[\s,]+$/, '');
  const multiline = names.includes('\n');
  const inner = multiline
    ? trimmed === ''
      ? `\n  ${specifier},\n`
      : `${trimmed},\n  ${specifier},\n`
    : trimmed === ''
      ? ` ${specifier} `
      : `${trimmed}, ${specifier} `;
  const replaced = statement.replace(`{${names}}`, `{${inner}}`);
  return (
    source.slice(0, index) + replaced + source.slice(index + statement.length)
  );
}

/** JSON の escape を保ったまま、周囲だけ既存 import の引用符に合わせる */
function stringLiteral(value: string, quote: string): string {
  const json = JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  if (quote === '"') return json;
  const inner = json.slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'");
  return `'${inner}'`;
}

/**
 * 書き換え後のソースを返す。触る必要が無ければ undefined。
 *
 * 対象は `export default (async) function Name?(params)` で、params が空でなく
 * 型注釈も既定値も持たない場合だけ
 */
export function annotateCommandSource(
  source: string,
  routeName: string
): string | undefined {
  const view = lexicalView(source);
  DEFAULT_FUNCTION.lastIndex = 0;
  let match: RegExpExecArray | null;
  do {
    match = DEFAULT_FUNCTION.exec(view);
  } while (match !== null && !isDefaultExport(source, view, match.index));
  if (match === null) return undefined;

  const openIndex = match.index + match[0].length - 1;
  const closeIndex = closingParen(view, openIndex);
  if (closeIndex === -1) return undefined;

  const params = view.slice(openIndex + 1, closeIndex);
  if (params.trim() === '' || unsupportedParams(params)) return undefined;

  const foundImport = findDecopinImport(source, view);
  const quote = foundImport?.quote ?? "'";
  const typeName =
    foundImport === undefined
      ? availableCmdPropsName(view)
      : (commandPropsLocalName(foundImport.names) ??
        availableCmdPropsName(view));
  const trailing = params.length - params.trimEnd().length;
  const insertAt = closeIndex - trailing;
  const annotation = `: ${typeName}<${stringLiteral(routeName, quote)}>`;
  const annotated =
    source.slice(0, insertAt) + annotation + source.slice(insertAt);
  return ensureImport(annotated, quote, typeName);
}

/** 型注釈を補った cmd.tsx を書き戻し、書き換えたファイルの一覧を返す */
export async function annotateCommands(routes: Route[]): Promise<string[]> {
  const written: string[] = [];
  for (const route of routes) {
    const file = route.files.cmd;
    if (file === undefined) continue;
    const source = await Bun.file(file).text();
    const next = annotateCommandSource(source, route.name);
    if (next === undefined || next === source) continue;
    await Bun.write(file, next);
    written.push(file);
  }
  return written;
}
