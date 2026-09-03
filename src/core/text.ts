/**
 * 文字列そのものを相手にする道具。規約を何も知らないので core に置く。
 */

/**
 * 打ち間違いに一番近い候補を返す (ADR 30)。
 * 遠すぎる候補を出すと混乱するので、入力の長さの半分までに限る。
 */
export function closest(
  value: string,
  candidates: Iterable<string>
): string | undefined {
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate === '') continue;
    const distance = editDistance(value, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  if (best === undefined || bestDistance > Math.ceil(value.length / 2)) {
    return undefined;
  }
  return best;
}

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);

  for (let row = 1; row < rows; row += 1) {
    const current = [row, ...Array.from({ length: cols - 1 }, () => 0)];
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      current[col] = Math.min(
        (previous[col] ?? 0) + 1,
        (current[col - 1] ?? 0) + 1,
        (previous[col - 1] ?? 0) + cost
      );
    }
    previous = current;
  }
  return previous[cols - 1] ?? 0;
}
