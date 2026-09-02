import { Success, type CommandProps } from 'decopin-cli';

export default function Command({ data }: CommandProps<'publish'>) {
  return <Success>published: {String(data.published)}</Success>;
}
