import type { ConventionFile } from '../../features/conventions/index.ts';
import type { RootOnlyFile } from '../../features/root-only/index.ts';

/** 全規約を網羅する。継承ファイルは同じ雛形を共有する。 */
export const FILE_TEMPLATES: Record<ConventionFile | RootOnlyFile, string> = {
  cmd: `import { Line } from 'decopin-cli';

export default function Command() {
  return <Line>Hello, world!</Line>;
}
`,
  argv: `import { Argv } from 'decopin-cli';

export default function DefineArgv() {
  return <Argv description="Describe this command." />;
}
`,
  stdin: `import { Stdin } from 'decopin-cli';

export default function DefineStdin() {
  return <Stdin mode="text" trim />;
}
`,
  data: `export default function Data() {
  return {};
}
`,
  output: `import { Output, Type } from 'decopin-cli';

export default function DefineOutput() {
  return (
    <Output>
      <Type.Object>
        <Type.Field name="message"><Type.String /></Type.Field>
      </Type.Object>
    </Output>
  );
}
`,
  error: `import { Danger, type ErrorProps } from 'decopin-cli';

export default function Error({ error }: ErrorProps) {
  return <Danger>{error.message}</Danger>;
}
`,
  'not-found': `import { NotFound, type NotFoundProps } from 'decopin-cli';

export default function HandleNotFound(props: NotFoundProps) {
  return <NotFound {...props} />;
}
`,
  layout: `import type { LayoutProps } from 'decopin-cli';

export default function Layout({ children }: LayoutProps) {
  return children;
}
`,
  middleware: `import type { MiddlewareProps } from 'decopin-cli';

export default async function Middleware({ next }: MiddlewareProps) {
  return await next();
}
`,
  help: `import type { HelpProps } from 'decopin-cli';

export default function Help({ auto }: HelpProps) {
  return auto;
}
`,
  shell: `export default function ShellChanges() {
  return null;
}
`,
  complete: `import type { Candidate } from 'decopin-cli';

export default function Complete(): Candidate[] {
  return [];
}
`,
  example: `import type { CommandExample } from 'decopin-cli';

export default function Example(): CommandExample[] {
  return [{ args: [], description: 'show the default output' }];
}
`,
  env: `import { Env, Var } from 'decopin-cli';

export default function DefineEnv() {
  return (
    <Env>
      <Var name="LOG_LEVEL" type="string" default="info" description="Log level" />
    </Env>
  );
}
`,
  version: `import { Version } from 'decopin-cli';

export default function DefineVersion() {
  return <Version version="0.0.0" />;
}
`,
  'global-error': `import { Danger, type ErrorProps } from 'decopin-cli';

export default function GlobalError({ error }: ErrorProps) {
  return <Danger>{error.message}</Danger>;
}
`,
};
