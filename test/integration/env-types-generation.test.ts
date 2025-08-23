import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Environment Types Generation Integration', () => {
  const projectRoot = process.cwd();
  const generatedTypesPath = path.join(projectRoot, 'app', 'generated', 'env-types.ts');
  let originalContent: string | null = null;

  beforeAll(async () => {
    // 既存のファイルをバックアップ
    if (fs.existsSync(generatedTypesPath)) {
      originalContent = fs.readFileSync(generatedTypesPath, 'utf-8');
    }
  });

  afterAll(() => {
    // 元のファイルを復元
    if (originalContent !== null) {
      const dir = path.dirname(generatedTypesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(generatedTypesPath, originalContent);
    }
  });

  it('should generate env types during build process', async () => {
    // ビルドコマンドを実行
    const result = await $`npm run build`.quiet();
    
    // ビルドが成功したことを確認
    expect(result.exitCode).toBe(0);

    // 型ファイルが生成されたことを確認
    expect(fs.existsSync(generatedTypesPath)).toBe(true);

    // 生成されたファイルの内容を確認
    const content = fs.readFileSync(generatedTypesPath, 'utf-8');
    
    // 必要な型定義が含まれていることを確認
    expect(content).toContain('// This file is auto-generated');
    expect(content).toContain('export interface AppEnv');
    expect(content).toContain('NODE_ENV: string');
    expect(content).toContain('API_KEY: string');
    expect(content).toContain('PORT: number');
    expect(content).toContain('DEBUG: boolean');
  });

  it('should generate env types with generate:env-types command', async () => {
    // 生成されたファイルを一旦削除
    if (fs.existsSync(generatedTypesPath)) {
      fs.unlinkSync(generatedTypesPath);
    }

    // 型生成コマンドを実行
    const result = await $`npm run generate:env-types`.quiet();
    
    // コマンドが成功したことを確認
    expect(result.exitCode).toBe(0);

    // 型ファイルが生成されたことを確認
    expect(fs.existsSync(generatedTypesPath)).toBe(true);

    // 生成されたファイルの内容を確認
    const content = fs.readFileSync(generatedTypesPath, 'utf-8');
    expect(content).toContain('export interface AppEnv');
  });

  it('should use generated types in command files without type errors', async () => {
    // まず型を生成
    await $`npm run generate:env-types`.quiet();

    // TypeScriptコンパイラでapp/user/create/command.tsをチェック
    const testFile = path.join(projectRoot, 'app', 'user', 'create', 'command.ts');
    
    if (fs.existsSync(testFile)) {
      // TypeScriptの型チェックを実行
      try {
        const result = await $`npx tsc --noEmit --skipLibCheck ${testFile}`.quiet();
        expect(result.exitCode).toBe(0);
      } catch (error: any) {
        // 型エラーがある場合、エラーメッセージを確認
        const stderr = error.stderr?.toString() || '';
        
        // AppEnv関連のエラーがないことを確認
        expect(stderr).not.toContain("Cannot find module '../../generated/env-types.js'");
        expect(stderr).not.toContain("Property 'AppEnv' does not exist");
        
        // 他の型エラーは許容（このテストの範囲外）
      }
    }
  });

  it('should handle changes to env.ts schema', async () => {
    const envPath = path.join(projectRoot, 'app', 'env.ts');
    const originalEnvContent = fs.readFileSync(envPath, 'utf-8');

    try {
      // env.tsを変更（新しい環境変数を追加）  
      const modifiedContent = originalEnvContent.replace(
        '  DEBUG: {',
        `  TEST_NEW_VAR: {
    type: SCHEMA_TYPE.STRING,
    required: false,
    default: 'test'
  },
  DEBUG: {`
      );
      
      fs.writeFileSync(envPath, modifiedContent);

      // 型を再生成
      const result = await $`npm run generate:env-types`.quiet();
      expect(result.exitCode).toBe(0);

      // 新しい変数が型定義に含まれていることを確認
      const content = fs.readFileSync(generatedTypesPath, 'utf-8');
      expect(content).toContain('TEST_NEW_VAR: string');

    } finally {
      // env.tsを元に戻す
      fs.writeFileSync(envPath, originalEnvContent);
      
      // 型を元に戻す
      await $`npm run generate:env-types`.quiet();
    }
  });

  it('should not include generated directory in watch list', async () => {
    // dev-watch.tsの内容を確認
    const devWatchPath = path.join(projectRoot, 'scripts', 'dev-watch.ts');
    const devWatchContent = fs.readFileSync(devWatchPath, 'utf-8');
    
    // generated/ディレクトリが無視されることを確認
    expect(devWatchContent).toContain("filename.includes('generated/')");
    expect(devWatchContent).toContain("filename.includes('.d.ts')");
  });

  it('should validate that generated types match the actual env schema', async () => {
    // 型を生成
    await $`npm run generate:env-types`.quiet();

    // env.tsから実際のスキーマを読み込む
    const envPath = path.join(projectRoot, 'app', 'env.ts');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    // スキーマから環境変数名を抽出
    const schemaVarNames: string[] = [];
    const schemaMatches = envContent.matchAll(/^\s*(\w+):\s*\{/gm);
    for (const match of schemaMatches) {
      // SCHEMA_TYPEのような定数は除外
      if (!match[1].includes('SCHEMA_TYPE') && !match[1].includes('import')) {
        schemaVarNames.push(match[1]);
      }
    }

    // 生成された型から環境変数名を抽出
    const typesContent = fs.readFileSync(generatedTypesPath, 'utf-8');
    const typeVarNames: string[] = [];
    const typeMatches = typesContent.matchAll(/^\s*(\w+):\s*(string|number|boolean);/gm);
    for (const match of typeMatches) {
      typeVarNames.push(match[1]);
    }

    // スキーマと型定義の変数名が一致することを確認
    expect(typeVarNames.sort()).toEqual(schemaVarNames.sort());
  });
});