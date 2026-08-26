/**
 * (1) 評価: JSX ツリーを再帰的に辿り、関数コンポーネントを呼び、
 * Promise を await して中間ノード木にする (§6.1)。
 *
 * ここではレイアウトも装飾の解決も行わない。木の形を確定させるだけ。
 */
import { isElement, isHost } from '../jsx/types.ts';
import type { AnyComponent, Renderable, Style } from '../jsx/types.ts';
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

async function evaluateChildren(children: Renderable): Promise<RenderNode[]> {
  const node = await evaluate(children);
  return node.kind === 'group' ? node.children : [node];
}

/** JSX ツリーを中間ノード木にする */
export async function evaluate(node: Renderable): Promise<RenderNode> {
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
      `レンダリングできない値です: ${Object.prototype.toString.call(node)}`
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
    case 'exit': {
      const code = props.code;
      if (typeof code !== 'number' || !Number.isInteger(code)) {
        throw new RenderError('<Exit code> には整数を渡してください');
      }
      return { kind: 'exit', code };
    }
  }
}
