import { Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="List users.">
      <Option name="limit" alias="n" default={10} description="max rows">
        <Type.Number min={1} integer />
      </Option>
      <Option
        name="verbose"
        alias="v"
        type="boolean"
        default={false}
        description="report how long it took"
      />
      <Option name="tag" description="filter by tag (repeatable)">
        <Type.Array>
          <Type.String minLength={1} />
        </Type.Array>
      </Option>
    </Argv>
  );
}
