# Handler Files

| 実行順序 | ファイル名 | 必須/オプション | 説明 | Handler名 | Context名 |
|:---:|:---|:---:|:---|:---|:---|
| all | `global-error.ts` | optional | すべてのエラーをキャッチ | `GlobalErrorHandler` | `GlobalErrorContext` |
| 1 | `env.ts` | optional | 環境変数を型安全 & Contextに注入 | `EnvHandler` | `EnvContext` |
| 2 | `version.ts` | optional | バージョン情報 & Contextに注入 | `VersionHandler` | `VersionContext` |
| 3 | `middleware.ts` | optional | ミドルウェア処理 & Contextに注入 | `MiddlewareHandler` | `MiddlewareContext` |
| 4 | `help.ts` | optional | ヘルプメッセージ & Contextに注入 | `HelpHandler` | `HelpContext` |
| 5 | `params.ts` | optional | パラメータ定義 & Contextに注入 | `ParamsHandler` | `ParamsContext` |
| 6 | `command.ts` | **required** | コマンド実装 & Contextに注入 | `CommandHandler` | `CommandContext` |
| 7 | `error.ts` | optional | エラー処理 & Contextに注入 | `ErrorHandler` | `ErrorContext` |

# 調査結果

## 実際の実装状況

### 現在サポートされているハンドラー

コードベースを調査した結果、以下のハンドラーが実際にサポートされています：

| ファイル名 | 実装状況 | スキャナーサポート | 型定義 | 備考 |
|:---|:---:|:---:|:---:|:---|
| `global-error.ts` | ✅ 実装済み | ✅ あり | ✅ `GlobalErrorHandler` | `src/core/scanner.ts`で検出、ルートディレクトリのみ |
| `middleware.ts` | ✅ 実装済み | ✅ あり | ✅ `MiddlewareHandler` | `src/core/scanner.ts`で検出、ルートディレクトリのみ |
| `command.ts` | ✅ 実装済み | ✅ あり | ✅ `CommandHandler` | 各コマンドディレクトリで検出 |
| `params.ts` | ✅ 実装済み | ✅ あり | ✅ `ParamsHandler` | 各コマンドディレクトリで検出 |
| `help.ts` | ✅ 実装済み | ✅ あり | ✅ `HelpHandler` | 各コマンドディレクトリで検出 |
| `error.ts` | ✅ 実装済み | ✅ あり | ✅ `ErrorHandler` | 各コマンドディレクトリで検出 |
| `env.ts` | ✅ 実装済み | ✅ あり | ✅ `EnvHandler` | スキャナーサポート追加済み、検証は未実装 |
| `version.ts` | ✅ 実装済み | ✅ あり | ✅ `VersionHandler` | `--version`オプションで動作確認済み |

### 詳細な調査結果

1. **スキャナー (`src/core/scanner.ts`)**
   - `global-error.ts`、`middleware.ts`、`env.ts`、`version.ts`はルートディレクトリでのみスキャン
   - `command.ts`、`params.ts`、`help.ts`、`error.ts`は各ディレクトリで再帰的にスキャン
   - すべてのハンドラータイプがスキャナーでサポート済み

2. **型定義 (`src/types/`)**
   - `EnvHandler`型は`src/types/validation.ts`に定義済み
   - `VersionHandler`型を`src/types/validation.ts`に追加済み
   - すべてのハンドラー型が適切に定義されている

3. **ジェネレーター (`src/generator/lazy-cli-template.ts`)**
   - `env.ts`のサポートを追加（現在は読み込みのみ、検証は未実装）
   - `version.ts`の動的読み込みを実装済み（`--version`で正常動作）
   - 環境変数の型安全な検証は今後の実装課題

4. **実行時の処理**
   - コンテキストオブジェクトには常に`env: process.env`が含まれる
   - `env.ts`で定義した型や検証は適用されない

### 実装後の状況

本調査後、以下の改善を実施しました：

1. **`env.ts`のサポート** ✅
   - スキャナーに`env.ts`の検出機能を追加済み
   - ジェネレーターでの読み込み処理を実装
   - 環境変数のバリデーション機能は今後の課題

2. **`version.ts`のサポート** ✅
   - `VersionHandler`型を定義済み
   - スキャナーに`version.ts`の検出機能を追加済み
   - `--version`オプションで正常に動作することを確認

3. **統一的なハンドラー管理システム** ✅ 完了
   - **ハンドラーレジストリ** (`src/types/handler-registry.ts`)
     - すべてのハンドラー定義を一元管理
     - 実行順序を明示的に定義
     - 依存関係の検証機能
   - **HandlerExecutor** (`src/core/handler-executor.ts`)
     - レジストリベースのハンドラー実行
     - 実行順序の自動管理
     - コンテキストの累積的構築
   - **統合されたスキャナー**
     - 統一的なハンドラー検出
     - 後方互換性の維持
   - **改善されたジェネレーター**
     - 統一的なハンドラー実行コード生成
     - 実行順序の遵守
     - 効率的な動的インポート

4. **今後の課題**
   - 環境変数の実行時バリデーション実装
   - より高度なハンドラー間通信の仕組み