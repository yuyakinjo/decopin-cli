import { type CmdProps, Line, Text } from 'decopin-cli';

export default function Command({ args, options }: CmdProps<'hello'>) {
  const message = options.loud
    ? `HELLO, ${args.name.toUpperCase()}!`
    : `hello, ${args.name}`;

  return (
    <>
      {Array.from({ length: options.times }, (_, index) => (
        <Line key={index}>
          <Text bold={options.style === 'bold'}>{message}</Text>
        </Line>
      ))}
    </>
  );
}
