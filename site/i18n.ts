/**
 * ドキュメントサイトの言語の対応表 (ADR 53)。
 *
 * 本文は英語の Markdown (site/content/) だけを正とし、日本語は
 * site/i18n/ja/<slug>.ts に「英語の段落 → 日本語の段落」の対応表として置く。
 * コードブロックは英語版をそのまま使うので訳には現れない。英語の段落を
 * 書き換えると対応表のキーが合わなくなり、ビルドが落ちて訳の更新を求める。
 *
 * ここには画面の決まり文句と節名を置く。scripts/build-site.ts と
 * site/search.ts (ブラウザ) の両方が読む。
 */

export type Lang = 'en' | 'ja';
export const LANGS: readonly Lang[] = ['en', 'ja'];

/** 1 ページぶんの訳 (site/i18n/ja/<slug>.ts の default export) */
export interface PageTranslation {
  title: string;
  description: string;
  /**
   * 英語の段落 (空白を詰めたもの) → 訳した段落。見出し・表・リストも
   * 1 段落として、Markdown の記号ごと訳す
   */
  blocks: Record<string, string>;
}

/** ページの枠 (ヘッダー・サイドメニュー・目次など) に出す決まり文句 */
export const UI = {
  en: {
    home: 'home',
    releaseNotes: 'Release notes',
    latest: 'Latest',
    onThisPage: 'On this page',
    editPage: 'Edit this page on GitHub',
    previous: 'Previous',
    next: 'Next',
    searchButton: 'Search documentation…',
    searchMobile: 'Search',
    searchTitle: 'Search documentation',
    searchClose: 'Close search',
    searchPlaceholder: 'Search pages, commands, and guides…',
    searchResults: 'Search results',
    searchHint: '↑ ↓ to navigate · Enter to open · Esc to close',
    toggleTheme: 'Toggle theme',
    menu: 'Menu',
    docs: 'Documentation',
    license: 'MIT License',
    switchTo: '日本語で読む',
  },
  ja: {
    home: 'ホーム',
    releaseNotes: 'リリースノート',
    latest: '最新',
    onThisPage: '目次',
    editPage: 'GitHub でこのページを編集',
    previous: '前へ',
    next: '次へ',
    searchButton: 'ドキュメントを検索…',
    searchMobile: '検索',
    searchTitle: 'ドキュメントを検索',
    searchClose: '検索を閉じる',
    searchPlaceholder: 'ページ・コマンド・ガイドを検索…',
    searchResults: '検索結果',
    searchHint: '↑ ↓ で移動 · Enter で開く · Esc で閉じる',
    toggleTheme: 'テーマを切り替え',
    menu: 'メニュー',
    docs: 'ドキュメント',
    license: 'MIT ライセンス',
    switchTo: 'Read in English',
  },
} satisfies Record<Lang, Record<string, string>>;

/** 検索ダイアログの文言 (site/search.ts が `<html lang>` で選ぶ) */
export const SEARCH = {
  en: {
    empty: 'Type to search all documentation.',
    count: (n: number) => `${n} result${n === 1 ? '' : 's'}`,
    none: 'No results found. Try another search term.',
    loading: 'Loading documentation…',
    failed: 'Unable to load search. Close and reopen to retry.',
  },
  ja: {
    empty: 'キーワードを入力してドキュメント全体を検索します。',
    count: (n: number) => `${n} 件`,
    none: '見つかりませんでした。別の言葉で試してください。',
    loading: 'ドキュメントを読み込み中…',
    failed: '検索を読み込めませんでした。閉じて開き直してください。',
  },
} satisfies Record<Lang, Record<string, unknown>>;

/** サイドメニューの節名 (site/nav.json の title → 日本語) */
export const SECTIONS: Record<string, string> = {
  'Getting started': 'はじめに',
  Conventions: '規約ファイル',
  Inherited: '継承されるファイル',
  'Root-only': 'ルート専用ファイル',
  Guides: 'ガイド',
  Project: 'プロジェクト',
};
