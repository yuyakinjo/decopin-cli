import type { HostNode } from '../../../jsx/resolve.ts';
import { isReservedAlias, isReservedName } from '../../../runtime/reserved.ts';
/**
 * 宣言ノードの木を {@link ArgvSpec} にする。ここが `argv.tsx` の意味を決める場所。
 *
 * ADR 5 の check に相当する検証もここで行う。ビルド時 (型生成) と実行時の
 * どちらから呼んでも同じ結果になるよう、副作用を持たせない。
 */
import { DeclarationError } from '../../errors.ts';
import {
  presence,
  readBoolean,
  readString,
  requireName,
  resolveType,
} from '../../parse-helpers.ts';
import type { ArgSpec, ArgvSpec, OptionSpec } from './spec.ts';

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
