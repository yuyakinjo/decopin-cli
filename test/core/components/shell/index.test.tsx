/**
 * `Shell.*` の façade (src/core/components/shell)。
 *
 * 実装は src/features/conventions/shell にあり、ここは再輸出するだけ。
 * façade から取った部品が実装と同じで、宣言したものがシェルコードに
 * 1 行ずつなることを見る。クォートの細部は test/features/conventions/shell が見る
 */
import { describe, expect, test } from 'bun:test';

import { renderShell, Shell as PublicShell } from 'decopin-cli';

import { Shell } from '../../../../src/core/components/shell/index.ts';
import { resolveHosts } from '../../../../src/core/jsx/resolve.ts';
import { Shell as FeatureShell } from '../../../../src/features/conventions/shell/components.ts';

describe('Shell', () => {
  test('façade・公開 API・実装が同じ実体を指す', () => {
    expect(Shell).toBe(FeatureShell);
    expect(PublicShell).toBe(Shell);
  });

  test('部品ごとの種類と表示名', () => {
    expect(
      Object.entries(Shell).map(([key, part]) => [key, part.$host, part.name])
    ).toEqual([
      ['Cd', 'shell.cd', 'Shell.Cd'],
      ['Export', 'shell.export', 'Shell.Export'],
      ['Unset', 'shell.unset', 'Shell.Unset'],
      ['Alias', 'shell.alias', 'Shell.Alias'],
      ['Source', 'shell.source', 'Shell.Source'],
      ['Raw', 'shell.raw', 'Shell.Raw'],
    ]);
  });

  test('宣言した順に 1 行ずつシェルコードになる', async () => {
    const nodes = await resolveHosts(
      <>
        <Shell.Cd to="/tmp/work" />
        <Shell.Export name="MODE" value="dev" />
        <Shell.Unset name="OLD" />
        <Shell.Alias name="ll" command="ls -l" />
        <Shell.Source file="/etc/profile" />
        <Shell.Raw code="echo $MODE" />
      </>
    );
    expect(renderShell(nodes)).toBe(
      [
        "cd '/tmp/work'",
        "export MODE='dev'",
        'unset OLD',
        "alias ll='ls -l'",
        "source '/etc/profile'",
        'echo $MODE',
        '',
      ].join('\n')
    );
  });

  test('何も宣言しなければ空文字', async () => {
    expect(renderShell(await resolveHosts(<></>))).toBe('');
  });
});
