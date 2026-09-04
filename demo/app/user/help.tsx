import { Br, Info, type HelpProps } from 'decopin-cli';

/**
 * グループ単位の上書き (test/contract/routing.test.tsx)。`app/user/` には command.tsx が無いが、
 * help.tsx は置ける
 */
export default function UserHelp({ auto }: HelpProps) {
  return (
    <>
      {auto}
      <Br />
      <Info>users are read from app/_shared/users.ts</Info>
    </>
  );
}
