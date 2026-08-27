/**
 * 宣言ノードの木を {@link ArgvSpec} にする。ここが `argv.tsx` の意味を決める場所。
 *
 * §8 の check に相当する検証もここで行う。ビルド時 (型生成) と実行時の
 * どちらから呼んでも同じ結果になるよう、副作用を持たせない。
 */
import { isAsyncSchema, isValibotSchema } from '../build/schema-introspect.ts';
import { isReservedAlias, isReservedName } from '../runtime/reserved.ts';
import { DeclarationError } from './errors.ts';
import type { HostNode } from './resolve.ts';
import type {
  ArgSpec,
  ArgvSpec,
  EnvSpec,
  OptionSpec,
  StdinSpec,
  VarSpec,
  VersionSpec,
} from './spec.ts';
import type { ObjectField, TypeNode } from './type-node.ts';

type Shorthand = 'string' | 'number' | 'boolean';

function readNumber(node: HostNode, key: string): number | undefined {
  const value = node.props[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number') {
    throw new DeclarationError(
      `<${node.displayName} ${key}> requires a number, received ${typeof value}`
    );
  }
  return value;
}

function readBoolean(node: HostNode, key: string): boolean | undefined {
  const value = node.props[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new DeclarationError(
      `<${node.displayName} ${key}> requires a boolean, received ${typeof value}`
    );
  }
  return value;
}

function readString(node: HostNode, key: string): string | undefined {
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
function onlyType(node: HostNode): TypeNode {
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
    case 'type.date':
      return {
        kind: 'date',
        min: readString(node, 'min'),
        max: readString(node, 'max'),
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
      // argv の変換も行う (§4.8)
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

/** 宣言がどの入力源のものか。Type.Object が使えるのは stdin だけ (§4.8) */
export type InputSource = 'argv' | 'env' | 'stdin';

/** 型の木に `object` が含まれていないか確かめる */
function rejectObject(
  type: TypeNode,
  node: HostNode,
  source: InputSource
): void {
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
  void node;
}

/** `type` 短縮形と children のどちらかから型を決める */
function resolveType(node: HostNode, source: InputSource): TypeNode {
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
    rejectObject(type, node, source);
    return type;
  }

  throw new DeclarationError(
    `<${node.displayName} name="${String(node.props.name)}"> needs a type: set type="string" or nest a Type.* child`
  );
}

function requireName(node: HostNode): string {
  const name = readString(node, 'name');
  if (name === undefined || name === '') {
    throw new DeclarationError(`<${node.displayName} name> is required`);
  }
  return name;
}

/** required と default の同時指定を弾く (§4.1) */
function presence(node: HostNode, name: string) {
  const required = readBoolean(node, 'required') ?? false;
  const hasDefault = node.props.default !== undefined;
  if (required && hasDefault) {
    throw new DeclarationError(
      `<${node.displayName} name="${name}"> cannot be both required and have a default`
    );
  }
  return { required, defaultValue: node.props.default };
}

/** `env.tsx` の宣言を読む (§4.7) */
export function parseEnvSpec(hosts: HostNode[]): EnvSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'env') {
    throw new DeclarationError('env.tsx must return a single <Env> element');
  }
  const vars: VarSpec[] = [];
  const seen = new Set<string>();

  for (const child of hosts[0].children) {
    if (child.kind !== 'var') {
      throw new DeclarationError(
        `<Env> accepts <Var> children only, found <${child.displayName}>`
      );
    }
    const name = requireName(child);
    if (seen.has(name)) {
      throw new DeclarationError(`Duplicate <Var name="${name}">`);
    }
    seen.add(name);
    const { required, defaultValue } = presence(child, name);
    vars.push({
      name,
      description: readString(child, 'description'),
      required,
      defaultValue,
      type: resolveType(child, 'env'),
    });
  }

  if (vars.length === 0) {
    throw new DeclarationError('<Env> requires at least one <Var>');
  }
  return { vars };
}

/** `version.tsx` の宣言を読む (§4.7) */
export function parseVersionSpec(hosts: HostNode[]): VersionSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'version') {
    throw new DeclarationError(
      'version.tsx must return a single <Version> element'
    );
  }
  const node = hosts[0];
  const version = readString(node, 'version');
  if (version === undefined || version === '') {
    throw new DeclarationError('<Version version> is required');
  }
  return { version, name: readString(node, 'name') };
}

/** `stdin.tsx` の宣言を読む (§4.2) */
export function parseStdinSpec(hosts: HostNode[]): StdinSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'stdin') {
    throw new DeclarationError(
      'stdin.tsx must return a single <Stdin> element'
    );
  }
  const node = hosts[0];
  const mode = readString(node, 'mode');
  if (mode !== 'text' && mode !== 'lines' && mode !== 'json') {
    throw new DeclarationError(
      '<Stdin mode> must be "text", "lines", or "json"'
    );
  }

  const hasChildren = node.children.length > 0;
  if (hasChildren && mode !== 'json') {
    throw new DeclarationError(
      `<Stdin mode="${mode}"> takes no children. Only mode="json" can declare a structure`
    );
  }

  const schema = node.props.schema;
  if (schema !== undefined) {
    if (hasChildren) {
      throw new DeclarationError(
        '<Stdin> cannot set both the "schema" prop and a Type.* child'
      );
    }
    if (mode !== 'json') {
      throw new DeclarationError(
        `<Stdin mode="${mode}"> cannot take a "schema" prop. Only mode="json" can`
      );
    }
    if (!isValibotSchema(schema)) {
      throw new DeclarationError(
        '<Stdin schema> requires a valibot schema (e.g. v.object({ ... }))'
      );
    }
    if (isAsyncSchema(schema)) {
      throw new DeclarationError(
        '<Stdin schema> cannot take an async schema (validation runs synchronously)'
      );
    }
  }

  return {
    mode,
    required: readBoolean(node, 'required') ?? false,
    trim: readBoolean(node, 'trim') ?? false,
    type: hasChildren ? onlyType(node) : undefined,
    schema,
  };
}

export function parseArgvSpec(hosts: HostNode[]): ArgvSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'argv') {
    throw new DeclarationError('argv.tsx must return a single <Argv> element');
  }
  const root = hosts[0];
  const args: ArgSpec[] = [];
  const options: OptionSpec[] = [];

  for (const child of root.children) {
    if (child.kind === 'arg') {
      const name = requireName(child);
      const { required, defaultValue } = presence(child, name);
      args.push({
        name,
        description: readString(child, 'description'),
        required,
        defaultValue,
        variadic: readBoolean(child, 'variadic') ?? false,
        type: resolveType(child, 'argv'),
      });
      continue;
    }
    if (child.kind === 'option') {
      const name = requireName(child);
      if (isReservedName(name)) {
        throw new DeclarationError(
          `Option "--${name}" is reserved by decopin-cli and cannot be redeclared`
        );
      }
      const alias = readString(child, 'alias');
      if (alias !== undefined) {
        if (alias.length !== 1) {
          throw new DeclarationError(
            `<Option name="${name}" alias> must be a single character, received "${alias}"`
          );
        }
        if (isReservedAlias(alias)) {
          throw new DeclarationError(
            `Alias "-${alias}" is reserved by decopin-cli and cannot be redeclared`
          );
        }
      }
      const { required, defaultValue } = presence(child, name);
      options.push({
        name,
        alias,
        description: readString(child, 'description'),
        required,
        defaultValue,
        hidden: readBoolean(child, 'hidden') ?? false,
        type: resolveType(child, 'argv'),
      });
      continue;
    }
    throw new DeclarationError(
      `<Argv> accepts <Arg> and <Option> children only, found <${child.displayName}>`
    );
  }

  checkArgOrder(args);
  checkDuplicates(args, options);

  return {
    description: readString(root, 'description'),
    args,
    options,
  };
}

/** 位置引数は「必須 → 省略可能」の順でなければ解釈が曖昧になる */
function checkArgOrder(args: ArgSpec[]): void {
  let seenOptional: string | undefined;
  for (const [index, arg] of args.entries()) {
    if (arg.variadic && index !== args.length - 1) {
      throw new DeclarationError(
        `<Arg name="${arg.name}" variadic> must be the last positional argument`
      );
    }
    if (arg.required && seenOptional !== undefined) {
      throw new DeclarationError(
        `<Arg name="${arg.name}"> is required but comes after the optional "${seenOptional}". Declare required arguments first`
      );
    }
    if (!arg.required) seenOptional = arg.name;
  }
}

function checkDuplicates(args: ArgSpec[], options: OptionSpec[]): void {
  const argNames = new Set<string>();
  for (const arg of args) {
    if (argNames.has(arg.name)) {
      throw new DeclarationError(`Duplicate <Arg name="${arg.name}">`);
    }
    argNames.add(arg.name);
  }

  const optionNames = new Set<string>();
  const aliases = new Map<string, string>();
  for (const option of options) {
    if (optionNames.has(option.name)) {
      throw new DeclarationError(`Duplicate <Option name="${option.name}">`);
    }
    optionNames.add(option.name);
    if (option.alias === undefined) continue;
    const owner = aliases.get(option.alias);
    if (owner !== undefined) {
      throw new DeclarationError(
        `Alias "-${option.alias}" is used by both "--${owner}" and "--${option.name}"`
      );
    }
    aliases.set(option.alias, option.name);
  }
}
