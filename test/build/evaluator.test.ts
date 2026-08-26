import { describe, expect, test } from 'bun:test';

import { evaluateRoutes } from '../../src/build/evaluator.ts';
import { scan } from '../../src/build/scanner.ts';

const FIXTURE = 'test/fixtures/eval-app';

describe('evaluateRoutes', () => {
  test('argv.tsx を実際に評価して宣言を取り出す', async () => {
    const { routes } = await scan(FIXTURE);
    const { evaluated } = await evaluateRoutes(
      routes.filter((route) => route.name === 'ok')
    );
    const spec = evaluated[0]?.spec;
    expect(spec?.description).toBe('Fixture.');
    expect(spec?.args.map((arg) => arg.name)).toEqual(['target']);
    expect(spec?.options[0]).toMatchObject({
      name: 'count',
      defaultValue: 1,
      type: { kind: 'number', min: 1 },
    });
  });

  test('argv.tsx が無ければ空の宣言になる', async () => {
    const { routes } = await scan(FIXTURE);
    const { evaluated, problems } = await evaluateRoutes(
      routes.filter((route) => route.name === 'plain')
    );
    expect(problems).toEqual([]);
    expect(evaluated[0]?.spec).toEqual({ args: [], options: [] });
  });

  test('宣言の誤りは投げずに集める (どのファイルかも添える)', async () => {
    const { routes } = await scan(FIXTURE);
    const { evaluated, problems } = await evaluateRoutes(
      routes.filter((route) => route.name === 'bad')
    );
    expect(evaluated).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.file).toBe('test/fixtures/eval-app/bad/argv.tsx');
    expect(problems[0]?.message).toMatch(/Alias "-h" is reserved/);
  });

  test('誤りのあるルートだけを落として、他はそのまま通す', async () => {
    const { routes } = await scan(FIXTURE);
    const { evaluated, problems } = await evaluateRoutes(routes);
    expect(evaluated.map((item) => item.route.name).sort()).toEqual([
      'ok',
      'plain',
    ]);
    expect(problems).toHaveLength(1);
  });
});
