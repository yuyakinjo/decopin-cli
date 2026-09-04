import { Line, Text, type CmdProps } from 'decopin-cli';

const RAINBOW = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const;

export default function Command({ args, options }: CmdProps<'hello'>) {
  const message = options.loud
    ? `HELLO, ${args.name.toUpperCase()}!`
    : `hello, ${args.name}`;

  return (
    <>
      {Array.from({ length: options.times }, (_, index) => (
        <Line key={index}>
          {options.style === 'rainbow' ? (
            [...message].map((character, position) => (
              <Text
                key={`${character}-${position}`}
                color={RAINBOW[position % RAINBOW.length]}
              >
                {character}
              </Text>
            ))
          ) : (
            <Text bold={options.style === 'bold'}>{message}</Text>
          )}
        </Line>
      ))}
    </>
  );
}
