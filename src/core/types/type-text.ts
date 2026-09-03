import type { TypeNode } from './type-node.ts';

/** 識別子として使えない名前は引用符で囲む */
export function quoteKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/** union を配列にするときは括弧が必要 */
export function wrapUnion(text: string): string {
  return text.includes(' | ') ? `(${text})` : text;
}

/** 型宣言を TypeScript の型テキストに直す */
export function toTypeText(type: TypeNode): string {
  switch (type.kind) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'enum':
      return type.values.map((value) => JSON.stringify(value)).join(' | ');
    case 'date':
      return 'Date';
    case 'instant':
      return 'Temporal.Instant';
    case 'plainDate':
      return 'Temporal.PlainDate';
    case 'array':
      return `${wrap(type.item)}[]`;
    case 'object': {
      const fields = type.fields.map((field) => {
        const optional = field.required || field.defaultValue !== undefined;
        return `${quoteKey(field.name)}${optional ? '' : '?'}: ${toTypeText(
          field.type
        )}`;
      });
      return `{ ${fields.join('; ')} }`;
    }
    case 'oneOf':
      return type.options.map(wrap).join(' | ');
    case 'custom':
      // as が無ければ型は分からないので unknown (ADR 9)
      return type.as ?? 'unknown';
  }
}

/** union を別の型へ埋め込むときは括弧で囲む */
function wrap(type: TypeNode): string {
  return wrapUnion(toTypeText(type));
}
