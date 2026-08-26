import { Stdin } from 'decopin-cli';

/** 標準入力を行単位で読む。パイプされていなければエラー (§4.2) */
export default function DefineStdin() {
  return <Stdin mode="lines" required />;
}
