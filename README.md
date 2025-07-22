# decopin-cli

[![Test](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml)
[![Integration Tests](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml)
[![Build Check](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml)
[![Lint](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml)

A TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system. Create powerful command-line interfaces with zero configuration using familiar file-based conventions and pre-validated, type-safe command contexts.

## ✨ Features

- **📁 File-based routing**: Commands defined in `app/` directory with intuitive folder structure
- **🔧 TypeScript-first**: Full TypeScript support with proper type definitions
- **⚡ Pre-validated data**: Commands receive type-safe, pre-validated data from `params.ts`
- **🔍 AST parsing**: TypeScript AST parsing for automatic command metadata extraction
- **🛡️ Integrated validation**: Built-in validation with valibot, no separate `validate.ts` needed
- **🎯 Function-based commands**: Clean function-based command definitions with dependency injection
- **🔄 Real-time development**: Changes reflect instantly with mise watch tasks
- **📦 Zero configuration**: Works out of the box with sensible defaults
- **⚡ Dynamic imports**: Generated CLIs use dynamic imports for instant command loading

## 🚀 Quick Start

### Installation

```bash
npm i -D decopin-cli
```

### Create your first CLI

1. **Initialize project structure**:
```bash
mkdir my-cli && cd my-cli
npm init -y
npm install decopin-cli valibot
```

2. **Create app directory and your first command**:
```bash
mkdir -p app/hello
```

3. **Create `app/hello/command.ts`**:

```typescript
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';
import type { HelloData } from './params.js';

export default function createCommand(context: CommandContext<HelloData>): CommandDefinition<HelloData> {
  // バリデーション済みのデータを使用
  const { name } = context.validatedData;

  return {
    handler: async () => {
      console.log(`Hello, ${name}!!!`);
    },
  };
}
```

4. **Create `app/hello/params.ts` for type-safe argument validation**:

```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from 'decopin-cli';

// Hello コマンドのデータスキーマ
const HelloSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name cannot be empty')),
});

export type HelloData = v.InferInput<typeof HelloSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schema: HelloSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
        defaultValue: 'World',
      },
    ],
  };
}
```

5. **Generate your CLI**:

```bash
npx decopin-cli build
```

6. **Test your CLI**:

```bash
node dist/cli.js hello Alice
# Output: Hello, Alice!

node dist/cli.js hello --name Bob
# Output: Hello, Bob!
```

## 🏗️ Architecture

### Function-Based Command Pattern

```
app/
├── version.ts              # バージョン設定
├── hello/                  # シンプルなhelloコマンド
│   ├── command.ts
│   ├── params.ts
│   └── help.ts
├── user/                   # ネストされたuserコマンド群
│   ├── create/             # user create - ユーザー作成
│   │   ├── command.ts
│   │   ├── params.ts
│   │   ├── help.ts
│   │   └── error.ts
│   └── list/               # user list - ユーザー一覧
│       ├── command.ts
│       └── help.ts
└── test/                   # テスト用コマンド群
    ├── basic/              # 基本テストコマンド
    │   └── command.ts
    ├── validation/         # バリデーションテストコマンド
    │   ├── command.ts
    │   └── params.ts
    └── custom-error/       # カスタムエラーテストコマンド
        ├── command.ts
        ├── params.ts
        └── error.ts
```

## 🛠️ コマンド構造の詳細

### パラメータ付きコマンド（Hello コマンド）

**app/hello/params.ts**:
```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from '../../dist/types/command.js';

// Hello コマンドのデータスキーマ
const HelloSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name cannot be empty')),
});

export type HelloData = v.InferInput<typeof HelloSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schema: HelloSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
        defaultValue: 'World',
      },
    ],
  };
}
```

**app/hello/command.ts**:
```typescript
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';
import type { HelloData } from './params.js';

export default function createCommand(context: CommandContext<HelloData>): CommandDefinition<HelloData> {
  // バリデーション済みのデータを使用
  const { name } = context.validatedData;

  return {
    handler: async () => {
      console.log(`Hello, ${name}!!!`);
    },
  };
}
```

### 複雑なパラメータのコマンド（User Create）

**app/user/create/params.ts**:
```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from '../../../dist/types/command.js';

// ユーザー作成データのスキーマ
const CreateUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email format')),
});

export type CreateUserData = v.InferInput<typeof CreateUserSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schema: CreateUserSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
      },
      {
        field: 'email',
        option: 'email',
        argIndex: 1,
      },
    ],
  };
}
```

**app/user/create/command.ts**:
```typescript
import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';
import type { CreateUserData } from './params.js';

export default function createCommand(context: CommandContext<CreateUserData>): CommandDefinition<CreateUserData> {
  // バリデーション済みのデータを使用
  const { name, email } = context.validatedData!;

  return {
    handler: async () => {
      console.log(`🔄 Creating user: ${name} (${email})`);

      // 実際の処理をここに実装
      // 例: await createUser({ name, email });

      console.log('✅ User created successfully!');
    }
  };
}
```

### パラメータなしのコマンド（User List）

**app/user/list/command.ts**:
```typescript
import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';

export default function createCommand(context: CommandContext): CommandDefinition {
  return {
    handler: async (context: CommandContext) => {
      const limit = Number(context.options.limit) || 10;

      console.log('📋 User List:');
      for (let i = 1; i <= limit; i++) {
        console.log(`  ${i}. User ${i} (user${i}@example.com)`);
      }
      console.log(`\n📊 Showing ${limit} users`);
    }
  };
}
```

## 🏗️ アーキテクチャ

### 関数ベースコマンドパターン

decopin-cliは事前検証されたコンテキストを受け取るコマンドがファンクションであるファクトリーパターンを使用します：

```typescript
// decopin-cli アプローチ（現在）
export default function createCommand(context: CommandContext<HelloData>): CommandDefinition<HelloData> {
  const { name } = context.validatedData!; // すでに検証済みで型付き！

  return {
    handler: async () => {
      console.log(`Hello, ${name}!!!`);
    },
  };
}
```

### 統合バリデーション

バリデーションは`params.ts`に統合されており、valibotスキーマを使用して型安全なパラメータ処理を提供します：

```text
app/hello/
├── params.ts    # ✅ 型 + valibotスキーマ + マッピング
└── command.ts   # ✅ コマンドロジック（検証済みデータを受け取る）
```

## 🎯 引数処理

decopin-cliは`params.ts`設定に基づいて引数バリデーションと型変換を自動的に処理します：

### 使用例

#### 位置引数

```bash
my-cli user create "John Doe" "john@example.com"
```

#### 名前付きオプション

```bash
my-cli user create --name "John Doe" --email "john@example.com"
```

#### 混合引数（位置が高い優先度）

```bash
my-cli user create "Jane" --email "jane@example.com"
# nameは "Jane"（位置0から）、--nameオプションからではない
```

## 🔧 バージョン設定

CLIメタデータを設定するため `app/version.ts` を作成：

```typescript
/**
 * CLI バージョン情報
 */
export const version = "2.1.3"

export const metadata = {
  name: "super-cli",
  version: "2.1.3",
  description: "The ultimate command line interface for developers",
  author: "TypeScript Ninja"
}

export default version
```

## 🔄 開発

### Miseでの自動再生成

開発用には、CLI自動再生成のための組み込みmise設定を使用：

```bash
# mise をインストール（まだインストールしていない場合）
curl https://mise.run | sh

# 自動再生成での開発モードを開始
npm run dev
```

これにより：
1. プロジェクトをビルド
2. `app/` ディレクトリの変更を監視
3. ファイル変更時に自動的にCLIを再生成
4. 手動リビルドなしでコマンドをホットリロード

### 手動ビルド

```bash
npm run build
npx decopin-cli build --app-dir app --output-dir examples
```

## 📋 CLIオプション

### ビルドコマンド

```bash
decopin-cli build [options]
```

**オプション:**

- `--output-dir <dir>`: 出力ディレクトリ（デフォルト: `dist`）
- `--output-file <file>`: 出力ファイル名（デフォルト: `cli.js`）
- `--app-dir <dir>`: appディレクトリパス（デフォルト: `app`）
- `--cli-name <n>`: 生成ファイル用CLI名
- `--output-filename <file>`: カスタム出力ファイル名

### ヘルプコマンド

```bash
decopin-cli --help
```

利用可能なコマンドとオプションを表示します。

### バージョンコマンド

```bash
decopin-cli --version
```

decopin-cliの現在バージョンを表示します。

## 🔍 高度な機能

### コマンドコンテキスト

パラメータ付きコマンドは事前検証されたデータを持つ`CommandContext<T>`を受け取ります：

```typescript
interface CommandContext<T = any> {
  validatedData?: T;        // params.tsからの事前検証済み型付きデータ
  rawArgs: string[];        // 元の生引数
  rawOptions: Record<string, any>; // 元の生オプション
}
```

### パラメータのないコマンド

パラメータが不要なコマンドの場合、単純に`params.ts`ファイルを省略：

```typescript
// app/status/command.ts
import type { CommandDefinition } from 'decopin-cli';

export default function createCommand(): CommandDefinition {
  return {
    metadata: {
      name: 'status',
      description: 'Show application status',
      examples: ['status']
    },
    handler: async () => {
      console.log('✅ Application is running');
    }
  };
}
```

### エラーハンドリング

```typescript
export default function createCommand(context: CommandContext<UserData>): CommandDefinition<UserData> {
  const { name, email } = context.validatedData!;

  return {
    metadata: {
      name: 'create',
      description: 'Create a new user'
    },
    handler: async () => {
      try {
        // コマンドロジックをここに
        await createUser(name, email);
        console.log('✅ User created successfully!');
      } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    }
  };
}
```

### 非同期コマンド

すべてのコマンドは非同期操作をサポート：

```typescript
export default function createCommand(context: CommandContext<ApiData>): CommandDefinition<ApiData> {
  const { endpoint } = context.validatedData!;

  return {
    metadata: {
      name: 'fetch',
      description: 'Fetch data from API'
    },
    handler: async () => {
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log(data);
    }
  };
}
```

## 📦 配布

### NPMパッケージ

CLIをnpmパッケージとして配布するには：

1. **package.jsonの設定**:
```json
{
  "name": "my-awesome-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-cli": "./examples/cli.js"
  },
  "files": [
    "examples/",
    "app/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "valibot": "^1.1.0"
  }
}
```

2. **ビルドと公開**:
```bash
npm run build && npm run build:app
npm publish
```

3. **グローバルインストール**:
```bash
npm install -g my-awesome-cli
my-cli hello
```

## 🧪 テスト

decopin-cliには包括的なテスト機能が含まれています。テストの実行：

```bash
npm test
```

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)を参照してください。

## 🙏 謝辞

- Next.js App Routerのファイルベースルーティングにインスパイア
- TypeScriptとモダンNode.js機能で構築
- 型安全バリデーション用valibotを採用

---

**decopin-cli** - Next.jsアプリを構築するようにCLIを構築しよう！ 🚀
