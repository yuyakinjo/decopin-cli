import { Argv, Option } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Count lines coming from stdin.">
      <Option
        name="non-empty"
        alias="n"
        type="boolean"
        default={false}
        description="skip empty lines"
      />
    </Argv>
  );
}
