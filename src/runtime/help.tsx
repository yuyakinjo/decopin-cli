/**
 * `--help` を argv.tsx の宣言から組み立てる (ADR 8)。
 * 宣言を唯一の情報源にすることで、スキーマと help の二重管理が起きない。
 */
import { Br, Line, Text } from '../components/index.ts';
import type {
  ArgSpec,
  ArgvSpec,
  OptionSpec,
  StdinSpec,
} from '../declaration/spec.ts';
import { typeLabel } from '../declaration/type-node.ts';
import type { Renderable } from '../jsx/types.ts';

/** 説明を縦に揃えるための最小の間隔 */
const GAP = 2;

function argUsage(arg: ArgSpec): string {
  const inner = arg.variadic ? `${arg.name}...` : arg.name;
  return arg.required ? `<${inner}>` : `[${inner}]`;
}

function optionLabel(option: OptionSpec): string {
  const flags =
    option.alias === undefined
      ? `    --${option.name}`
      : `-${option.alias}, --${option.name}`;
  return option.type.kind === 'boolean'
    ? flags
    : `${flags} <${typeLabel(option.type)}>`;
}

function describe(
  description: string | undefined,
  defaultValue: unknown
): string {
  const parts: string[] = [];
  if (description !== undefined) parts.push(description);
  if (defaultValue !== undefined) {
    parts.push(`(default: ${JSON.stringify(defaultValue)})`);
  }
  return parts.join(' ');
}

function pad(label: string, width: number): string {
  return label.padEnd(width + GAP, ' ');
}

interface HelpProps {
  /** 実行ファイルの名前 */
  program: string;
  /** コマンド名 (`user create`)。ルートコマンドなら空文字 */
  command: string;
  spec: ArgvSpec;
  /** stdin.tsx があれば、その宣言 (§4.2) */
  stdin?: StdinSpec;
}

/** 1 コマンドの使い方 */
export function Help({ program, command, spec, stdin }: HelpProps): Renderable {
  const visibleOptions = spec.options.filter((option) => !option.hidden);
  const usage = [
    program,
    ...command.split('/').filter((part) => part !== ''),
    ...spec.args.map(argUsage),
    visibleOptions.length === 0 ? undefined : '[options]',
  ].filter((part) => part !== undefined);

  const argLabels = spec.args.map((arg) => arg.name);
  const optionLabels = visibleOptions.map(optionLabel);
  const helpLabel = '-h, --help';
  const width = Math.max(
    0,
    ...argLabels.map((label) => label.length),
    ...optionLabels.map((label) => label.length),
    helpLabel.length
  );

  return (
    <>
      <Line>
        <Text bold>Usage:</Text> {usage.join(' ')}
      </Line>
      {spec.description === undefined ? null : (
        <>
          <Br />
          <Line>{spec.description}</Line>
        </>
      )}
      {stdin === undefined ? null : (
        <>
          <Br />
          <Line>
            <Text bold>Stdin:</Text>
          </Line>
          <Line>
            {'  '}
            <Text color="cyan">{pad(stdin.mode, width)}</Text>
            {stdin.required
              ? 'required (pipe something in)'
              : 'optional (undefined when run in a terminal)'}
          </Line>
        </>
      )}
      {spec.args.length === 0 ? null : (
        <>
          <Br />
          <Line>
            <Text bold>Arguments:</Text>
          </Line>
          {spec.args.map((arg) => (
            <Line key={arg.name}>
              {'  '}
              <Text color="cyan">{pad(arg.name, width)}</Text>
              {describe(arg.description, arg.defaultValue)}
            </Line>
          ))}
        </>
      )}
      <Br />
      <Line>
        <Text bold>Options:</Text>
      </Line>
      {visibleOptions.map((option, index) => (
        <Line key={option.name}>
          {'  '}
          <Text color="cyan">{pad(optionLabels[index] as string, width)}</Text>
          {describe(option.description, option.defaultValue)}
        </Line>
      ))}
      <Line>
        {'  '}
        <Text color="cyan">{pad(helpLabel, width)}</Text>
        show this help
      </Line>
    </>
  );
}

interface CommandListProps {
  program: string;
  commands: string[];
}

/** コマンドを指定しなかったときの一覧 */
export function CommandList({
  program,
  commands,
}: CommandListProps): Renderable {
  const width = Math.max(0, ...commands.map((name) => name.length));
  return (
    <>
      <Line>
        <Text bold>Usage:</Text> {program} {'<command> [options]'}
      </Line>
      <Br />
      <Line>
        <Text bold>Commands:</Text>
      </Line>
      {commands.map((name) => (
        <Line key={name}>
          {'  '}
          <Text color="cyan">{pad(name.split('/').join(' '), width)}</Text>
        </Line>
      ))}
      <Br />
      <Line>{`Run "${program} <command> --help" for details.`}</Line>
    </>
  );
}
