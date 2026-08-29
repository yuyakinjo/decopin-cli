/**
 * GitHub Release の本文 (ADR 20)。
 *
 * CalVer の番号は互換性を伝えられないので、本文が唯一の知らせ方になる。
 * 破壊的変更が黙って落ちないことをここで固定する
 */
import { describe, expect, test } from 'bun:test';

import {
  type Commit,
  breakingChanges,
  parseLog,
  releaseNotes,
} from '../../scripts/release-notes.ts';
import type { Deprecation } from '../../src/deprecations.ts';

describe('breakingChanges', () => {
  const cases: [string, Commit, string | undefined][] = [
    [
      '件名の ! を拾う',
      { subject: 'feat(type)!: split Type.Date', body: '' },
      'split Type.Date',
    ],
    [
      'scope が無くても拾う',
      { subject: 'feat!: drop node 22', body: '' },
      'drop node 22',
    ],
    [
      'BREAKING CHANGE: フッタを拾う',
      {
        subject: 'refactor: tidy',
        body: 'BREAKING CHANGE: run() is async now',
      },
      'run() is async now',
    ],
    [
      'ハイフン綴りも拾う',
      { subject: 'refactor: tidy', body: 'BREAKING-CHANGE: exit code changed' },
      'exit code changed',
    ],
    [
      '両方あればフッタを採る (そちらが詳しい)',
      {
        subject: 'feat!: short',
        body: 'BREAKING CHANGE: the long explanation',
      },
      'the long explanation',
    ],
    [
      'ただの feat は拾わない',
      { subject: 'feat: add help', body: '' },
      undefined,
    ],
    [
      '本文に ! があるだけでは拾わない',
      { subject: 'fix: typo', body: 'oops!: not a footer' },
      undefined,
    ],
  ];

  for (const [label, commit, expected] of cases) {
    test(label, () => {
      expect(breakingChanges([commit])).toEqual(
        expected === undefined ? [] : [expected]
      );
    });
  }
});

describe('releaseNotes', () => {
  const deprecation: Deprecation = {
    what: 'Type.Date',
    since: '2026-08-29',
    removeAfter: '2027-08-29',
    migration: 'use <Type.Instant/>',
  };

  test('破壊的変更を先頭に出す', () => {
    const notes = releaseNotes(
      '2026.829.1200',
      [{ subject: 'feat!: drop node 22', body: '' }],
      []
    );
    expect(notes.indexOf('## Breaking changes')).toBeLessThan(
      notes.indexOf('## Changes')
    );
    expect(notes).toContain('- drop node 22');
  });

  test('破壊的変更が無ければ節ごと出さない', () => {
    const notes = releaseNotes(
      '2026.829.1200',
      [{ subject: 'fix: typo', body: '' }],
      []
    );
    expect(notes).not.toContain('## Breaking changes');
  });

  test('非推奨は期限と移行先を表で出す', () => {
    const notes = releaseNotes('2026.829.1200', [], [deprecation]);
    expect(notes).toContain('2027-08-29');
    expect(notes).toContain('use <Type.Instant/>');
  });

  test('変更の一覧は必ず出す', () => {
    expect(releaseNotes('2026.829.1200', [], [])).toContain('## Changes');
  });
});

describe('parseLog', () => {
  test('NUL 区切りで件名と本文に分ける', () => {
    expect(parseLog('feat: one\n\nbody one\0fix: two\0')).toEqual([
      { subject: 'feat: one', body: 'body one' },
      { subject: 'fix: two', body: '' },
    ]);
  });

  test('空の入力は空', () => {
    expect(parseLog('')).toEqual([]);
  });
});
