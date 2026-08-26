/** decopin-cli の公開 API (Phase 1) */
export { Text, Line, Br, Stdout, Stderr, Exit } from './components/index.ts';
export { Argv, Arg, Option } from './components/input/index.ts';
export type {
  ArgProps,
  ArgvProps,
  OptionProps,
  ShorthandType,
} from './components/input/index.ts';
export { Type } from './components/type/index.ts';
export { CliError } from './runtime/errors.ts';
export type { ErrorKind } from './runtime/errors.ts';
export { DeclarationError } from './declaration/errors.ts';
export type { ArgSpec, ArgvSpec, OptionSpec } from './declaration/spec.ts';
export type { TypeNode } from './declaration/type-node.ts';
export {
  RESERVED_OPTION_ALIASES,
  RESERVED_OPTION_NAMES,
} from './runtime/reserved.ts';
export type {
  TextProps,
  LineProps,
  BlockProps,
  ExitProps,
} from './components/index.ts';

export type {
  CommandBase,
  CommandProps,
  Env,
  RouteName,
  Routes,
  RouteShape,
  UntypedCommandProps,
} from './types/routes.ts';

export { run } from './runtime/run.tsx';
export type { CommandContext, RunOptions } from './runtime/run.tsx';
export { EXIT_CODE } from './runtime/exit.ts';
export type { ExitCode } from './runtime/exit.ts';
export { resolveRoute, suggest } from './runtime/router.ts';
export type { Resolved, RouteLoaders, RouteTable } from './runtime/router.ts';

export { render } from './renderer/render.ts';
export type { RenderOptions, RenderResult } from './renderer/render.ts';
export { write } from './renderer/writer.ts';
export type { WritableLike, WriteTargets } from './renderer/writer.ts';
export { RenderError } from './renderer/errors.ts';

export type {
  Color,
  ColorName,
  Fd,
  Renderable,
  RenderInput,
  Style,
} from './jsx/types.ts';
export type { ColorDepth } from './renderer/color.ts';
