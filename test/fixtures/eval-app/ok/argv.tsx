import { Arg, Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Fixture.">
      <Arg name="target" type="string" required />
      <Option name="count" default={1}>
        <Type.Number min={1} />
      </Option>
    </Argv>
  );
}
