import type { CmdProps } from 'decopin-cli';

/** error.tsx の動きを見るための、必ず失敗するコマンド */
export default function Command(_props: CmdProps<'crash'>) {
  throw new Error('the command exploded');
}
