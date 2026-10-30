import { type CmdProps, KeyValue } from 'decopin-cli';

export default function Command({ data }: CmdProps<'user/show'>) {
  return <KeyValue data={{ name: data.name, role: data.role }} />;
}
