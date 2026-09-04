import { choose, help, Line, Success, type CmdProps } from 'decopin-cli';

const TARGETS = ['web', 'api', 'worker'] as const;

/**
 * Without a target: in a terminal, choose() asks (ADR 36); anywhere else
 * (a pipe, an agent) help() shows the usage instead (ADR 30)
 */
export default async function Command({ args, options }: CmdProps<'deploy'>) {
  let target = args.target;
  if (target === undefined && !options.all) {
    try {
      target = await choose('Deploy which target?', TARGETS, {
        hint: 'Pass it as the first argument: deploy <target>',
      });
    } catch (error) {
      // 端末が無い (exit 2 の CliError) ときだけ使い方に切り替える。
      // Esc / Ctrl+C の打ち切りはそのまま上へ
      if (Error.isError(error)) {
        help({ message: 'give a target, or pass --all' });
      }
      throw error;
    }
  }
  return (
    <>
      <Success>deploying {options.all ? 'everything' : target}</Success>
      <Line />
    </>
  );
}
