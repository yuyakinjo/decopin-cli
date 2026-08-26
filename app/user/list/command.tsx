import { Line } from 'decopin-cli';

import { users } from '../../_shared/users.ts';

export default function Command() {
  return (
    <>
      {users.map((user) => (
        <Line key={user}>{user}</Line>
      ))}
    </>
  );
}
