/**
 * シェルのパイプラインを走らせる、テスト用の口。
 *
 * 「読み手が遅い」「読み手が先に閉じる」は、本物のパイプの先に別プロセスの
 * 読み手を置かないと作れない。Bun.spawn の 'pipe' は親がすぐ読むうえ、
 * 子に渡るのはパイプではなくソケットなので (macOS で実測)、代わりにならない。
 *
 * `$0`, `$1`, ... に args が入る。パイプラインはプロセスグループごと起こし、
 * 時間切れになったらまとめて止める。書き残しを待つ側にタイムアウトが無いので
 * (ADR 54)、待ちが解けない不具合が入ってもテストが止まらず、赤で終わるように
 */
export interface PipelineResult {
  stdout: string;
  stderr: string;
  /** 時間切れで止めたときは 137 (SIGKILL) */
  code: number;
}

export interface PipelineOptions {
  cwd?: string;
  /** これを過ぎたらプロセスグループごと止める (ミリ秒) */
  limit?: number;
}

export async function pipeline(
  script: string,
  args: string[] = [],
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const proc = Bun.spawn(['sh', '-c', script, ...args], {
    cwd: options.cwd,
    stdin: new Blob(['']),
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
    detached: true,
  });
  const watchdog = setTimeout(() => {
    try {
      process.kill(-proc.pid, 'SIGKILL');
    } catch {
      // もう終わっている
    }
  }, options.limit ?? 20_000);

  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { stdout, stderr, code };
  } finally {
    clearTimeout(watchdog);
  }
}
