import { Line, Text, type CommandProps } from 'decopin-cli';

export default function Command({ stdin }: CommandProps<'user/import'>) {
  return (
    <>
      {stdin.map((user) => (
        <Line key={user.name}>
          {user.name}
          {user.admin ? <Text color="yellow"> (admin)</Text> : null}
        </Line>
      ))}
      <Line>
        <Text dim>imported {stdin.length}</Text>
      </Line>
    </>
  );
}
