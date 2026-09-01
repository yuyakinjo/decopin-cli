/**
 * (1) 評価: JSX ツリーを再帰的に辿り、関数コンポーネントを呼び、
 * Promise を await して中間ノード木にする (ADR 1)。
 *
 * ここではレイアウトも装飾の解決も行わない。木の形を確定させるだけ。
 */
import type {
  Align,
  BorderStyle,
  Cell,
  SymbolKind,
} from '../components/index.ts';
import { isElement, isHost } from '../jsx/types.ts';
import type {
  AnyComponent,
  Renderable,
  RenderInput,
  Style,
} from '../jsx/types.ts';
import { RenderError } from './errors.ts';
import type { RenderNode } from './node.ts';

const STYLE_KEYS = [
  'color',
  'bg',
  'bold',
  'dim',
  'italic',
  'underline',
  'strikethrough',
  'inverse',
] as const satisfies readonly (keyof Style)[];

function pickStyle(props: Record<string, unknown>): Style {
  const style: Record<string, unknown> = {};
  for (const key of STYLE_KEYS) {
    if (props[key] !== undefined) style[key] = props[key];
  }
  return style as Style;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

function readString(
  props: Record<string, unknown>,
  key: string
): string | undefined {
  const value = props[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(
  props: Record<string, unknown>,
  key: string
): number | undefined {
  const value = props[key];
  return typeof value === 'number' ? value : undefined;
}

async function evaluateChildren(children: Renderable): Promise<RenderNode[]> {
  const node = await evaluate(children);
  return node.kind === 'group' ? node.children : [node];
}

/** JSX ツリーを中間ノード木にする */
export async function evaluate(node: RenderInput): Promise<RenderNode> {
  // 何も描かないもの
  if (node === null || node === undefined || typeof node === 'boolean') {
    return { kind: 'group', children: [] };
  }

  if (typeof node === 'string') {
    return { kind: 'chars', value: node };
  }

  if (typeof node === 'number') {
    return { kind: 'chars', value: String(node) };
  }

  // Promise は await する (async コンポーネントの戻り値や、直接埋め込まれた Promise)
  if (isThenable(node)) {
    // await の推論が自己参照するため、いったん unknown を経由する
    const resolved = (await node) as Renderable;
    return evaluate(resolved);
  }

  if (Array.isArray(node)) {
    const children: RenderNode[] = [];
    for (const child of node) {
      const evaluated = await evaluate(child);
      // group は畳んで平らにする (改行や fd の判定を単純に保つため)
      if (evaluated.kind === 'group') children.push(...evaluated.children);
      else children.push(evaluated);
    }
    return { kind: 'group', children };
  }

  if (!isElement(node)) {
    throw new RenderError(
      `Cannot render value: ${Object.prototype.toString.call(node)}`
    );
  }

  const { type, props } = node;
  const children = props.children as Renderable;

  if (!isHost(type)) {
    // ユーザーの関数コンポーネント。async でもよい
    const result = await (type as AnyComponent)(props as never);
    return evaluate(result);
  }

  switch (type.$host) {
    case 'text':
      return {
        kind: 'text',
        style: pickStyle(props),
        children: await evaluateChildren(children),
      };
    case 'line':
      return { kind: 'line', children: await evaluateChildren(children) };
    case 'br':
      return { kind: 'br' };
    case 'stdout':
      return { kind: 'fd', fd: 1, children: await evaluateChildren(children) };
    case 'stderr':
      return { kind: 'fd', fd: 2, children: await evaluateChildren(children) };
    case 'link':
      return {
        kind: 'link',
        href: readString(props, 'href') ?? '',
        style: pickStyle(props),
        children: await evaluateChildren(children),
      };
    case 'indent':
      return {
        kind: 'indent',
        by: readNumber(props, 'by') ?? 2,
        children: await evaluateChildren(children),
      };
    case 'box':
      return {
        kind: 'box',
        border: (readString(props, 'border') ?? 'round') as BorderStyle,
        title: readString(props, 'title'),
        maxWidth: readNumber(props, 'maxWidth'),
        children: await evaluateChildren(children),
      };
    case 'columns':
      return {
        kind: 'columns',
        gap: readNumber(props, 'gap') ?? 2,
        children: await evaluateChildren(children),
      };
    case 'symbol':
      return {
        kind: 'symbol',
        symbol: (readString(props, 'kind') ?? 'info') as SymbolKind,
      };
    case 'list':
      return {
        kind: 'list',
        items: (props.items as readonly Cell[] | undefined) ?? [],
        ordered: props.ordered === true,
        bullet: readString(props, 'bullet') ?? '-',
      };
    case 'table':
      return {
        kind: 'table',
        columns: (props.columns as readonly string[] | undefined) ?? [],
        rows: (props.rows as ReadonlyArray<readonly Cell[]> | undefined) ?? [],
        align: (props.align as readonly Align[] | undefined) ?? [],
        headless: props.headless === true,
      };
    case 'keyvalue':
      return {
        kind: 'keyvalue',
        data: (props.data as Readonly<Record<string, Cell>> | undefined) ?? {},
        align: (readString(props, 'align') ?? 'left') as Align,
        separator: readString(props, 'separator') ?? ': ',
      };
    case 'json':
      return {
        kind: 'json',
        value: props.value,
        indent: readNumber(props, 'indent') ?? 2,
      };
    case 'exit': {
      const code = props.code;
      if (typeof code !== 'number' || !Number.isInteger(code)) {
        throw new RenderError('<Exit code> requires an integer');
      }
      return { kind: 'exit', code };
    }
    case 'dynamic': {
      // source と frame はここでは触らない。駆動は present() の仕事 (ADR 22)
      const source = props.source;
      if (
        typeof source !== 'object' ||
        source === null ||
        typeof (source as { [Symbol.asyncIterator]?: unknown })[
          Symbol.asyncIterator
        ] !== 'function'
      ) {
        throw new RenderError(
          '<Dynamic source> must be an AsyncIterable (an async generator works)'
        );
      }
      if (typeof children !== 'function') {
        throw new RenderError(
          '<Dynamic> children must be a function of the latest value'
        );
      }
      // 0 や NaN は 1ms に丸められて高頻度の描き直しになる (Bun の実測)
      const interval = readNumber(props, 'interval');
      if (
        interval !== undefined &&
        (!Number.isFinite(interval) || interval <= 0)
      ) {
        throw new RenderError(
          '<Dynamic interval> must be a positive number of milliseconds'
        );
      }
      return {
        kind: 'dynamic',
        source: source as AsyncIterable<unknown>,
        frame: children as unknown as (value: unknown) => Renderable,
        interval,
      };
    }
    default:
      // 入力宣言のコンポーネントは出力ツリーには置けない
      throw new RenderError(
        `<${type.name}> cannot be rendered as output. Declaration components belong in argv.tsx / stdin.tsx / env.tsx`
      );
  }
}
