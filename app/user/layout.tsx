import { Line, Text, type LayoutProps } from 'decopin-cli';

/** `app/user/` 以下のコマンドの出力を包む (§4.5) */
export default function UserLayout({ children }: LayoutProps) {
  return (
    <>
      <Line>
        <Text bold>USERS</Text>
      </Line>
      {children}
    </>
  );
}
