import type { CommandProps } from 'decopin-cli';

/** error.tsx の動きを見るための、必ず失敗するコマンド */
export default function Command(_props: CommandProps<'crash'>) {
  throw new Error('the command exploded');
}
