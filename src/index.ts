/** decopin-cli の公開 API (Phase 1) */
export { Text, Line, Br, Stdout, Stderr, Exit } from './components/index.ts';
export type {
  TextProps,
  LineProps,
  BlockProps,
  ExitProps,
} from './components/index.ts';

export { render } from './renderer/render.ts';
export type { RenderOptions, RenderResult } from './renderer/render.ts';
export { write } from './renderer/writer.ts';
export type { WritableLike, WriteTargets } from './renderer/writer.ts';
export { RenderError } from './renderer/errors.ts';

export type { Color, ColorName, Fd, Renderable, Style } from './jsx/types.ts';
export type { ColorDepth } from './renderer/color.ts';
