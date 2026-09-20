/**
 * `example.tsx` — そのコマンドを「どう打つと何が返るか」の実例。
 *
 * `decopin docs` が**実際に走らせて**出力を貼るので、ここに書いた例は
 * 動かなくなった時点で分かる (help の使用例は誰も走らせないので腐る)。
 *
 * 実行するのは宣言された例だけ。宣言のないコマンドは docs も走らせない。
 * 「読むつもりでファイルを消した」を起こさないための境界がここにある
 */
import { DeclarationError } from '../../../core/errors.ts';

/** 実例 1 つ。args はコマンド名の後ろに続ける語 */
export interface CommandExample {
  args: readonly string[];
  /** 何を示す例か。docs では実行の見出しに出る */
  description?: string;
}

/** example.tsx の default export の形 */
export type Examples = () =>
  | Promise<readonly CommandExample[]>
  | readonly CommandExample[];

function invalid(where: string, what: string): DeclarationError {
  return new DeclarationError(`${where}: ${what}`);
}

/** example.tsx を読み、実行できる形に整える。壊れていれば直し方を出して投げる */
export async function loadExamples(
  loader: (() => Promise<unknown>) | undefined,
  where = 'example.tsx'
): Promise<CommandExample[]> {
  if (loader === undefined) return [];
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw invalid(
      where,
      'must default-export a function that returns CommandExample[]'
    );
  }
  const returned = await (declare as Examples)();
  if (!Array.isArray(returned)) {
    throw invalid(where, 'the default export must return an array');
  }
  return returned.map((example, index) => {
    const at = `${where}: example ${index + 1}`;
    if (typeof example !== 'object' || example === null) {
      throw invalid(at, 'must be an object like { args: [] }');
    }
    const { args, description } = example as CommandExample;
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
      throw invalid(at, 'args must be an array of strings');
    }
    if (description !== undefined && typeof description !== 'string') {
      throw invalid(at, 'description must be a string');
    }
    return { args: [...args], description };
  });
}
