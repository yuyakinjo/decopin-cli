import { Argv, Option } from 'decopin-cli';

export default function DefineArgv() {
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
