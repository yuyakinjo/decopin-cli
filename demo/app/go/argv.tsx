import { Arg, Argv, Type, type ArgvDefinition } from 'decopin-cli';

export default function DefineArgv(): ArgvDefinition {
  return (
    <Argv description="Jump to a well-known directory and remember it.">
      <Arg name="place" required description="where to go">
        <Type.Enum values={['root', 'app', 'docs', 'tests']} />
      </Arg>
    </Argv>
  );
}
