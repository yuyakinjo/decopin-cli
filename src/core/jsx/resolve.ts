import { DeclarationError } from '../errors.ts';
/**
 * 宣言用の JSX ツリーを、組み込みノードの木にする。
 *
 * レンダラーの evaluate (ADR 1 の (1)) と役割は同じだが、出力ではなく
 * 「宣言の構造」を取り出す。関数コンポーネントを呼び、Fragment と配列を
 * 平らにするので、`_` 配下の共有コンポーネントもそのまま展開される (test/contract/argv-parsing.test.ts)。
 */
import { isElement, isHost } from './types.ts';
import type {
  AnyComponent,
  HostKind,
  Renderable,
  RenderInput,
} from './types.ts';

export interface HostNode {
  kind: HostKind;
  /** children を除いた props */
  props: Record<string, unknown>;
  children: HostNode[];
  /** エラーメッセージ用の表示名 (`Type.String` など) */
  displayName: string;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/** 宣言ツリーを組み込みノードの並びにする */
export async function resolveHosts(node: RenderInput): Promise<HostNode[]> {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return [];
  }

  if (typeof node === 'string' || typeof node === 'number') {
    const shown = typeof node === 'string' ? `"${node}"` : String(node);
    throw new DeclarationError(
      `Unexpected text ${shown} in a declaration. Only declaration components are allowed here`
    );
  }

  if (isThenable(node)) {
    const resolved = (await node) as Renderable;
    return resolveHosts(resolved);
  }

  if (Array.isArray(node)) {
    const nodes: HostNode[] = [];
    for (const child of node) {
      nodes.push(...(await resolveHosts(child)));
    }
    return nodes;
  }

  if (!isElement(node)) {
    throw new DeclarationError(
      `Cannot interpret value in a declaration: ${Object.prototype.toString.call(node)}`
    );
  }

  const { type, props } = node;
  if (!isHost(type)) {
    const result = await (type as AnyComponent)(props as never);
    return resolveHosts(result);
  }

  const { children, ...rest } = props;
  return [
    {
      kind: type.$host,
      props: rest,
      children: await resolveHosts(children as Renderable),
      displayName: type.name,
    },
  ];
}
