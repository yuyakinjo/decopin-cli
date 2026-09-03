import type { HostNode } from '../core/jsx/resolve.ts';
import type { ObjectField, TypeNode } from '../core/types/type-node.ts';
import { DeclarationError } from './errors.ts';

type Shorthand = 'string' | 'number' | 'boolean';

export function readNumber(node: HostNode, key: string): number | undefined {
  const value = node.props[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number') {
    throw new DeclarationError(
      `<${node.displayName} ${key}> requires a number, received ${typeof value}`
    );
  }
  return value;
}

export function readBoolean(node: HostNode, key: string): boolean | undefined {
  const value = node.props[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new DeclarationError(
      `<${node.displayName} ${key}> requires a boolean, received ${typeof value}`
    );
  }
  return value;
}

export function readString(node: HostNode, key: string): string | undefined {
  const value = node.props[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new DeclarationError(
      `<${node.displayName} ${key}> requires a string, received ${typeof value}`
    );
  }
  return value;
}

/** children にちょうど 1 つの型を要求する */
export function onlyType(node: HostNode): TypeNode {
  if (node.children.length !== 1) {
    throw new DeclarationError(
      `<${node.displayName}> requires exactly one type child, found ${node.children.length}`
    );
  }
  return toTypeNode(node.children[0] as HostNode);
}

/** 型宣言ノードを {@link TypeNode} にする */
export function toTypeNode(node: HostNode): TypeNode {
  switch (node.kind) {
    case 'type.string':
      return {
        kind: 'string',
        minLength: readNumber(node, 'minLength'),
        maxLength: readNumber(node, 'maxLength'),
        pattern: readString(node, 'pattern'),
        email: readBoolean(node, 'email'),
        url: readBoolean(node, 'url'),
      };
    case 'type.number':
      return {
        kind: 'number',
        min: readNumber(node, 'min'),
        max: readNumber(node, 'max'),
        integer: readBoolean(node, 'integer'),
      };
    case 'type.boolean':
      return { kind: 'boolean' };
    case 'type.enum': {
      const values = node.props.values;
      if (!Array.isArray(values) || values.length === 0) {
        throw new DeclarationError(
          '<Type.Enum values> requires a non-empty array of strings'
        );
      }
      for (const value of values) {
        if (typeof value !== 'string') {
          throw new DeclarationError('<Type.Enum values> accepts strings only');
        }
      }
      return { kind: 'enum', values: values as string[] };
    }
    // 非推奨。src/deprecations.ts に削除期限がある
    case 'type.date':
      return {
        kind: 'date',
        min: readString(node, 'min'),
        max: readString(node, 'max'),
      };
    case 'type.instant':
      return {
        kind: 'instant',
        min: readMoment(node, 'min', 'instant'),
        max: readMoment(node, 'max', 'instant'),
      };
    case 'type.plainDate':
      return {
        kind: 'plainDate',
        min: readMoment(node, 'min', 'plainDate'),
        max: readMoment(node, 'max', 'plainDate'),
      };
    case 'type.array':
      return {
        kind: 'array',
        item: onlyType(node),
        minItems: readNumber(node, 'minItems'),
        maxItems: readNumber(node, 'maxItems'),
      };
    case 'type.object': {
      const fields: ObjectField[] = [];
      for (const child of node.children) {
        if (child.kind !== 'type.field') {
          throw new DeclarationError(
            `<Type.Object> accepts <Type.Field> children only, found <${child.displayName}>`
          );
        }
        const name = readString(child, 'name');
        if (name === undefined || name === '') {
          throw new DeclarationError('<Type.Field name> is required');
        }
        const required = readBoolean(child, 'required') ?? false;
        const hasDefault = child.props.defaultValue !== undefined;
        if (required && hasDefault) {
          throw new DeclarationError(
            `<Type.Field name="${name}"> cannot be both required and have defaultValue`
          );
        }
        fields.push({
          name,
          required,
          defaultValue: child.props.defaultValue,
          type: onlyType(child),
        });
      }
      if (fields.length === 0) {
        throw new DeclarationError(
          '<Type.Object> requires at least one <Type.Field>'
        );
      }
      return { kind: 'object', fields };
    }
    case 'type.field':
      throw new DeclarationError(
        '<Type.Field> can only appear inside <Type.Object>'
      );
    case 'type.oneOf': {
      if (node.children.length < 2) {
        throw new DeclarationError(
          '<Type.OneOf> requires at least two type children'
        );
      }
      return {
        kind: 'oneOf',
        options: node.children.map(toTypeNode),
      };
    }
    case 'type.custom': {
      const validate = node.props.validate;
      if (typeof validate !== 'function') {
        throw new DeclarationError(
          '<Type.Custom validate> requires a function'
        );
      }
      // as は「出力する TypeScript の型名」。primitive のときだけ
      // argv の変換も行う (ADR 9)
      const as = readString(node, 'as');
      const coerceAs =
        as === 'string' || as === 'number' || as === 'boolean' ? as : 'none';
      return {
        kind: 'custom',
        validate: validate as (value: unknown) => boolean,
        message: readString(node, 'message'),
        as,
        coerceAs,
      };
    }
    default:
      throw new DeclarationError(
        `<${node.displayName}> is not a type. Use Type.* components here`
      );
  }
}

/** 宣言がどの入力源のものか。Type.Object が使えるのは stdin だけ (ADR 9) */
export type InputSource = 'argv' | 'env' | 'stdin';

/**
 * 型の木に `object` が含まれていないか確かめる。
 *
 * argv / env の値は常に文字列で届くので、構造を宣言しても意味が取れない。
 * ビルド時 (宣言の評価) に弾く
 */
export function rejectObjectFor(source: InputSource, type: TypeNode): void {
  if (source === 'stdin') return;
  const walk = (current: TypeNode): void => {
    if (current.kind === 'object') {
      throw new DeclarationError(
        `<Type.Object> cannot be used for ${source}. ${source} values always arrive as strings; declare the structure in stdin.tsx instead`
      );
    }
    if (current.kind === 'array') return walk(current.item);
    if (current.kind === 'oneOf') {
      for (const option of current.options) walk(option);
    }
  };
  walk(type);
}

/** `type` 短縮形と children のどちらかから型を決める */
export function resolveType(node: HostNode, source: InputSource): TypeNode {
  const shorthand = node.props.type as Shorthand | undefined;
  const hasChildren = node.children.length > 0;

  if (shorthand !== undefined && hasChildren) {
    throw new DeclarationError(
      `<${node.displayName} name="${String(node.props.name)}"> cannot set both the "type" shorthand and a Type.* child`
    );
  }
  if (shorthand !== undefined) {
    if (
      shorthand !== 'string' &&
      shorthand !== 'number' &&
      shorthand !== 'boolean'
    ) {
      throw new DeclarationError(
        `<${node.displayName} type> must be "string", "number", or "boolean"`
      );
    }
    return { kind: shorthand };
  }
  if (hasChildren) {
    const type = onlyType(node);
    rejectObjectFor(source, type);
    return type;
  }

  throw new DeclarationError(
    `<${node.displayName} name="${String(node.props.name)}"> needs a type: set type="string" or nest a Type.* child`
  );
}

export function requireName(node: HostNode): string {
  const name = readString(node, 'name');
  if (name === undefined || name === '') {
    throw new DeclarationError(`<${node.displayName} name> is required`);
  }
  return name;
}

/** required と default の同時指定を弾く (test/contract/argv-parsing.test.ts) */
export function presence(
  node: HostNode,
  name: string
): { required: boolean; defaultValue: unknown } {
  const required = readBoolean(node, 'required') ?? false;
  const hasDefault = node.props.default !== undefined;
  if (required && hasDefault) {
    throw new DeclarationError(
      `<${node.displayName} name="${name}"> cannot be both required and have a default`
    );
  }
  return { required, defaultValue: node.props.default };
}

/**
 * `min` / `max` を読み、その場で Temporal として解釈できるか確かめる。
 *
 * ビルド時に弾いておかないと、境界が読めないまま「常に通る検証」になる。
 */
function readMoment(
  node: HostNode,
  prop: string,
  kind: 'instant' | 'plainDate'
): string | undefined {
  const raw = readString(node, prop);
  if (raw === undefined) return undefined;
  try {
    if (kind === 'instant') Temporal.Instant.from(raw);
    else Temporal.PlainDate.from(raw);
  } catch {
    const name = kind === 'instant' ? 'Type.Instant' : 'Type.PlainDate';
    throw new DeclarationError(
      `<${name} ${prop}="${raw}"> is not a ${kind === 'instant' ? 'Temporal.Instant' : 'Temporal.PlainDate'}`
    );
  }
  return raw;
}
