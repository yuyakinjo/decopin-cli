import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

describe('params.ts files', () => {
  describe('user/create/params.ts', () => {
    it('should export valid params definition', async () => {
      const paramsModule = await import('../../app/user/create/params.js');
      const paramsDefinition = paramsModule.default();

      expect(paramsDefinition).toBeDefined();
      expect(paramsDefinition.schema).toBeDefined();
      expect(paramsDefinition.mappings).toBeDefined();
      expect(Array.isArray(paramsDefinition.mappings)).toBe(true);
      expect(paramsDefinition.mappings.length).toBe(2);
    });

    it('should have correct field mappings', async () => {
      const paramsModule = await import('../../app/user/create/params.js');
      const paramsDefinition = paramsModule.default();

      const mappings = paramsDefinition.mappings;

      // name フィールドのマッピング
      const nameMapping = mappings.find((m) => m.field === 'name');
      expect(nameMapping).toBeDefined();
      expect(nameMapping?.option).toBe('name');
      expect(nameMapping?.argIndex).toBe(0);

      // email フィールドのマッピング
      const emailMapping = mappings.find((m) => m.field === 'email');
      expect(emailMapping).toBeDefined();
      expect(emailMapping?.option).toBe('email');
      expect(emailMapping?.argIndex).toBe(1);
    });

    it('should have valid valibot schema', async () => {
      const paramsModule = await import('../../app/user/create/params.js');
      const paramsDefinition = paramsModule.default();

      // スキーマで正常なデータを検証
      const validResult = v.safeParse(paramsDefinition.schema, {
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(validResult.success).toBe(true);
      expect(validResult.output).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should reject invalid data', async () => {
      const paramsModule = await import('../../app/user/create/params.js');
      const paramsDefinition = paramsModule.default();

      // 無効なデータ（空のname）
      const invalidResult1 = v.safeParse(paramsDefinition.schema, {
        name: '',
        email: 'john@example.com',
      });

      expect(invalidResult1.success).toBe(false);

      // 無効なデータ（不正なemail）
      const invalidResult2 = v.safeParse(paramsDefinition.schema, {
        name: 'John',
        email: 'invalid-email',
      });

      expect(invalidResult2.success).toBe(false);
    });

    it('should export CreateUserData type', async () => {
      const paramsModule = await import('../../app/user/create/params.js');

      // 型の存在確認（実行時ではTypeScriptの型を直接確認できないため、モジュールの内容を確認）
      expect(paramsModule).toBeDefined();
      expect(paramsModule.default).toBeDefined();
    });
  });

  describe('hello/params.ts', () => {
    it('should export valid params definition', async () => {
      const paramsModule = await import('../../app/hello/params.js');
      const paramsDefinition = paramsModule.default();

      expect(paramsDefinition).toBeDefined();
      expect(paramsDefinition.schema).toBeDefined();
      expect(paramsDefinition.mappings).toBeDefined();
      expect(Array.isArray(paramsDefinition.mappings)).toBe(true);
      expect(paramsDefinition.mappings.length).toBe(1);
    });

    it('should have correct field mappings with default value', async () => {
      const paramsModule = await import('../../app/hello/params.js');
      const paramsDefinition = paramsModule.default();

      const mappings = paramsDefinition.mappings;

      // name フィールドのマッピング
      const nameMapping = mappings.find((m) => m.field === 'name');
      expect(nameMapping).toBeDefined();
      expect(nameMapping?.option).toBe('name');
      expect(nameMapping?.argIndex).toBe(0);
      expect(nameMapping?.defaultValue).toBe('World');
    });

    it('should have valid valibot schema', async () => {
      const paramsModule = await import('../../app/hello/params.js');
      const paramsDefinition = paramsModule.default();

      // スキーマで正常なデータを検証
      const validResult = v.safeParse(paramsDefinition.schema, {
        name: 'Alice',
      });

      expect(validResult.success).toBe(true);
      expect(validResult.output).toEqual({
        name: 'Alice',
      });
    });

    it('should reject invalid data', async () => {
      const paramsModule = await import('../../app/hello/params.js');
      const paramsDefinition = paramsModule.default();

      // 無効なデータ（空のname）
      const invalidResult = v.safeParse(paramsDefinition.schema, {
        name: '',
      });

      expect(invalidResult.success).toBe(false);
    });
  });
});