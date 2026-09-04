import { Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Show a small report, with data separate from the view.">
      <Option name="limit" alias="l" description="how many files to list">
        <Type.Number min={1} max={3} integer />
      </Option>
    </Argv>
  );
}
