#!/usr/bin/env bun
/**
 * 決定を記録し忘れていないか、ターンの終わりに知らせる (Stop hook)。
 *
 * docs/decisions.md は「なぜそうしたか」を残す唯一の場所で、
 * 書き忘れると同じ議論を最初からやり直すことになる。
 *
 * 参照切れのような**機械的に検証できること**はテスト
 * (test/docs/references.test.ts) の仕事。ここは「決定をしたかどうか」という
 * 判断が要ることだけを扱うので、止めずに知らせるだけにする。
 */

/** 変更が「設計の判断を伴いそう」と見なす条件 */
interface Signal {
  /** 何を見つけたか (利用者に伝える文) */
  label: string;
  matches: (status: StatusEntry[]) => boolean;
}

interface StatusEntry {
  /** git status --porcelain の 2 文字 */
  code: string;
  path: string;
  /** 新しく増えたファイルか */
  added: boolean;
}

function parseStatus(output: string): StatusEntry[] {
  return output
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => {
      const code = line.slice(0, 2);
      // リネームは "old -> new" の形で来る
      const path = line.slice(3).split(' -> ').pop() ?? '';
      return { code, path, added: code.includes('A') || code.includes('?') };
    });
}

const SIGNALS: Signal[] = [
  {
    label: 'src/ に新しいファイルが増えている',
    matches: (entries) =>
      entries.some((entry) => entry.added && entry.path.startsWith('src/')),
  },
  {
    label: '公開 API (src/index.ts) が変わっている',
    matches: (entries) =>
      entries.some((entry) => entry.path === 'src/index.ts'),
  },
  {
    label: '依存 (package.json) が変わっている',
    matches: (entries) =>
      entries.some((entry) => entry.path === 'package.json'),
  },
  {
    label: '新しい規約ファイルを app/ に足している',
    matches: (entries) =>
      entries.some((entry) => entry.added && entry.path.startsWith('app/')),
  },
];

async function git(args: string[]): Promise<string> {
  const proc = Bun.spawn(['git', ...args], {
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const [output] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  return output;
}

const status = parseStatus(await git(['status', '--porcelain']));
if (status.length === 0) process.exit(0);

// すでに書いていれば何も言わない
const recorded = status.some((entry) => entry.path === 'docs/decisions.md');
if (recorded) process.exit(0);

const found = SIGNALS.filter((signal) => signal.matches(status));
if (found.length === 0) process.exit(0);

const reasons = found.map((signal) => `  - ${signal.label}`).join('\n');
console.log(
  JSON.stringify({
    systemMessage: [
      'docs/decisions.md が更新されていません。',
      reasons,
      '設計の判断をしたなら ADR を足してください (挙動の約束は test/contract/ に置く)。',
    ].join('\n'),
  })
);
