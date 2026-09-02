/**
 * 親シェルの状態を変える宣言 `Shell.*` (ADR 35)。
 *
 * 子プロセスは親シェルの cwd や環境変数を変えられない。そこで `shell.tsx` が
 * 「シェルにしてほしいこと」を宣言し、枠組みがそれをシェルコードにして、
 * 薄いシェル関数が eval する (direnv / zoxide と同じ方式)。
 *
 * 文字列でシェルコードを組まず部品で宣言するのは、値のクォートを枠組みが
 * 引き受けるため。`Shell.Raw` だけは例外で、書いた人がクォートに責任を持つ
 */
import { host } from '../host.ts';

/** `<Shell.Cd>` */
export interface CdProps {
  /** 移動先。相対パスはコマンドを打った場所から解決される */
  to: string;
}

/** `<Shell.Export>` */
export interface ExportProps {
  /** 環境変数の名前 (`[A-Za-z_][A-Za-z0-9_]*`) */
  name: string;
  value: string;
}

/** `<Shell.Unset>` */
export interface UnsetProps {
  name: string;
}

/** `<Shell.Alias>` */
export interface AliasProps {
  name: string;
  /** alias の中身。そのままシェルに渡る */
  command: string;
}

/** `<Shell.Source>` */
export interface SourceProps {
  /** `source` するファイル */
  file: string;
}

/** `<Shell.Raw>` */
export interface RawProps {
  /** そのまま eval されるシェルコード。クォートは書いた人の責任 */
  code: string;
}

/** `shell.tsx` で使う部品。`Type.*` と同じく名前空間で持つ */
export const Shell = {
  /** 親シェルの cwd を変える */
  Cd: host<CdProps>('shell.cd', 'Shell.Cd'),
  /** 親シェルに環境変数を export する */
  Export: host<ExportProps>('shell.export', 'Shell.Export'),
  /** 親シェルの環境変数を消す */
  Unset: host<UnsetProps>('shell.unset', 'Shell.Unset'),
  /** 親シェルに alias を定義する */
  Alias: host<AliasProps>('shell.alias', 'Shell.Alias'),
  /** 親シェルでファイルを source する */
  Source: host<SourceProps>('shell.source', 'Shell.Source'),
  /** 部品で表せないものをそのまま渡す */
  Raw: host<RawProps>('shell.raw', 'Shell.Raw'),
};
