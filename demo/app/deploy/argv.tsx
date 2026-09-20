import { Argv, Arg, Option, type ArgvDefinition } from 'decopin-cli';

export default function DefineArgv(): ArgvDefinition {
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
