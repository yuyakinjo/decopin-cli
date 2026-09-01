import { help, Line, Success, type CommandProps } from 'decopin-cli';

/** help() shows this command's usage when the input cannot be acted on (ADR 30) */
export default function Command({ args, options }: CommandProps<'deploy'>) {
  if (args.target === undefined && !options.all) {
    help({ message: 'give a target, or pass --all' });
  }
  return (
    <>
      <Success>deploying {options.all ? 'everything' : args.target}</Success>
      <Line />
    </>
  );
}
