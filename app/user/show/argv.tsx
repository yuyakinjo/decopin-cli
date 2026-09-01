import { Arg, Argv } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Show one user, or suggest a close name.">
      <Arg name="name" type="string" required description="who to show" />
    </Argv>
  );
}
