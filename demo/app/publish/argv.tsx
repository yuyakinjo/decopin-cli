import { Argv, Option, type ArgvDefinition } from 'decopin-cli';

export default function DefineArgv(): ArgvDefinition {
  return (
    <Argv description="Publish, if the environment is ready.">
      <Option
        name="check"
        type="boolean"
        default={false}
        description="only check the prerequisites"
      />
    </Argv>
  );
}
