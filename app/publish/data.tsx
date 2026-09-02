import { authRequired, missingTool, type CommandProps } from 'decopin-cli';

/** Prerequisites belong with the data, before anything is displayed (ADR 31) */
export default function Data({ env }: CommandProps<'publish'>) {
  if (env.DECOPIN_TOKEN === undefined) {
    authRequired({ service: 'the registry', fix: 'export DECOPIN_TOKEN=…' });
  }
  if (Bun.which('definitely-not-installed') === null) {
    missingTool({
      tool: 'definitely-not-installed',
      reason: 'to sign the package',
      install: 'brew install definitely-not-installed',
    });
  }
  return { published: true };
}
