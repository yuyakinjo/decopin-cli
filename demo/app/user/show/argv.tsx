import { Arg, Argv, type ArgvDefinition } from 'decopin-cli';

export default function DefineArgv(): ArgvDefinition {
  return (
    <Argv description="Show one user, or suggest a close name.">
      <Arg name="name" type="string" required description="who to show" />
    </Argv>
  );
}
