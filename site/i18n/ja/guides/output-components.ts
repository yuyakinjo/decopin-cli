import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: '出力コンポーネント',
  description: 'コマンドが返す部品。',
  blocks: {
    '## Display width': '## 表示幅',
    'Display width is counted properly, so frames and tables do not drift when the content is CJK or emoji.':
      '表示幅を正しく数えるので、中身が日本語などの CJK 文字や絵文字でも枠や表がずれません。',
    '## Colour': '## 色',
    'Colour turns itself off when it should: piped or redirected output, `NO_COLOR`, `--no-color`, or `TERM=dumb` (`FORCE_COLOR` forces it back on). `<Line>` never wraps on its own, so line-oriented consumers downstream keep working.':
      '色は必要なときに自動で消えます。パイプやリダイレクトへの出力、`NO_COLOR`、`--no-color`、`TERM=dumb` のときです (`FORCE_COLOR` で強制的に戻せます)。`<Line>` が勝手に折り返すことはないので、後段で行単位に処理するものもそのまま動きます。',
    '## Streams': '## ストリーム',
    'Everything goes to stdout unless wrapped in `<Stderr>`. Errors, progress ([Partial Repainting](/guides/partial-repainting/)) and prompts ([Prompts](/guides/prompts/)) use stderr on their own, so `cli cmd | tee log` receives only the document.':
      '`<Stderr>` で包まない限り、すべて stdout に出ます。エラー、進捗 ([部分再描画](/guides/partial-repainting/))、プロンプト ([プロンプト](/guides/prompts/)) は自分で stderr を使うので、`cli cmd | tee log` が受け取るのは本文だけです。',
  },
} satisfies PageTranslation;
