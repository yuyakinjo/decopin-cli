import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'version.tsx',
  description: '--version が出力するもの。',
  blocks: {
    '`--version` is reserved by the framework. `version.tsx` at the root says what it prints:':
      '`--version` はフレームワークの予約オプションです。何を出力するかは、ルートの `version.tsx` に書きます:',
    '`name` is optional; without it only the version is printed. The program name shown in `Usage:` lines comes from `package.json` (or `--program` at build time), not from this file. Without `version.tsx`, `--version` is an error that tells you to add the file, so a CLI never reports a version nobody declared.':
      '`name` は省略でき、省略するとバージョンだけを出力します。`Usage:` の行に出るプログラム名はこのファイルではなく `package.json` (またはビルド時の `--program`) から来ます。`version.tsx` が無いと、`--version` はこのファイルを足すよう促すエラーになります。誰も宣言していないバージョンを CLI が名乗ることはありません。',
    "In this repository, a test checks that the demo's `version.tsx` matches `package.json`, because a stale example is the one people copy.":
      'このリポジトリでは、デモの `version.tsx` が `package.json` と一致しているかをテストで確かめています。古くなったサンプルこそ、人がコピーするものだからです。',
  },
} satisfies PageTranslation;
