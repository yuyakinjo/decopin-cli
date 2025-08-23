# 設計文書

## 概要

現在のdecopin-cliの`src/`ディレクトリ構造をハンドラー中心のアーキテクチャに再編成します。現在は機能が混在した構造になっていますが、これを8つのコアハンドラーごとに明確に分離し、共通ユーティリティを集約することで、保守性と可読性を向上させます。

## アーキテクチャ

### 現在の構造の問題点

1. **ハンドラーディレクトリが空**: `src/handlers/`配下のディレクトリは存在するが、実際のハンドラーロジックは他の場所に散在
2. **責務の混在**: `src/core/`にハンドラー実行ロジックとスキャナーロジックが混在
3. **共通ユーティリティの分散**: バリデーション、タイプガード、その他のユーティリティが複数の場所に分散
4. **型定義の集約**: すべての型が`src/types/`に集約されているが、ハンドラー固有の型も含まれている

### 新しい構造の設計

```
src/
├── handlers/                    # ハンドラー中心の構造
│   ├── command/                 # コマンドハンドラー
│   │   ├── index.ts            # メインハンドラーロジック
│   │   ├── types.ts            # コマンド固有の型定義
│   │   ├── parser.ts           # コマンドパーサー
│   │   └── generator.ts        # コマンドジェネレーター
│   ├── params/                  # パラメータハンドラー
│   │   ├── index.ts            # パラメータ処理ロジック
│   │   ├── types.ts            # パラメータ固有の型定義
│   │   └── validation.ts       # パラメータバリデーション
│   ├── help/                    # ヘルプハンドラー
│   │   ├── index.ts            # ヘルプ生成ロジック
│   │   └── types.ts            # ヘルプ固有の型定義
│   ├── error/                   # エラーハンドラー
│   │   ├── index.ts            # エラー処理ロジック
│   │   └── types.ts            # エラー固有の型定義
│   ├── middleware/              # ミドルウェアハンドラー
│   │   ├── index.ts            # ミドルウェア処理ロジック
│   │   └── types.ts            # ミドルウェア固有の型定義
│   ├── env/                     # 環境変数ハンドラー
│   │   ├── index.ts            # 環境変数処理ロジック
│   │   └── types.ts            # 環境変数固有の型定義
│   ├── version/                 # バージョンハンドラー
│   │   ├── index.ts            # バージョン処理ロジック
│   │   └── types.ts            # バージョン固有の型定義
│   └── global-error/            # グローバルエラーハンドラー
│       ├── index.ts            # グローバルエラー処理ロジック
│       └── types.ts            # グローバルエラー固有の型定義
├── core/                        # コアシステム（変更なし）
│   ├── scanner.ts              # ディレクトリスキャナー
│   ├── handler-executor.ts     # ハンドラー実行エンジン
│   ├── optimized-scanner.ts    # 最適化されたスキャナー
│   ├── optimized-handler-executor.ts # 最適化された実行エンジン
│   ├── performance.ts          # パフォーマンス監視
│   └── types.ts                # コア固有の型定義
├── generator/                   # コード生成（変更なし）
│   ├── env-types-generator.ts  # 環境変数型生成
│   ├── lazy-cli-template.ts    # 遅延読み込みCLIテンプレート
│   └── middleware-template.ts  # ミドルウェアテンプレート
├── utils/                       # 共通ユーティリティ（拡張）
│   ├── validation/              # バリデーション関連
│   │   ├── index.ts            # バリデーション統合エクスポート
│   │   ├── valibot.ts          # valibotバリデーション
│   │   ├── manual.ts           # マニュアルバリデーション
│   │   └── env.ts              # 環境変数バリデーション
│   ├── guards/                  # タイプガード（internal/guardsから移動）
│   │   ├── index.ts            # タイプガード統合エクスポート
│   │   ├── ast.ts              # AST関連タイプガード
│   │   └── validation.ts       # バリデーション関連タイプガード
│   ├── errors/                  # エラー処理ユーティリティ
│   │   ├── index.ts            # エラー処理統合エクスポート
│   │   └── formatting.ts       # エラーフォーマット
│   └── common/                  # その他の共通ユーティリティ
│       └── index.ts            # 共通ヘルパー関数
├── types/                       # 共通型定義（縮小）
│   ├── index.ts                # 統合エクスポート
│   ├── context.ts              # コンテキスト型
│   ├── handler-registry.ts     # ハンドラーレジストリ型
│   └── common.ts               # 共通型定義
├── cli.ts                       # CLIエントリーポイント（変更なし）
└── index.ts                     # ライブラリエントリーポイント（変更なし）
```

## コンポーネントと インターフェース

### ハンドラーコンポーネント

各ハンドラーは以下の統一されたインターフェースを持ちます：

```typescript
// handlers/{handler-name}/index.ts
export interface HandlerInterface<TInput, TOutput> {
  process(input: TInput): Promise<TOutput> | TOutput;
}

// handlers/{handler-name}/types.ts
export interface HandlerSpecificTypes {
  // ハンドラー固有の型定義
}
```

### ユーティリティコンポーネント

```typescript
// utils/validation/index.ts
export interface ValidationUtilities {
  createValidationFunction: (definition: ParamsHandler) => ValidationFunction;
  parseEnvironmentVariables: (schema: EnvSchema) => EnvValidationResult;
  // その他のバリデーション関数
}

// utils/guards/index.ts
export interface TypeGuards {
  isString: (value: unknown) => value is string;
  isBoolean: (value: unknown) => value is boolean;
  // その他のタイプガード
}
```

## データモデル

### ハンドラーレジストリ

現在の`src/types/handler-registry.ts`は維持し、各ハンドラーの定義と実行順序を管理します。

### ファイル移動マッピング

```typescript
// 移動対象ファイルのマッピング
const FILE_MIGRATIONS = {
  // コマンドハンドラー
  'src/command/index.ts': 'src/handlers/command/index.ts',
  'src/command/parser.ts': 'src/handlers/command/parser.ts',
  'src/command/generator.ts': 'src/handlers/command/generator.ts',
  'src/command/types.ts': 'src/handlers/command/types.ts',

  // バリデーション
  'src/utils/validation.ts': 'src/utils/validation/index.ts',

  // タイプガード
  'src/internal/guards/index.ts': 'src/utils/guards/index.ts',
  'src/internal/guards/ast.ts': 'src/utils/guards/ast.ts',
  'src/internal/guards/validation.ts': 'src/utils/guards/validation.ts',

  // 型定義の分散
  // 各ハンドラー固有の型は対応するhandlers/{name}/types.tsに移動
} as const;
```

## エラーハンドリング

### エラー処理の統合

現在分散しているエラー処理ロジックを`utils/errors/`に集約：

```typescript
// utils/errors/index.ts
export interface ErrorUtilities {
  formatError: (error: unknown) => string;
  isValidationError: (error: unknown) => error is ValidationError;
  createValidationError: (issues: ValidationIssue[]) => ValidationError;
}
```

### ハンドラー固有エラー

各ハンドラーで発生する可能性のあるエラーは、対応するハンドラーディレクトリで管理：

```typescript
// handlers/command/types.ts
export interface CommandError extends Error {
  commandName: string;
  phase: 'parsing' | 'generation' | 'execution';
}
```

## テスト戦略

### テスト構造の更新

現在の`test/`ディレクトリ構造も新しいハンドラー構造に合わせて更新：

```
test/
├── handlers/                    # ハンドラーテスト
│   ├── command/                 # コマンドハンドラーテスト
│   ├── params/                  # パラメータハンドラーテスト
│   └── ...                      # その他のハンドラーテスト
├── utils/                       # ユーティリティテスト
│   ├── validation/              # バリデーションテスト
│   ├── guards/                  # タイプガードテスト
│   └── errors/                  # エラー処理テスト
├── core/                        # コアシステムテスト（変更なし）
├── integration/                 # 統合テスト（変更なし）
└── ...
```

### テストファイルの移動

```typescript
// テストファイルの移動マッピング
const TEST_MIGRATIONS = {
  'test/utils/validation.test.ts': 'test/utils/validation/index.test.ts',
  'test/internal/guards/': 'test/utils/guards/',
  // 新しいハンドラーテストファイルを作成
} as const;
```

## 実装フェーズ

### フェーズ1: ユーティリティの再編成

1. `utils/validation/`ディレクトリの作成と既存バリデーションロジックの移動
2. `utils/guards/`ディレクトリの作成と`internal/guards`からの移動
3. `utils/errors/`ディレクトリの作成とエラー処理ロジックの集約

### フェーズ2: ハンドラーの実装

1. 各ハンドラーディレクトリに`index.ts`と`types.ts`を作成
2. 既存のハンドラーロジックを対応するディレクトリに移動
3. ハンドラー固有の型定義を分離

### フェーズ3: インポートの更新

1. すべてのインポート文を新しい構造に合わせて更新
2. `src/types/index.ts`から不要な型エクスポートを削除
3. 各ハンドラーの統合エクスポートを設定

### フェーズ4: テストの更新

1. テストファイルを新しい構造に合わせて移動
2. テストのインポート文を更新
3. 新しいハンドラー構造に対応したテストを追加

## 互換性の保証

### パブリックAPIの維持

`src/index.ts`のエクスポートは変更せず、内部構造の変更がライブラリ利用者に影響しないようにします：

```typescript
// src/index.ts - パブリックAPIは維持
export { buildCLI, buildWithDefaults, listCommands } from './core/builder.js';
export type { CommandContext, CommandHandler } from './types/index.js';
// 内部実装は新しい構造を使用
```

### 段階的移行

既存のインポートパスを段階的に更新し、一時的に両方のパスをサポートする移行期間を設けます：

```typescript
// 移行期間中の互換性エクスポート
export { default as validation } from './utils/validation/index.js';
// 旧パス（非推奨警告付き）
export { default as validation } from './utils/validation.js'; // @deprecated
```
