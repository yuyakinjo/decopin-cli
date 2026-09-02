/** decopin-cli の公開 API (Phase 1) */
export {
  Box,
  Br,
  Columns,
  Danger,
  DidYouMean,
  Dynamic,
  Exit,
  Indent,
  Info,
  Json,
  KeyValue,
  Line,
  Link,
  List,
  ProgressBar,
  Spinner,
  Stderr,
  Stdout,
  Success,
  Symbol,
  Table,
  Text,
  Warn,
} from './components/index.ts';
export {
  Arg,
  Argv,
  Env,
  Option,
  Output,
  Stdin,
  Var,
  Version,
} from './components/input/index.ts';
export type {
  ArgProps,
  ArgvProps,
  EnvProps,
  OptionProps,
  OutputProps,
  ShorthandType,
  StdinProps,
  VarProps,
  VersionProps,
} from './components/input/index.ts';
export { Type } from './components/type/index.ts';
export { Shell } from './components/shell/index.ts';
export type {
  AliasProps,
  CdProps,
  ExportProps,
  RawProps,
  SourceProps,
  UnsetProps,
} from './components/shell/index.ts';
export { generateShellHook, renderShell } from './runtime/shell.ts';
export {
  choose,
  nonInteractiveTerminal,
  processTerminal,
} from './runtime/choose.ts';
export type { ChooseOptions, Terminal } from './runtime/choose.ts';
export type { ShellName } from './runtime/shell.ts';
export { CliError } from './runtime/errors.ts';
export type { ErrorKind, ErrorProps } from './runtime/errors.ts';
export { DeclarationError } from './declaration/errors.ts';
export type {
  ArgSpec,
  ArgvSpec,
  OptionSpec,
  OutputSpec,
} from './declaration/spec.ts';
export type { TypeNode } from './declaration/type-node.ts';
export {
  RESERVED_OPTION_ALIASES,
  RESERVED_OPTION_NAMES,
} from './runtime/reserved.ts';
export type {
  Align,
  BlockProps,
  BorderStyle,
  BoxProps,
  Cell,
  ColumnsProps,
  DidYouMeanProps,
  DynamicProps,
  ExitProps,
  IndentProps,
  JsonProps,
  KeyValueProps,
  LineProps,
  LinkProps,
  ListProps,
  ProgressBarProps,
  SpinnerProps,
  StatusProps,
  SymbolKind,
  SymbolProps,
  TableProps,
  TextProps,
} from './components/index.ts';

export type { JsonValue } from './types/json.ts';
export type {
  EffectCategory,
  EffectVerdicts,
  Verdict,
} from './types/effects.ts';
export { argumentsSchema, toJsonSchema } from './declaration/json-schema.ts';
export type { JsonSchema } from './declaration/json-schema.ts';
export {
  annotationsFor,
  EFFECTS_META_KEY,
  listTools,
  toolName,
} from './runtime/mcp.ts';
export type { CallResult, McpTool, ToolAnnotations } from './runtime/mcp.ts';

export type {
  CommandBase,
  CommandProps,
  EnvVars,
  RouteName,
  Routes,
  RouteShape,
  UntypedCommandProps,
} from './types/routes.ts';

export { run } from './runtime/run.tsx';
export type { CommandContext, RunOptions } from './runtime/run.tsx';
export { EXIT_CODE } from './runtime/exit.ts';
export type { ExitCode } from './runtime/exit.ts';
export { Help, CommandList } from './runtime/help.tsx';
export type { HelpProps } from './runtime/help.tsx';
export { NotFound } from './runtime/not-found.tsx';
export {
  authRequired,
  help,
  missingTool,
  notFound,
  interrupt,
} from './runtime/signals.ts';
export type {
  AuthRequiredInput,
  HelpInput,
  MissingToolInput,
  NotFoundInput,
  InterruptSignal,
} from './runtime/signals.ts';
export type { NotFoundProps } from './runtime/not-found.tsx';
export { applyLayouts } from './runtime/layout.tsx';
export type { LayoutProps } from './runtime/layout.tsx';
export { runMiddleware } from './runtime/middleware.ts';
export type {
  MiddlewareContext,
  MiddlewareProps,
} from './runtime/middleware.ts';
export { processStdin, readStdin } from './runtime/stdin-reader.ts';
export type { StdinSource } from './runtime/stdin-reader.ts';
export { validateEnv } from './validation/env.ts';
export {
  closest,
  commandsUnder,
  resolveRoute,
  resolveTarget,
  suggest,
} from './runtime/router.ts';
export type {
  Resolved,
  RouteLoaders,
  RouteTable,
  Target,
} from './runtime/router.ts';

export { render } from './renderer/render.ts';
export type { RenderOptions, RenderResult } from './renderer/render.ts';
export { frameRows, present } from './renderer/present.ts';
export type { PresentOptions } from './renderer/present.ts';
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
export { displayWidth, terminalWidth, truncate } from './renderer/width.ts';
