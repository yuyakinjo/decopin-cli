import { Line, Text } from 'decopin-cli';

import { users } from '../../_shared/users.ts';

interface Props {
  options: { limit: number; tag?: string[] };
}

export default function Command({ options }: Props) {
  const shown = users.slice(0, options.limit);
  return (
    <>
      {shown.map((user) => (
        <Line key={user}>{user}</Line>
      ))}
      {options.tag === undefined ? null : (
        <Line>
          <Text dim>filtered by: {options.tag.join(', ')}</Text>
        </Line>
      )}
    </>
  );
}
