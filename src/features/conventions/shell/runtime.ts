/**
 * `shell.tsx` の宣言をシェルコードにし、親シェルに届ける (ADR 35)。
 *
 * 届け方: シェル関数が一時ファイルの場所を {@link SHELL_FILE_ENV} で渡し、
 * CLI はそこに書く。関数は CLI の終了後にそのファイルを source する。
 * stdout / stderr には一切触らないので、パイプの約束 (ADR 26) はそのまま
 */
import { DeclarationError } from '../../../core/errors.ts';
import type { HostNode } from '../../../core/jsx/resolve.ts';
import type { RenderInput } from '../../../core/jsx/types.ts';
import { CliError } from '../../../core/runtime/errors.ts';
import type { CommandContext } from '../cmd/context.ts';

/** shell.tsx を読み、cmd.tsx と同じ props を受ける関数として返す。 */
export async function loadShell(
  loader: () => Promise<unknown>
): Promise<(props: CommandContext) => RenderInput> {
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw new CliError(
      'shell.tsx must default-export a function that returns Shell.* components'
    );
  }
  return declare as (props: CommandContext) => RenderInput;
}

/** スコープ付きの名前 (`@scope/name`) からスコープを落とす */
export function binaryName(program: string): string {
  const segments = program.split('/');
  return segments[segments.length - 1] as string;
}

/**
 * シェルコードに埋め込んでよいコマンド名。
 *
 * 名前は補完シム (ADR 21) とシェル関数 (ADR 35) に**そのまま**書かれ、
 * rc ファイルから source / eval される。`$(...)` や `;` を含む名前を通すと、
 * package.json の `bin` を書いた人のコードが、補完を入れた人のシェルで
 * 走る。クォートで逃げずに形で断るのは、名前が関数名 (`name() {`) にも
 * なるからで、そこはクォートできない。先頭の `-` はオプションに化け、
 * 先頭の `.` は補完ファイル (`_<name>`) を別の名前にする
 */
const COMMAND_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

/** {@link assertCommandName} が通す名前か */
export function isCommandName(name: string): boolean {
  return COMMAND_NAME.test(name);
}

/**
 * シェルコードに埋め込む前に名前を確かめる。
 *
 * @param source 名前の出どころ (エラーの文面に使う)
 * @throws DeclarationError 使えない名前のとき。名前は JSON の形で引用する
 *   (制御文字を端末にそのまま出さない)
 */
export function assertCommandName(name: string, source = 'command name'): void {
  if (isCommandName(name)) return;
  throw new DeclarationError(
    `${source} ${JSON.stringify(name)} cannot be used in shell code. ` +
      'Use only letters, digits, ".", "_" and "-", and do not start with "-" or "."'
  );
}

/** シェル関数が「ここに書いて」と渡す環境変数 */
export const SHELL_FILE_ENV = 'DECOPIN_SHELL_FILE';

/** シェル関数を出せる相手 */
export const SHELLS = ['zsh', 'bash'] as const;
/** `__shell` に渡せるシェルの名前 */
export type ShellName = (typeof SHELLS)[number];

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * POSIX の単一クォート。中の単一クォートは、閉じて・エスケープして・開き直す。
 * クォート文字を直書きすると ADR 14 の検査器 (文字列の状態機械) が壊れるので
 * エスケープで書く
 */
const SQ = '\u0027';
export function quote(value: string): string {
  return SQ + value.split(SQ).join(`${SQ}\\${SQ}${SQ}`) + SQ;
}

function text(props: Record<string, unknown>, key: string, where: string) {
  const value = props[key];
  if (typeof value !== 'string') {
    throw new DeclarationError(`<${where}> needs a string "${key}"`);
  }
  return value;
}

function identifier(props: Record<string, unknown>, where: string) {
  const name = text(props, 'name', where);
  if (!IDENTIFIER.test(name)) {
    throw new DeclarationError(
      `<${where}> name "${name}" is not a valid shell identifier`
    );
  }
  return name;
}

/** 宣言の並びを、行ごとのシェルコードにする */
export function renderShell(nodes: readonly HostNode[]): string {
  const lines: string[] = [];
  for (const node of nodes) {
    switch (node.kind) {
      case 'shell.cd':
        lines.push(`cd ${quote(text(node.props, 'to', node.displayName))}`);
        break;
      case 'shell.export':
        lines.push(
          `export ${identifier(node.props, node.displayName)}=${quote(text(node.props, 'value', node.displayName))}`
        );
        break;
      case 'shell.unset':
        lines.push(`unset ${identifier(node.props, node.displayName)}`);
        break;
      case 'shell.alias':
        lines.push(
          `alias ${identifier(node.props, node.displayName)}=${quote(text(node.props, 'command', node.displayName))}`
        );
        break;
      case 'shell.source':
        lines.push(
          `source ${quote(text(node.props, 'file', node.displayName))}`
        );
        break;
      case 'shell.raw':
        lines.push(text(node.props, 'code', node.displayName));
        break;
      default:
        throw new DeclarationError(
          `<${node.displayName}> cannot be used in shell.tsx. Use Shell.* components`
        );
    }
  }
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`;
}

/** シェル関数の名前に使えない文字を潰す */
function safe(bin: string): string {
  return bin.replace(/[^A-Za-z0-9_]/g, '_');
}

/**
 * `.zshrc` / `.bashrc` で `eval "$(<bin> __shell zsh)"` して使う関数。
 *
 * 同名の関数で CLI を包み、`command <bin>` で本体を呼ぶ。本体が
 * {@link SHELL_FILE_ENV} のファイルに何か書いていれば source する。
 * stdout / stderr はそのまま通すので、パイプやリダイレクトは壊れない
 *
 * @throws DeclarationError `bin` がシェルコードに埋め込めない名前のとき
 */
export function generateShellHook(bin: string, shell: ShellName): string {
  assertCommandName(bin);
  const tmp = `__decopin_${safe(bin)}_out`;
  const code = `__decopin_${safe(bin)}_code`;
  return `# Generated by ${bin} __shell ${shell}. Add to your rc file:
#   eval "$(${bin} __shell ${shell})"
${bin}() {
  local ${tmp} ${code}
  ${tmp}="$(mktemp)" || return 1
  ${SHELL_FILE_ENV}="$${tmp}" command ${bin} "$@"
  ${code}=$?
  if [ -s "$${tmp}" ]; then
    . "$${tmp}"
  fi
  rm -f "$${tmp}"
  return $${code}
}
`;
}

export function isShellName(value: string): value is ShellName {
  return (SHELLS as readonly string[]).includes(value);
}
