import { Argv, type ArgvDefinition } from 'decopin-cli';

export default function DefineArgv(): ArgvDefinition {
  return <Argv description="Uppercase the text coming from stdin." />;
}
