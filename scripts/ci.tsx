#!/usr/bin/env bun
/**
 * CI で回す検査をまとめて実行する。
 *
 *   bun run ci
 *
 * `build` だけは先に単独で走らせる。生成物 (`.decopin/types.d.ts`) を
 * `typecheck` とテストが読むため。残りは互いに独立なので並列に流す。
 * `intent` は最後に 1 つ。テストが残した Evidence の断片から Intent の
 * ドキュメントを組み、宣言と食い違えば落ちる (ADR 48)。
 *
 * 結果の表は自作のコンポーネントで出している。CI が回るたびに
 * レンダラーが実地で動くことになる (壊れていれば CI 自体が落ちる)。
 * 表は `<Dynamic>` の島で、終わった検査から順に上へ積み、走っている検査は
 * 経過時間を刻む。端末でなければ (CI のログ) 最後の表を 1 回だけ書く。
 */
import {
  Br,
  Danger,
  Dynamic,
  Exit,
  Line,
  present,
  Success,
  Table,
  Text,
} from 'decopin-cli';

interface Task {
  name: string;
  command: string[];
}

/**
 * 段ごとに順に走らせ、段の中は並列に流す。
 * 段の中で 1 つでも落ちたら、後ろの段は走らせない
 */
const STAGES: Task[][] = [
  // 生成物を作る
  [{ name: 'build', command: ['bun', 'run', 'build'] }],
  // 互いに独立
  [
    { name: 'typecheck', command: ['bun', 'run', 'typecheck'] },
    { name: 'test', command: ['bun', 'test'] },
    { name: 'lint', command: ['bunx', 'oxlint'] },
    { name: 'format', command: ['bunx', 'oxfmt', '--check'] },
    { name: 'layout', command: ['bun', 'run', 'check:layout'] },
  ],
  // テストが書いた断片を読む
  [{ name: 'intent', command: ['bun', 'test/intent/doc.ts'] }],
];

type Status = 'waiting' | 'running' | 'ok' | 'failed' | 'skipped';

interface Entry {
  task: Task;
  status: Status;
  started: number;
  ms: number;
  output: string;
  /** 終わった順。表で上から並べるのに使う */
  finished: number;
}

const entries: Entry[] = STAGES.flat().map((task) => ({
  task,
  status: 'waiting',
  started: 0,
  ms: 0,
  output: '',
  finished: 0,
}));
const entryOf = (task: Task): Entry =>
  entries.find((entry) => entry.task === task)!;

let finishedCount = 0;

async function run(entry: Entry): Promise<Entry> {
  entry.status = 'running';
  entry.started = performance.now();
  const proc = Bun.spawn(entry.task.command, {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  entry.status = code === 0 ? 'ok' : 'failed';
  entry.ms = Math.round(performance.now() - entry.started);
  entry.output = `${stdout}${stderr}`.trim();
  entry.finished = ++finishedCount;
  return entry;
}

/** 検査が 1 つ始まるか終わるたびに、表の元になる一覧を流す */
async function* progress(): AsyncGenerator<Entry[]> {
  for (const stage of STAGES) {
    const running = new Map(
      stage.map((task) => {
        const entry = entryOf(task);
        return [entry, run(entry)] as const;
      })
    );
    yield entries;
    while (running.size > 0) {
      running.delete(await Promise.race(running.values()));
      yield entries;
    }
    if (stage.some((task) => entryOf(task).status === 'failed')) break;
  }
  for (const entry of entries) {
    if (entry.status === 'waiting') entry.status = 'skipped';
  }
  yield entries;
}

const RANK: Record<Status, number> = {
  ok: 0,
  failed: 0,
  running: 1,
  waiting: 2,
  skipped: 2,
};

function Summary({ entries }: { entries: Entry[] }) {
  // 終わったものを終わった順に上へ、走っているもの、まだのものを下へ
  const sorted = [...entries].sort(
    (a, b) => RANK[a.status] - RANK[b.status] || a.finished - b.finished
  );
  return (
    <Table
      columns={['CHECK', 'RESULT', 'TIME']}
      rows={sorted.map((entry) => [
        entry.task.name,
        entry.status === 'failed' ? 'FAILED' : entry.status,
        entry.status === 'running'
          ? `${Math.round(performance.now() - entry.started)}ms`
          : entry.status === 'ok' || entry.status === 'failed'
            ? `${entry.ms}ms`
            : '',
      ])}
      align={['left', 'left', 'right']}
    />
  );
}

/** 島が閉じてから評価される。そのときには全検査の結果が出ている */
function Report() {
  const failed = entries
    .filter((entry) => entry.status === 'failed')
    .sort((a, b) => a.finished - b.finished);
  if (failed.length === 0) {
    return (
      <>
        <Br />
        <Success>all checks passed</Success>
      </>
    );
  }
  return (
    <>
      <Br />
      {failed.map((entry) => (
        <Danger key={entry.task.name}>{entry.task.name}</Danger>
      ))}
      <Br />
      {failed.map((entry) => (
        <>
          <Line key={`${entry.task.name}-head`}>
            <Text bold>{`--- ${entry.task.name} ---`}</Text>
          </Line>
          {entry.output.split('\n').map((line, index) => (
            <Line key={`${entry.task.name}-${index}`}>{line}</Line>
          ))}
        </>
      ))}
      <Exit code={1} />
    </>
  );
}

const code = await present(
  <>
    <Dynamic source={progress()} interval={100}>
      {(entries) => <Summary entries={entries} />}
    </Dynamic>
    <Report />
  </>
);

process.exit(code ?? 0);
