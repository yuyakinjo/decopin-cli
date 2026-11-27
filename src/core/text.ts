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

/**
 * 制御文字を、端末が解釈しない見える表記 (`\x1b`, `\r`) にする。
 *
 * 診断には入力がそのまま入る (`Unknown command: <打たれた語>`、
 * `received "<値>"`)。入力が ESC や復帰文字を含むと、端末はそれを**命令として**
 * 読み、行を消したり、別のエラーを描いたりできる。色を切っても
 * (`--no-color`) 止まらない — 切れるのは枠組みが付ける装飾だけで、入力の
 * 中身ではないから。
 *
 * 対象は C0 (タブと改行以外)・DEL・C1。C1 (`U+0080`〜`U+009F`) は 8 ビットの
 * CSI を含み、ESC 無しで同じことができる。タブは残す (位置を動かすだけ)。
 * 改行は呼び出し側が決める: 文面の構造として自分で入れた改行は残し、
 * 入力から来た 1 行のはずの値では潰す (1 行増やせると、偽の行を足せる)
 */
export function visibleControls(
  text: string,
  options: { newlines?: 'keep' | 'escape' } = {}
): string {
  const keepNewlines = options.newlines !== 'escape';
  let out = '';
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const control = code < 0x20 || (code >= 0x7f && code <= 0x9f);
    if (!control || code === 0x09 || (code === 0x0a && keepNewlines)) continue;
    out += text.slice(start, index) + controlName(code);
    start = index + 1;
  }
  // 制御文字が無ければ同じ文字列を返す (ほとんどの文面はここを通る)
  return start === 0 ? text : out + text.slice(start);
}

function controlName(code: number): string {
  if (code === 0x0a) return '\\n';
  if (code === 0x0d) return '\\r';
  return `\\x${code.toString(16).padStart(2, '0')}`;
}
