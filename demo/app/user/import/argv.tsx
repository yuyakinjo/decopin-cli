import { Argv, type ArgvDefinition } from 'decopin-cli';

export default function DefineArgv(): ArgvDefinition {
  return <Argv description="Import users from JSON on stdin." />;
}
