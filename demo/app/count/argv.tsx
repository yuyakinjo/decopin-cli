import { Argv, Option, type ArgvDefinition } from 'decopin-cli';

export default function DefineArgv(): ArgvDefinition {
  return (
    <Argv description="Count lines coming from stdin.">
      <Option
        name="non-empty"
        alias="n"
        type="boolean"
        default={false}
        description="skip empty lines"
      />
      <Option
        name="unique"
        alias="u"
        type="boolean"
        default={false}
        description="count each line only once"
      />
    </Argv>
  );
}
