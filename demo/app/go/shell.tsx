import { Shell, type CmdProps, type ShellDefinition } from 'decopin-cli';

// The parent shell runs this after the command succeeds (with the hook from
// `cli __shell zsh` installed). A child process cannot cd for its parent.
export default function ShellChanges({
  data,
}: CmdProps<'go'>): ShellDefinition {
  return (
    <>
      <Shell.Cd to={data.path} />
      <Shell.Export name="DECOPIN_LAST_PLACE" value={data.place} />
    </>
  );
}
