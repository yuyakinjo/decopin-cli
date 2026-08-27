/**
 * ビルド前の下調べ (ADR 5 の check)。落とすのではなく警告する。
 *
 * ここで見るのは「動くけれど、たぶん意図と違う」こと。宣言そのものの
 * 誤りは evaluator が集める。
 */
import type { UnsupportedNode } from './schema-introspect.ts';

export interface Warning {
  message: string;
  hint?: string;
}

const JSX_IMPORT_SOURCE = 'decopin-cli/jsx';

const SUPPORTED_SCHEMA_NODES =
  'string, number, boolean, date, literal, picklist, array, object, optional, nullable, union';

/**
 * `<Stdin schema>` の内省で unknown に落ちた箇所を伝える (ADR 9)。
 * 同じ種別はまとめて 1 件にする (大きなスキーマで警告が溢れないように)
 */
export function stdinSchemaWarnings(
  file: string,
  nodes: UnsupportedNode[]
): Warning[] {
  const byNode = new Map<string, string[]>();
  for (const node of nodes) {
    const label = node.node === '' ? (node.detail ?? 'unsupported') : node.node;
    const paths = byNode.get(label) ?? [];
    paths.push(node.path);
    byNode.set(label, paths);
  }

  return [...byNode].map(([label, paths]) => ({
    message: `${file}: <Stdin schema> has an unsupported node "${label}" at ${paths.join(', ')}; that position is typed as unknown`,
    hint: `Supported: ${SUPPORTED_SCHEMA_NODES} (v.pipe with validation actions is fine). Declare the structure with <Type.*> if you need a precise type`,
  }));
}

/**
 * 宣言ファイルが実行時の状態に依存していないか (test/contract/argv-parsing.test.ts)。
 *
 * ビルド時に評価して型を出すので、`process.env` や現在時刻で宣言が変わると
 * 生成された型と実行時の挙動がずれる。ソースを読んで**警告**するだけに
 * とどめる (構文解析まではしない)
 */
const IMPURE_PATTERNS: readonly [RegExp, string][] = [
  [/\bprocess\.env\b/, 'process.env'],
  [/\bBun\.env\b/, 'Bun.env'],
  [/\bDate\.now\s*\(/, 'Date.now()'],
  [/\bnew\s+Date\s*\(\s*\)/, 'new Date()'],
  [/\bMath\.random\s*\(/, 'Math.random()'],
];

export async function checkPurity(files: string[]): Promise<Warning[]> {
  const warnings: Warning[] = [];
  for (const file of files) {
    let source: string;
    try {
      source = await Bun.file(file).text();
    } catch {
      continue;
    }
    for (const [pattern, label] of IMPURE_PATTERNS) {
      if (!pattern.test(source)) continue;
      warnings.push({
        message: `${file}: declaration depends on ${label}`,
        hint: 'Declarations are evaluated at build time to generate types. If they depend on runtime state, the generated types and the actual behavior drift apart',
      });
    }
  }
  return warnings;
}

interface TsConfig {
  compilerOptions?: {
    jsx?: unknown;
    jsxImportSource?: unknown;
  };
  extends?: unknown;
}

/**
 * JSONC (コメントと末尾カンマ付き JSON) を JSON にする。
 * 文字列の中の `//` を消してしまわないよう、状態を見ながら進む。
 */
export function stripJsonc(source: string): string {
  let result = '';
  let index = 0;
  let inString = false;

  while (index < source.length) {
    const char = source[index] as string;
    const next = source[index + 1];

    if (inString) {
      result += char;
      if (char === '\\') {
        // エスケープされた次の 1 文字はそのまま通す
        result += source[index + 1] ?? '';
        index += 2;
        continue;
      }
      if (char === '"') inString = false;
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }

    result += char;
    index += 1;
  }

  // 末尾カンマ (`,` のあとに ] か } が来るもの) を落とす
  return result.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * `tsconfig.json` の JSX 設定を確かめる。
 *
 * `jsxImportSource` が無いと、TypeScript も Bun も React を探しに行き
 * 「Could not resolve: react/jsx-dev-runtime」という分かりにくい失敗になる。
 */
export async function checkTsConfig(
  path = 'tsconfig.json'
): Promise<Warning[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return [
      {
        message: `${path} not found`,
        hint: `Add "jsx": "react-jsx" and "jsxImportSource": "${JSX_IMPORT_SOURCE}" so .tsx files compile`,
      },
    ];
  }

  let config: TsConfig;
  try {
    // tsconfig.json はコメントと末尾カンマを許す (JSONC) 慣習なので、
    // そのまま JSON.parse すると実在する設定で落ちる
    config = JSON.parse(stripJsonc(await file.text())) as TsConfig;
  } catch (error) {
    return [
      {
        message: `${path} could not be parsed`,
        hint: error instanceof Error ? error.message : String(error),
      },
    ];
  }

  // extends があると、この場に無くても継承されている可能性がある
  if (config.extends !== undefined) return [];

  const options = config.compilerOptions ?? {};
  const warnings: Warning[] = [];
  if (options.jsx === undefined) {
    warnings.push({
      message: `${path}: compilerOptions.jsx is not set`,
      hint: 'Set "jsx": "react-jsx"',
    });
  }
  if (options.jsxImportSource !== JSX_IMPORT_SOURCE) {
    warnings.push({
      message: `${path}: compilerOptions.jsxImportSource is not "${JSX_IMPORT_SOURCE}"`,
      hint: 'Without it, JSX resolves to React and the build fails with "Could not resolve: react/jsx-runtime"',
    });
  }
  return warnings;
}
