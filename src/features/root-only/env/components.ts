import { host } from '../../../components/host.ts';
import type { Renderable } from '../../../jsx/types.ts';
import type { ShorthandType } from '../../conventions/argv/components.ts';

/** 環境変数宣言のルート */
export interface EnvProps {
  children?: Renderable;
}

/** 環境変数 1 つ。`<Option>` と同じ規則に従う */
export interface VarProps {
  name: string;
  /** 制約なしの型の短縮形。children と同時には指定できない */
  type?: ShorthandType;
  required?: boolean;
  default?: unknown;
  description?: string;
  children?: Renderable;
}

/** 環境変数宣言のルート (`env.tsx`) */
export const Env = host<EnvProps>('env', 'Env');

/** 環境変数 1 つ */
export const Var = host<VarProps>('var', 'Var');
