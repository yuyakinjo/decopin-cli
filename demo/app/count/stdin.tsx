import { Stdin, type StdinDefinition } from 'decopin-cli';

/** 標準入力を行単位で読む。パイプされていなければエラー (ADR 2) */
export default function DefineStdin(): StdinDefinition {
  return <Stdin mode="lines" required />;
}
