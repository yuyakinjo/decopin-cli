/**
 * `decopin init`: 新しいプロジェクトの雛形を作る。
 *
 * README の Setup をそのまま手で再現するのは項目が多く、tsconfig を 1 つ
 * 間違えると "Could not resolve: react/jsx-runtime" のような遠いエラーになる。
 * 正しい設定と、動くことが分かっている最小の hello コマンドを置いて、
 * `bun run build` まで一直線に進めるようにする。
 *
 * 既にあるファイルは上書きしない。init を途中で止めても、既存プロジェクトで
 * 打ってしまっても、消えるものが無いように
 */
import { mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

export interface InitOptions {
  /** 雛形を置くディレクトリ (default: カレント) */
  dir?: string;
  /** `bun add decopin-cli` と `bun add -d @types/bun` を実行するか (default: true) */
  install?: boolean;
}

export interface InitResult {
  /** 雛形を置いた場所 (絶対パス) */
  dir: string;
  /** 新しく書いたファイル (dir からの相対パス) */
  created: string[];
  /** 既にあったので触らなかったファイル (dir からの相対パス) */
  skipped: string[];
  /** 依存の追加まで成功したか */
  installed: boolean;
}

/** package.json の name に使える形に丸める */
function packageName(dir: string): string {
  const name = basename(dir)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
  return name === '' ? 'my-cli' : name;
}

/** 生成するファイル。README の Setup / Quick start と同じ内容を保つ */
export function templates(name: string): Record<string, string> {
  const packageJson = {
    name,
    version: '0.0.0',
    type: 'module',
    private: true,
    bin: { [name]: './dist/index.js' },
    scripts: {
      build: 'decopin build',
      dev: 'decopin dev --annotate',
    },
  };
  const tsconfig = {
    compilerOptions: {
      target: 'esnext',
      module: 'esnext',
      moduleResolution: 'bundler',
      types: ['bun'],
      strict: true,
      skipLibCheck: true,
      verbatimModuleSyntax: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      jsx: 'react-jsx',
      jsxImportSource: 'decopin-cli/jsx',
    },
    include: ['app/**/*', '.decopin/types.d.ts'],
  };
  return {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'tsconfig.json': `${JSON.stringify(tsconfig, null, 2)}\n`,
    '.gitignore': ['node_modules/', 'dist/', '.decopin/', ''].join('\n'),
    'app/hello/argv.tsx': `import { Arg, Argv } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Greet someone.">
      <Arg
        name="name"
        type="string"
        default="world"
        description="who to greet"
      />
    </Argv>
  );
}
`,
    'app/hello/cmd.tsx': `import { Line, Text, type CmdProps } from 'decopin-cli';

export default function Command({ args }: CmdProps<'hello'>) {
  return (
    <Line>
      <Text bold color="green">
        hello, {args.name}
      </Text>
    </Line>
  );
}
`,
  };
}

/** 依存を張る。Bun の型は tsconfig の `types: ["bun"]` が要求する */
const INSTALL_STEPS = [
  ['bun', 'add', 'decopin-cli'],
  ['bun', 'add', '-d', '@types/bun'],
];

/** `bun add decopin-cli` と `bun add -d @types/bun` を dir で実行する */
export async function installDependencies(dir: string): Promise<boolean> {
  for (const cmd of INSTALL_STEPS) {
    const proc = Bun.spawn(cmd, {
      cwd: dir,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    if ((await proc.exited) !== 0) return false;
  }
  return true;
}

export async function init(options: InitOptions = {}): Promise<InitResult> {
  const dir = resolve(options.dir ?? '.');
  const created: string[] = [];
  const skipped: string[] = [];

  await mkdir(dir, { recursive: true });
  for (const [path, content] of Object.entries(templates(packageName(dir)))) {
    const target = join(dir, path);
    if (await Bun.file(target).exists()) {
      skipped.push(path);
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, content);
    created.push(path);
  }

  const installed =
    options.install === false ? false : await installDependencies(dir);
  return { dir, created, skipped, installed };
}
