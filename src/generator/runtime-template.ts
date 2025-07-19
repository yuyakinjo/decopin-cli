import type { ParsedCommand } from '../types/command.js';

/**
 * バリデーション関数生成
 */
export function generateValidationFunction(): string {
  return `async function createValidationFunction(paramsDefinition) {
  const { createValidationFunction: actualValidationFunction } = await import('./validation.js');
  return actualValidationFunction(paramsDefinition);
}`;
}

/**
 * 引数パーサー生成
 */
export function generateArgumentParser(): string {
  return `function parseArguments(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=', 2);
      if (value !== undefined) {
        options[key] = value;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      options[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}`;
}

/**
 * コマンドマッチャー生成
 */
export function generateCommandMatcher(commands: ParsedCommand[]): string {
  return `function matchCommand(segments) {
  const availableCommands = [
${commands
  .map((cmd) => {
    const path = cmd.path || '';
    const segments = path ? path.split('/') : [];
    const metadata = cmd.definition.metadata || {};
    const metadataJson = JSON.stringify(metadata);
    return `    { path: '${path}', segments: ${JSON.stringify(segments)}, definition: { metadata: ${metadataJson} } }`;
  })
  .join(',\n')}
  ];

  for (const command of availableCommands) {
    if (segments.length >= command.segments.length) {
      let match = true;
      const params = {};

      for (let i = 0; i < command.segments.length; i++) {
        const segment = command.segments[i];
        const userSegment = segments[i];

        if (segment.startsWith('[') && segment.endsWith(']')) {
          const paramName = segment.slice(1, -1);
          params[paramName] = userSegment;
        } else if (segment !== userSegment) {
          match = false;
          break;
        }
      }

      if (match) {
        return { command, params };
      }
    }
  }

  return { command: null, params: {} };
}`;
}
