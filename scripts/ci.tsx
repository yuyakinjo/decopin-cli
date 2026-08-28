#!/usr/bin/env bun
/**
 * CI で回す検査をまとめて実行する。
 *
 *   bun run ci
 *
 * `build` だけは先に単独で走らせる。生成物 (`.decopin/types.d.ts`) を
 * `typecheck` とテストが読むため。残りは互いに独立なので並列に流す。
 *
 * 結果の表は自作のコンポーネントで出している。CI が回るたびに
 * レンダラーが実地で動くことになる (壊れていれば CI 自体が落ちる)。
 */
import {
  Br,
  Danger,
  Line,
  render,
  Success,
  Table,
  Text,
  write,
} from 'decopin-cli';

interface Task {
  name: string;
  command: string[];
}

/** 先に単独で走らせるもの (生成物を作る) */
const SEQUENTIAL: Task[] = [
  { name: 'build', command: ['bun', 'run', 'build'] },
];

/** 互いに独立なので並列に流すもの */
const PARALLEL: Task[] = [
  { name: 'typecheck', command: ['bunx', 'tsc', '--noEmit'] },
  { name: 'test', command: ['bun', 'test'] },
  { name: 'lint', command: ['bunx', 'oxlint'] },
  { name: 'format', command: ['bunx', 'oxfmt', '--check'] },
];

interface Result {
  task: Task;
  ok: boolean;
  ms: number;
  output: string;
}

async function run(task: Task): Promise<Result> {
  const started = performance.now();
  const proc = Bun.spawn(task.command, {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return {
    task,
    ok: code === 0,
    ms: Math.round(performance.now() - started),
    output: `${stdout}${stderr}`.trim(),
  };
}

const results: Result[] = [];
for (const task of SEQUENTIAL) {
  const result = await run(task);
  results.push(result);
  // 生成物が無いと後続が意味を持たないので、ここで落ちたら止める
  if (!result.ok) break;
}

if (results.every((result) => result.ok)) {
  results.push(...(await Promise.all(PARALLEL.map(run))));
}

const failed = results.filter((result) => !result.ok);

const summary = await render(
  <>
    <Table
      columns={['CHECK', 'RESULT', 'TIME']}
      rows={results.map((result) => [
        result.task.name,
        result.ok ? 'ok' : 'FAILED',
        `${result.ms}ms`,
      ])}
      align={['left', 'left', 'right']}
    />
    <Br />
    {failed.length === 0 ? (
      <Success>all checks passed</Success>
    ) : (
      <>
        {failed.map((result) => (
          <Danger key={result.task.name}>{result.task.name}</Danger>
        ))}
        <Br />
        {failed.map((result) => (
          <>
            <Line key={`${result.task.name}-head`}>
              <Text bold>{`--- ${result.task.name} ---`}</Text>
            </Line>
            {result.output.split('\n').map((line, index) => (
              <Line key={`${result.task.name}-${index}`}>{line}</Line>
            ))}
          </>
        ))}
      </>
    )}
  </>
);
write(summary);

process.exit(failed.length === 0 ? 0 : 1);
