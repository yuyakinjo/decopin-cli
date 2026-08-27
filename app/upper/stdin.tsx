import { Stdin } from 'decopin-cli';

/** required を付けないので、端末で実行すると undefined が渡る (ADR 2) */
export default function DefineStdin() {
  return <Stdin mode="text" trim />;
}
