import { KeyValue, type CommandProps } from 'decopin-cli';

export default function Command({ data }: CommandProps<'user/show'>) {
  return <KeyValue data={{ name: data.name, role: data.role }} />;
}
