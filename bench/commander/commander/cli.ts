import { styleText } from 'node:util';

import { Command, InvalidArgumentError, Option } from 'commander';

function parseTimes(value: string): number {
  const times = Number(value);
  if (!Number.isInteger(times) || times < 1 || times > 5) {
    throw new InvalidArgumentError('Expected an integer from 1 to 5.');
  }
  return times;
}

const program = new Command('commander-cli');

program
  .command('hello')
  .description('Greet someone.')
  .argument('[name]', 'who to greet', 'world')
  .option('-l, --loud', 'shout it', false)
  .option('-t, --times <number>', 'repeat count', parseTimes, 1)
  .addOption(
    new Option('--style <style>', 'how to decorate')
      .choices(['plain', 'bold'])
      .default('plain')
  )
  .action(
    (
      name: string,
      options: { loud: boolean; times: number; style: 'plain' | 'bold' }
    ) => {
      const message = options.loud
        ? `HELLO, ${name.toUpperCase()}!`
        : `hello, ${name}`;
      const line =
        options.style === 'bold' ? styleText('bold', message) : message;
      for (let index = 0; index < options.times; index += 1) {
        console.log(line);
      }
    }
  );

program.parse();
