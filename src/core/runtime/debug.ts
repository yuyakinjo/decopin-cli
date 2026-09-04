/**
 * 失敗の元をどこまで見せるか。
 *
 * 既定の表示は message / issues / hints だけで、投げた場所は出さない。
 * `toCliError()` は元のエラーを `cause` に残す (ADR 42) ので、辿れば
 * 投げた場所は失われていない。`DECOPIN_DEBUG=1` のときだけ、その連鎖と
 * スタックを stderr に足す。argv の予約語にしないのは、`--verbose` /
 * `--debug` は利用者が自分のオプションとして宣言しがちな名前だから
 * (README の middleware の例がまさにそれ)
 */
export const DEBUG_ENV = 'DECOPIN_DEBUG';

/** `DECOPIN_DEBUG` が「入っている」か。`0` / `false` / 空は入っていない扱い */
export function isDebugRequested(
  env: Record<string, string | undefined>
): boolean {
  const value = env[DEBUG_ENV];
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false';
}

/** 連鎖を辿る深さの上限。循環していても止まる保険 */
const MAX_DEPTH = 8;

/**
 * エラーと、その `cause` の連鎖のスタックを行に並べる。
 *
 * 1 段目は受け取ったエラー自身。包まれていれば `toCliError` を指すが、
 * 2 段目以降 (`Caused by:`) に投げた場所が残っている
 */
export function traceLines(error: unknown): string[] {
  const lines: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (current === undefined || current === null) break;
    if (seen.has(current)) {
      lines.push('Caused by: (circular)');
      break;
    }
    seen.add(current);
    const text = Error.isError(current)
      ? (current.stack ?? `${current.name}: ${current.message}`)
      : String(current);
    lines.push(...(depth === 0 ? text : `Caused by: ${text}`).split('\n'));
    current = Error.isError(current) ? current.cause : undefined;
  }
  return lines;
}
