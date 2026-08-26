import type { HostComponent, HostKind } from '../jsx/types.ts';
import { RenderError } from '../renderer/errors.ts';

/**
 * 組み込みコンポーネントを作る。実体は「呼ばれたら投げる関数」で、
 * レンダラーは `$host` を見て解釈するため実際には呼ばれない。
 */
export function host<P>(kind: HostKind, name: string): HostComponent<P> {
  const component = (): never => {
    throw new RenderError(
      `<${name}> はレンダラーが解釈する組み込みコンポーネントです。関数として直接呼び出せません`
    );
  };
  Object.defineProperty(component, 'name', { value: name });
  Object.defineProperty(component, '$host', { value: kind, enumerable: true });
  return component as unknown as HostComponent<P>;
}
