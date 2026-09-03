/**
 * zsh 補完シムの生成 (ADR 21)。
 *
 * シムは「CLI に聞きに行く」手順だけを持ち、コマンドの構成を含まない。
 * 構成が変わってもこのファイルが変わらないことが、この設計の要
 * (compdump の無効化が要らない)。
 */
import { describe, expect, test } from 'bun:test';

import {
  binaryName,
  completionFileName,
  generateZshCompletion,
  resolveBinaryName,
} from '../../src/features/conventions/complete/build.ts';

describe('zsh 補完シム', () => {
  const shim = generateZshCompletion('my-cli');

  test('1 行目は #compdef で、対象のコマンド名を宣言する', () => {
    expect(shim.startsWith('#compdef my-cli\n')).toBe(true);
  });

  test('候補は CLI 自身に聞く (__complete)', () => {
    expect(shim).toContain('my-cli __complete -- ');
  });

  test('コマンドの構成 (サブコマンド名) を含まない', () => {
    // シムに固有名詞が焼き込まれないことの代表値として、生成物が
    // program 名以外の入力を持たないことを見る: 同じ program なら常に同一
    expect(generateZshCompletion('my-cli')).toBe(shim);
  });

  test('候補ゼロならファイル補完に落ちる', () => {
    expect(shim).toContain('_files');
  });

  test('スコープ付きパッケージ名は bin 名に落とす', () => {
    expect(binaryName('@scope/tool')).toBe('tool');
    expect(completionFileName('@scope/tool')).toBe('_tool');
    const scoped = generateZshCompletion('@scope/tool');
    expect(scoped.startsWith('#compdef tool\n')).toBe(true);
    expect(scoped).toContain('tool __complete -- ');
    expect(scoped).not.toContain('@scope');
  });

  test('生成したシムは zsh がそのまま読める (手元に zsh があるとき)', async () => {
    if (Bun.which('zsh') === null) return;
    const proc = Bun.spawn(['zsh', '-n'], {
      stdin: new Blob([generateZshCompletion('my-cli')]),
      stderr: 'pipe',
    });
    expect(await proc.exited).toBe(0);
  });

  test('zsh の関数名に使えない文字は潰す', () => {
    const odd = generateZshCompletion('my.cli');
    expect(odd).toContain('_my_cli() {');
    expect(odd).toContain('compdef _my_cli my.cli');
  });
});

describe('コマンド名の解決', () => {
  test('package.json の bin のキーを使う (name ではない)', async () => {
    // このリポジトリ自身が name: decopin-cli / bin: decopin の実例
    expect(await resolveBinaryName('decopin-cli')).toBe('decopin');
  });
});
