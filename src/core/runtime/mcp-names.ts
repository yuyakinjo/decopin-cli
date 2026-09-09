/**
 * ルート名をツール名にする。既存クライアントとの互換性のため、
 * 英数字・ハイフン・アンダースコアの最大64文字に正規化する。
 * ルートコマンドにはプログラム名を使い、衝突は assertToolNames で検査する。
 */
export function toolName(route: string, program: string): string {
  const raw = route === '' ? program : route.split('/').join('_');
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'root';
}

/** 一覧と呼び出しで同じ一意性を保証する。ビルド時にも検査する。 */
export function assertToolNames(routes: string[], program: string): void {
  const seen = new Map<string, string>();
  for (const route of routes) {
    const name = toolName(route, program);
    const previous = seen.get(name);
    if (previous !== undefined) {
      throw new Error(
        `MCP tool name collision "${name}": "${previous || '(root)'}" and "${route || '(root)'}". Rename one of the commands.`
      );
    }
    seen.set(name, route);
  }
}
