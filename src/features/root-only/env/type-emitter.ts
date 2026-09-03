import { quoteKey, toTypeText } from '../../../types/type-text.ts';
import type { EnvSpec } from './spec.ts';

/** `env.tsx` の宣言から EnvVars の型を作る */
export function envShape(env: EnvSpec | undefined): string {
  if (env === undefined || env.vars.length === 0) return '';
  const members = env.vars.map((declared) => {
    const always = declared.required || declared.defaultValue !== undefined;
    return `    ${quoteKey(declared.name)}${always ? '' : '?'}: ${toTypeText(
      declared.type
    )};`;
  });
  return `\n  interface EnvVars {\n${members.join('\n')}\n  }\n`;
}
