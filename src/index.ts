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
} from './core/components/index.ts';
export { Arg, Argv, Option } from './features/conventions/argv/components.ts';
export type {
  ArgProps,
  ArgvProps,
  OptionProps,
  ShorthandType,
} from './features/conventions/argv/components.ts';
export { Output } from './features/conventions/output/components.ts';
export type { OutputProps } from './features/conventions/output/components.ts';
export { Stdin } from './features/conventions/stdin/components.ts';
export type { StdinProps } from './features/conventions/stdin/components.ts';
export { Env, Var } from './features/root-only/env/components.ts';
export type {
  EnvProps,
  VarProps,
} from './features/root-only/env/components.ts';
export { Version } from './features/root-only/version/components.ts';
export type { VersionProps } from './features/root-only/version/components.ts';
export { Type } from './core/components/type/index.ts';
export { Shell } from './features/conventions/shell/components.ts';
export type {
  AliasProps,
  CdProps,
  ExportProps,
  RawProps,
  SourceProps,
  UnsetProps,
} from './features/conventions/shell/components.ts';
export {
  generateShellHook,
  renderShell,
} from './features/conventions/shell/runtime.ts';
export {
  ask,
  choose,
  confirm,
  nonInteractiveTerminal,
  processTerminal,
} from './core/runtime/choose.ts';
export type {
  AskOptions,
  ChooseOptions,
  ConfirmOptions,
  Terminal,
} from './core/runtime/choose.ts';
export type {
  Candidate,
  Completer,
  CompleteProps,
} from './features/conventions/complete/runtime.ts';
export type { ShellName } from './features/conventions/shell/runtime.ts';
export { CliError, isCliError } from './core/runtime/errors.ts';
export type { ErrorKind, ErrorProps } from './core/runtime/errors.ts';
export {
  DeclarationError,
  errorTag,
  isDeclarationError,
} from './core/errors.ts';
export type {
  ArgSpec,
  ArgvSpec,
  OptionSpec,
} from './features/conventions/argv/spec.ts';
export type { OutputSpec } from './features/conventions/output/spec.ts';
export type { TypeNode } from './core/types/type-node.ts';
export {
  RESERVED_OPTION_ALIASES,
  RESERVED_OPTION_NAMES,
} from './core/runtime/reserved.ts';
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
} from './core/components/index.ts';

export type { JsonValue } from './features/conventions/data/types.ts';
export type {
  EffectCategory,
  EffectVerdicts,
  Verdict,
} from './core/types/effects.ts';
export { toJsonSchema } from './core/types/json-schema.ts';
export type { JsonSchema } from './core/types/json-schema.ts';
export { argumentsSchema } from './features/conventions/argv/json-schema.ts';
export {
  annotationsFor,
  EFFECTS_META_KEY,
  listTools,
  toolName,
} from './core/runtime/mcp.ts';
export type {
  CallResult,
  McpTool,
  ToolAnnotations,
} from './core/runtime/mcp.ts';

export type {
  CommandBase,
  CommandProps,
  RouteName,
  Routes,
  RouteShape,
  UntypedCommandProps,
} from './features/conventions/cmd/types.ts';
export type { EnvVars } from './features/root-only/env/types.ts';

export { run } from './core/runtime/run.tsx';
export type { CommandContext } from './features/conventions/cmd/context.ts';
export type { RunOptions } from './core/runtime/run.tsx';
export { EXIT_CODE } from './core/runtime/exit.ts';
export type { ExitCode } from './core/runtime/exit.ts';
export { CommandList, Help } from './features/conventions/help/runtime.tsx';
export type { HelpProps } from './features/conventions/help/runtime.tsx';
export { NotFound } from './features/conventions/not-found/runtime.tsx';
export {
  authRequired,
  missingTool,
  interrupt,
} from './core/runtime/signals.ts';
export { help } from './features/conventions/help/signal.ts';
export { notFound } from './features/conventions/not-found/signal.ts';
export type {
  AuthRequiredInput,
  MissingToolInput,
  InterruptSignal,
} from './core/runtime/signals.ts';
export type { HelpInput } from './features/conventions/help/signal.ts';
export type { NotFoundInput } from './features/conventions/not-found/signal.ts';
export type { NotFoundProps } from './features/conventions/not-found/runtime.tsx';
export { applyLayouts } from './features/conventions/layout/runtime.tsx';
export type { LayoutProps } from './features/conventions/layout/runtime.tsx';
export { runMiddleware } from './features/conventions/middleware/runtime.ts';
export type {
  MiddlewareContext,
  MiddlewareProps,
} from './features/conventions/middleware/runtime.ts';
export {
  processStdin,
  readStdin,
} from './features/conventions/stdin/runtime.ts';
export type { StdinSource } from './features/conventions/stdin/runtime.ts';
export { validateEnv } from './features/root-only/env/validation.ts';
export { closest } from './core/text.ts';
export {
  commandsUnder,
  resolveRoute,
  resolveTarget,
  suggest,
} from './features/conventions/cmd/router.ts';
export type {
  Resolved,
  RouteLoaders,
  RouteTable,
  Target,
} from './features/conventions/cmd/router.ts';

export { render } from './core/renderer/render.ts';
export type { RenderOptions, RenderResult } from './core/renderer/render.ts';
export { frameRows, present } from './core/renderer/present.ts';
export type { PresentOptions } from './core/renderer/present.ts';
export { write } from './core/renderer/writer.ts';
export type { WritableLike, WriteTargets } from './core/renderer/writer.ts';
export { isRenderError, RenderError } from './core/renderer/errors.ts';

export type {
  Color,
  ColorName,
  Fd,
  Renderable,
  RenderInput,
  Style,
} from './core/jsx/types.ts';
export type { ColorDepth } from './core/renderer/color.ts';
export {
  displayWidth,
  terminalWidth,
  truncate,
} from './core/renderer/width.ts';
