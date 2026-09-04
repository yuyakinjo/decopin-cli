/**
 * `decopin dev --annotate` は型注釈の無い cmd.tsx の props に
 * `CommandProps<'<name>'>` を書き足す (ADR 44)。
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  annotateCommandSource,
  annotateCommands,
} from '../../src/core/build/annotate.ts';
import { generate } from '../../src/core/build/index.ts';

describe('annotateCommandSource', () => {
  test('props に注釈を足し、import も足す', () => {
    const source = [
      "import { Line } from 'decopin-cli';",
      '',
      'export default function Command(props) {',
      '  return <Line>{props.args.name}</Line>;',
      '}',
      '',
    ].join('\n');
    expect(annotateCommandSource(source, 'hello')).toBe(
      [
        "import { Line, type CommandProps } from 'decopin-cli';",
        '',
        "export default function Command(props: CommandProps<'hello'>) {",
        '  return <Line>{props.args.name}</Line>;',
        '}',
        '',
      ].join('\n')
    );
  });

  test('分割代入は閉じ括弧の直後に入れる (中の `:` は注釈ではない)', () => {
    const source =
      "import { Line } from 'decopin-cli';\n" +
      'export default function Command({ args, options: { loud } }) {\n' +
      '  return null;\n}\n';
    expect(annotateCommandSource(source, 'user/import')).toContain(
      "function Command({ args, options: { loud } }: CommandProps<'user/import'>) {"
    );
  });

  test('async と無名の default export も対象', () => {
    expect(
      annotateCommandSource(
        'export default async function (props) {\n  return null;\n}\n',
        'deploy'
      )
    ).toBe(
      "import { type CommandProps } from 'decopin-cli';\n" +
        "export default async function (props: CommandProps<'deploy'>) {\n" +
        '  return null;\n}\n'
    );
  });

  test('async と function の間に改行があれば別の文なので対象外', () => {
    const source =
      'const async = (value: number) => value;\n' +
      'export default async\n' +
      'function Command(props) {}\n';
    expect(annotateCommandSource(source, 'hello')).toBeUndefined();

    const lineSeparator =
      'const async = (value: number) => value;\n' +
      'export default async/*\u2028*/function Command(props) {}\n';
    expect(annotateCommandSource(lineSeparator, 'hello')).toBeUndefined();
  });

  test('既に注釈があれば触らない (生成型でも手書きでも)', () => {
    expect(
      annotateCommandSource(
        "import { type CommandProps } from 'decopin-cli';\n" +
          "export default function Command(props: CommandProps<'hello'>) {}\n",
        'hello'
      )
    ).toBeUndefined();
    expect(
      annotateCommandSource(
        'interface Props { options: { limit: number } }\n' +
          'export default function Command({ options }: Props) {}\n',
        'user/list'
      )
    ).toBeUndefined();
    expect(
      annotateCommandSource(
        'export default function Command(props = {}) {}\n',
        'hello'
      )
    ).toBeUndefined();
  });

  test('引数を取らないものと default export が関数でないものは対象外', () => {
    expect(
      annotateCommandSource('export default function Command() {}\n', 'hello')
    ).toBeUndefined();
    expect(
      annotateCommandSource(
        'const Command = (props) => null;\nexport default Command;\n',
        'hello'
      )
    ).toBeUndefined();
  });

  test('import の形に合わせる: 複数行 / type-only / ダブルクォート', () => {
    const multiline =
      "import {\n  Line,\n  Text,\n} from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    expect(annotateCommandSource(multiline, 'hello')).toContain(
      "import {\n  Line,\n  Text,\n  type CommandProps,\n} from 'decopin-cli';"
    );

    const typeOnly =
      "import type { Line } from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    expect(annotateCommandSource(typeOnly, 'hello')).toContain(
      "import type { Line, CommandProps } from 'decopin-cli';"
    );

    const doubleQuoted =
      'import { Line } from "decopin-cli";\n' +
      'export default function Command(props) {}\n';
    const annotated = annotateCommandSource(doubleQuoted, 'hello');
    expect(annotated).toContain(
      'import { Line, type CommandProps } from "decopin-cli";'
    );
    expect(annotated).toContain('CommandProps<"hello">');
  });

  test('CommandProps を既に import していれば import は増やさない', () => {
    const source =
      "import { Line, type CommandProps } from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    const annotated = annotateCommandSource(source, 'hello');
    expect(annotated?.match(/CommandProps/g)).toHaveLength(2);
  });

  test('コメント・文字列・template・正規表現中の偽 default export は無視する', () => {
    const source = [
      '// export default function Commented(props) {}',
      'const text = "export default function Quoted(props) {}";',
      'const template = `export default function Templated(props) {}`;',
      'const pattern = /export default function Matched(props)/;',
      'export default function Command(props) {}',
      '',
    ].join('\n');
    const annotated = annotateCommandSource(source, 'hello');
    expect(annotated).toContain(
      "export default function Command(props: CommandProps<'hello'>) {}"
    );
    expect(annotated).toContain(
      '// export default function Commented(props) {}'
    );
    expect(
      annotateCommandSource(
        '// export default function Commented(props) {}\n',
        'hello'
      )
    ).toBeUndefined();
  });

  test('nested template と JSX text の偽 default export は無視する', () => {
    const nested =
      'const text = `outer ${/}/.test("}") ? `\n' +
      'export default function Fake(props)\n' +
      '` : ""}`;\n' +
      'export default function Command(props) {}\n';
    const nestedResult = annotateCommandSource(nested, 'hello');
    expect(nestedResult).toContain(
      'export default function Fake(props)\n' +
        '` : ""}`;\n' +
        "export default function Command(props: CommandProps<'hello'>) {}"
    );

    const jsx =
      'const example = <Text>\n' +
      '  export default function Fake(props)\n' +
      '</Text>;\n' +
      'export default function Command(props) {}\n';
    const jsxResult = annotateCommandSource(jsx, 'hello');
    expect(jsxResult).toContain(
      '  export default function Fake(props)\n' +
        '</Text>;\n' +
        "export default function Command(props: CommandProps<'hello'>) {}"
    );

    const exportedElsewhere =
      'function Command(props) {}\n' +
      'const example = <Text>\n' +
      '  export default function Fake(props)\n' +
      '</Text>;\n' +
      'export { Command as default };\n';
    expect(annotateCommandSource(exportedElsewhere, 'hello')).toBeUndefined();

    const probeCollision =
      'const marker = 1;\n' +
      'export { marker as "__decopin_annotate_candidate__" };\n' +
      'const example = <Text>\n' +
      '  export default function Fake(props)\n' +
      '</Text>;\n' +
      'const Command = () => null;\n' +
      'export default Command;\n';
    expect(annotateCommandSource(probeCollision, 'hello')).toBeUndefined();
  });

  test('引数内の文字列の括弧を数えず、末尾コメントの前に注釈を置く', () => {
    const destructured =
      'export default function Command({ value = ")" }) {}\n';
    expect(annotateCommandSource(destructured, 'hello')).toContain(
      `function Command({ value = ")" }: CommandProps<'hello'>) {}`
    );

    const commented =
      'export default function Command(props /* keep this */) {}\n';
    expect(annotateCommandSource(commented, 'hello')).toContain(
      `function Command(props: CommandProps<'hello'> /* keep this */) {}`
    );
  });

  test('route 名を文字列リテラルとして escape する', () => {
    const source =
      "import { Line } from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    const annotated = annotateCommandSource(source, "team/o'hare\\ops\nnext");
    expect(annotated).toContain("CommandProps<'team/o\\'hare\\\\ops\\nnext'>");
  });

  test('CommandProps の import alias をそのまま使い、空 import にも追加する', () => {
    const aliased =
      "import { type CommandProps as Props } from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    const aliasResult = annotateCommandSource(aliased, 'hello');
    expect(aliasResult).toContain("props: Props<'hello'>");
    expect(aliasResult?.match(/from 'decopin-cli'/g)).toHaveLength(1);

    const empty =
      "import {} from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    expect(annotateCommandSource(empty, 'hello')).toContain(
      "import { type CommandProps } from 'decopin-cli';"
    );
  });

  test('コメント中の同じ import は触らず、shebang より後ろに import を足す', () => {
    const withComment =
      "// import { Line } from 'decopin-cli';\n" +
      "import { Line } from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    expect(annotateCommandSource(withComment, 'hello')).toStartWith(
      "// import { Line } from 'decopin-cli';\n" +
        "import { Line, type CommandProps } from 'decopin-cli';\n"
    );

    const withShebang =
      '#!/usr/bin/env bun\n' + 'export default function Command(props) {}\n';
    expect(annotateCommandSource(withShebang, 'hello')).toStartWith(
      '#!/usr/bin/env bun\n' +
        "import { type CommandProps } from 'decopin-cli';\n"
    );

    const crShebang =
      '#!/usr/bin/env bun\r' + 'export default function Command(props) {}\r';
    const crResult = annotateCommandSource(crShebang, 'hello');
    expect(crResult).toStartWith(
      '#!/usr/bin/env bun\r' +
        "import { type CommandProps } from 'decopin-cli';\n"
    );
    expect(() =>
      new Bun.Transpiler({ loader: 'tsx' }).transformSync(crResult as string)
    ).not.toThrow();

    const commentedSpecifier =
      "import { Line // keep this\n} from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    expect(annotateCommandSource(commentedSpecifier, 'hello')).toStartWith(
      "import { type CommandProps } from 'decopin-cli';\n" +
        "import { Line // keep this\n} from 'decopin-cli';\n"
    );

    const jsxText =
      'const example = <Text>\n' +
      "  import { Line } from 'decopin-cli'\n" +
      '</Text>;\n' +
      'export default function Command(props) {}\n';
    const jsxResult = annotateCommandSource(jsxText, 'hello');
    expect(jsxResult).toStartWith(
      "import { type CommandProps } from 'decopin-cli';\n" +
        'const example = <Text>\n' +
        "  import { Line } from 'decopin-cli'\n"
    );
    expect(() =>
      new Bun.Transpiler({ loader: 'tsx' }).transformSync(jsxResult as string)
    ).not.toThrow();
  });

  test('既存のローカル CommandProps と衝突しない alias で import する', () => {
    const local =
      "import type { CommandProps } from './local';\n" +
      'export default function Command(props) {}\n';
    const localResult = annotateCommandSource(local, 'hello');
    expect(localResult).toStartWith(
      "import { type CommandProps as DecopinCommandProps } from 'decopin-cli';\n"
    );
    expect(localResult).toContain("props: DecopinCommandProps<'hello'>");

    const decopinAlias =
      "import { Line as CommandProps } from 'decopin-cli';\n" +
      'export default function Command(props) {}\n';
    const aliasResult = annotateCommandSource(decopinAlias, 'hello');
    expect(aliasResult).toContain(
      'Line as CommandProps, type CommandProps as DecopinCommandProps'
    );
    expect(aliasResult).toContain("props: DecopinCommandProps<'hello'>");
  });

  test('複数引数と rest parameter は安全に注釈できないので触らない', () => {
    expect(
      annotateCommandSource(
        'export default function Command(props, context) {}\n',
        'hello'
      )
    ).toBeUndefined();
    expect(
      annotateCommandSource(
        'export default function Command(...props) {}\n',
        'hello'
      )
    ).toBeUndefined();
  });
});

describe('annotateCommands / generate({ annotate })', () => {
  let workspace: string | undefined;
  let workDir: string | undefined;

  afterEach(async () => {
    if (workspace !== undefined)
      await rm(workspace, { recursive: true, force: true });
    if (workDir !== undefined)
      await rm(workDir, { recursive: true, force: true });
    workspace = workDir = undefined;
  });

  test('注釈の無い cmd.tsx だけを書き換え、2 回目は何もしない', async () => {
    workspace = await mkdtemp(join(tmpdir(), 'decopin-annotate-'));
    workDir = await mkdtemp(join(process.cwd(), '.decopin-test-annotate-'));
    const appDir = join(workspace, 'app');
    await mkdir(join(appDir, 'bare'), { recursive: true });
    await mkdir(join(appDir, 'typed'), { recursive: true });
    const bare = join(appDir, 'bare/cmd.tsx');
    const typed = join(appDir, 'typed/cmd.tsx');
    await writeFile(bare, 'export default function Command(props) {}\n');
    const typedSource =
      "import { type CommandProps } from 'decopin-cli';\n" +
      "export default function Command(props: CommandProps<'typed'>) {}\n";
    await writeFile(typed, typedSource);

    // 既定では触らない
    const plain = await generate({ appDir, workDir, program: 'cli' });
    expect(plain.annotated).toEqual([]);
    expect(await Bun.file(bare).text()).toBe(
      'export default function Command(props) {}\n'
    );

    const first = await generate({
      appDir,
      workDir,
      program: 'cli',
      annotate: true,
    });
    expect(first.annotated).toEqual([bare]);
    expect(await Bun.file(bare).text()).toBe(
      "import { type CommandProps } from 'decopin-cli';\n" +
        "export default function Command(props: CommandProps<'bare'>) {}\n"
    );
    expect(await Bun.file(typed).text()).toBe(typedSource);

    // watch が自分の書き換えで再実行しても、差分が無いので止まる
    expect(await annotateCommands(first.routes)).toEqual([]);
  });
});
