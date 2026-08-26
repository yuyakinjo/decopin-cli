import { Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="List users.">
      <Option name="limit" alias="n" default={10} description="max rows">
        <Type.Number min={1} integer />
      </Option>
      <Option name="tag" description="filter by tag (repeatable)">
        <Type.Array>
          <Type.String minLength={1} />
        </Type.Array>
      </Option>
    </Argv>
  );
}
