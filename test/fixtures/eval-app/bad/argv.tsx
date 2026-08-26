import { Argv, Option } from 'decopin-cli';

/** 短縮形が予約語とぶつかっている (ビルド時に弾かれる) */
export default function DefineArgv() {
  return (
    <Argv>
      <Option name="host" alias="h" type="string" />
    </Argv>
  );
}
