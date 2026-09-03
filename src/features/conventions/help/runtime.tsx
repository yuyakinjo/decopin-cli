/**
 * `--help` を argv.tsx の宣言から組み立てる (ADR 8)。
 * 宣言を唯一の情報源にすることで、スキーマと help の二重管理が起きない。
 */
import { Br, Line, Text } from '../../../components/index.ts';
import type { Renderable } from '../../../jsx/types.ts';
import { typeLabel } from '../../../types/type-node.ts';
import { loadArgvSpec } from '../argv/runtime.ts';
import type { ArgSpec, ArgvSpec, OptionSpec } from '../argv/spec.ts';
import type { RouteTable } from '../cmd/router.ts';
import type { StdinSpec } from '../stdin/spec.ts';

/** 説明を縦に揃えるための最小の間隔 */
const GAP = 2;

/** help の一覧に添える説明を各 argv.tsx から集める。 */
export async function describeCommands(
  table: RouteTable,
  commands: readonly string[]
): Promise<Record<string, string | undefined>> {
  const entries = await Promise.all(
    commands.map(async (name) => {
      try {
        return [name, (await loadArgvSpec(table[name]?.argv)).description];
      } catch {
        return [name, undefined];
      }
    })
  );
  return Object.fromEntries(entries);
}

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

/**
 * `help.tsx` が受け取る props (ADR 8)。
 * 利用者向けなので `src/index.ts` から export する
 */
export interface HelpProps {
  /** 宣言から生成した使い方。そのまま差し込める */
  auto: Renderable;
  /** 実行ファイルの名前 */
  program: string;
  /** コマンド名 (`user list`)。ルート / グループなら空白区切りの名前 */
  command: string;
  argv: readonly string[];
  cwd: string;
}

interface AutoHelpProps {
  /** 実行ファイルの名前 */
  program: string;
  /** コマンド名 (`user create`)。ルートコマンドなら空文字 */
  command: string;
  spec: ArgvSpec;
  /** stdin.tsx があれば、その宣言 */
  stdin?: StdinSpec;
}

/** 1 コマンドの使い方 */
export function Help({
  program,
  command,
  spec,
  stdin,
}: AutoHelpProps): Renderable {
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
  /** グループ名 (`user`)。指定すると usage 行と表示名がその配下になる */
  group?: string;
  /**
   * コマンド名 → argv.tsx の description。一覧は「どれを打てばいいか」を
   * 選ぶ場面なので、名前だけでは足りない (dotfiles に載せて分かった)
   */
  descriptions?: Record<string, string | undefined>;
}

/**
 * コマンドが確定しなかったときの一覧。
 * `group` を渡すとそのディレクトリ配下だけを出す
 */
export function CommandList({
  program,
  commands,
  group,
  descriptions = {},
}: CommandListProps): Renderable {
  const groupWords =
    group === undefined || group === '' ? [] : group.split('/');
  /** グループ名を除いた、利用者が打つべき残りの語 */
  const labelOf = (name: string): string =>
    name.split('/').slice(groupWords.length).join(' ');

  const usage = [program, ...groupWords, '<command> [options]'].join(' ');
  const detail = [program, ...groupWords, '<command> --help'].join(' ');
  const width = Math.max(0, ...commands.map((name) => labelOf(name).length));

  return (
    <>
      <Line>
        <Text bold>Usage:</Text> {usage}
      </Line>
      <Br />
      <Line>
        <Text bold>Commands:</Text>
      </Line>
      {commands.map((name) => {
        const description = descriptions[name];
        return (
          <Line key={name}>
            {'  '}
            <Text color="cyan">
              {description === undefined
                ? labelOf(name)
                : pad(labelOf(name), width)}
            </Text>
            {description === undefined ? null : description}
          </Line>
        );
      })}
      <Br />
      <Line>{`Run "${detail}" for details.`}</Line>
    </>
  );
}
