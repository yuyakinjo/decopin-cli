import { Argv, Arg, Option } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Deploy a target, or everything with --all.">
      <Arg name="target" type="string" description="what to deploy" />
      <Option
        name="all"
        alias="a"
        type="boolean"
        default={false}
        description="deploy everything"
      />
    </Argv>
  );
}
