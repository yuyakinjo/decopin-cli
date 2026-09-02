/**
 * 日時 (ADR 19) と custom / oneOf の型を、宣言 → help → 変換 → 検証まで一気に通す。
 *
 * カバレッジで見ると、この経路は個別の分岐がどこからも呼ばれていなかった。
 * 表は「宣言に書いたことがそのまま help に出て、そのまま検証される」ことの確認
 */
import { describe, expect, test } from 'bun:test';

import { Arg, Argv, Option, render, Type } from 'decopin-cli';

import { parseArgvSpec } from '../../src/declaration/parse.ts';
import { resolveHosts } from '../../src/declaration/resolve.ts';
import type { ArgvSpec } from '../../src/declaration/spec.ts';
import type { TypeNode } from '../../src/declaration/type-node.ts';
import { typeLabel } from '../../src/declaration/type-node.ts';
import { Help } from '../../src/runtime/help.tsx';
import { validateArgv } from '../../src/validation/validate.ts';

const spec = await (async () =>
  parseArgvSpec(
    await resolveHosts(
      <Argv description="Temporal types.">
        <Arg name="when" required>
          <Type.Instant min="2026-01-01T00:00:00Z" max="2026-12-31T23:59:59Z" />
        </Arg>
        <Option name="day">
          <Type.PlainDate min="2026-01-01" max="2026-12-31" />
        </Option>
        <Option name="legacy">
          <Type.Date min="2026-01-01" max="2026-12-31" />
        </Option>
        <Option name="size">
          <Type.OneOf>
            <Type.Number />
            <Type.Enum values={['auto']} />
          </Type.OneOf>
        </Option>
        <Option name="even">
          <Type.Custom
            validate={(value) => typeof value === 'number' && value % 2 === 0}
            as="number"
            message="must be even"
          />
        </Option>
        <Option name="tags">
          <Type.Array>
            <Type.Enum values={['a', 'b']} />
          </Type.Array>
        </Option>
      </Argv>
    )
  ))();

function option(name: string): TypeNode {
  const found = spec.options.find((o) => o.name === name);
  if (found === undefined) throw new Error(name);
  return found.type;
}

function only(type: TypeNode, tokens: string[]) {
  const one: ArgvSpec = {
    args: [],
    options: [{ name: 'x', required: false, hidden: false, type }],
  };
  return validateArgv(one, tokens);
}

describe('宣言の読み取り', () => {
  test('min / max が TypeNode に載る', () => {
    expect(spec.args[0]?.type).toEqual({
      kind: 'instant',
      min: '2026-01-01T00:00:00Z',
      max: '2026-12-31T23:59:59Z',
    });
    expect(option('day')).toEqual({
      kind: 'plainDate',
      min: '2026-01-01',
      max: '2026-12-31',
    });
    expect(option('legacy')).toEqual({
      kind: 'date',
      min: '2026-01-01',
      max: '2026-12-31',
    });
  });
});

describe('help の型名 (typeLabel)', () => {
  test('全部の kind に名前がある', () => {
    expect(typeLabel({ kind: 'instant' })).toBe('instant');
    expect(typeLabel({ kind: 'plainDate' })).toBe('date');
    expect(typeLabel({ kind: 'date' })).toBe('date');
    expect(typeLabel({ kind: 'object', fields: [] })).toBe('object');
    expect(typeLabel(option('size'))).toBe('number|auto');
    expect(typeLabel(option('even'))).toBe('number');
    expect(
      typeLabel({ kind: 'custom', validate: () => true, coerceAs: 'none' })
    ).toBe('value');
    expect(typeLabel(option('tags'))).toBe('a|b...');
  });

  test('help にそのまま出る', async () => {
    const out = await render(<Help program="cli" command="t" spec={spec} />, {
      env: { NO_COLOR: '1' },
      columns: 100,
    });
    expect(out.stdout).toContain('--day <date>');
    expect(out.stdout).toContain('--size <number|auto>');
    expect(out.stdout).toContain('--tags <a|b...>');
    expect(out.stdout).toContain('<when>');
  });
});

describe('変換と範囲', () => {
  test('instant は範囲の内なら通り、外なら理由を言う', () => {
    const inside = validateArgv(spec, ['2026-06-01T00:00:00Z']);
    expect(inside.ok).toBe(true);
    const outside = validateArgv(spec, ['2027-01-01T00:00:00Z']);
    expect(outside.ok).toBe(false);
    if (!outside.ok)
      expect(outside.issues[0]).toContain('expected <= 2026-12-31T23:59:59Z');
    const unreadable = validateArgv(spec, ['yesterday']);
    expect(unreadable.ok).toBe(false);
    if (!unreadable.ok)
      expect(unreadable.issues[0]).toContain('expected an instant like');
  });

  test('plainDate も同じ (下限)', () => {
    const result = only(option('day'), ['--x', '2025-12-31']);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues[0]).toContain('expected >= 2026-01-01');
    expect(only(option('day'), ['--x', '2026-03-01']).ok).toBe(true);
  });

  test('非推奨の date は Invalid Date を弾き、範囲も見る', () => {
    const bad = only(option('legacy'), ['--x', 'not-a-date']);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues[0]).toContain('expected a date');
    const late = only(option('legacy'), ['--x', '2030-01-01']);
    expect(late.ok).toBe(false);
    const fine = only(option('legacy'), ['--x', '2026-06-15']);
    expect(fine.ok).toBe(true);
    if (fine.ok) expect(fine.value.options.x).toBeInstanceOf(Date);
  });

  test('oneOf は順に試す。enum は文字列を受けるので検証側で落ちる', () => {
    expect(only(option('size'), ['--x', '12']).ok).toBe(true);
    expect(only(option('size'), ['--x', 'auto']).ok).toBe(true);
    const result = only(option('size'), ['--x', 'huge']);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues[0]).toContain('Expected (number | "auto")');
  });

  test('oneOf の変換が全部外れたら、理由を / で繋げる', () => {
    const type: TypeNode = {
      kind: 'oneOf',
      options: [{ kind: 'number' }, { kind: 'boolean' }],
    };
    const result = only(type, ['--x', 'huge']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toBe(
        '--x: expected a number, received "huge" / expected a boolean (true or false), received "huge"'
      );
    }
  });

  test('custom は as に従って変換してから validate に渡す', () => {
    expect(only(option('even'), ['--x', '4']).ok).toBe(true);
    const odd = only(option('even'), ['--x', '3']);
    expect(odd.ok).toBe(false);
    if (!odd.ok) expect(odd.issues[0]).toContain('must be even');
    // as が無ければ生の文字列のまま渡る
    const raw: TypeNode = {
      kind: 'custom',
      validate: (value) => typeof value === 'string' && value.startsWith('id-'),
      coerceAs: 'none',
    };
    expect(only(raw, ['--x', 'id-1']).ok).toBe(true);
    expect(only(raw, ['--x', '1']).ok).toBe(false);
  });
});
