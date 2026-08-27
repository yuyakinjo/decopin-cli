import { Stdin, Type } from 'decopin-cli';

/** JSON の構造も Type.* で宣言できる (ADR 2) */
export default function DefineStdin() {
  return (
    <Stdin mode="json" required>
      <Type.Array minItems={1}>
        <Type.Object>
          <Type.Field name="name" required>
            <Type.String minLength={1} />
          </Type.Field>
          <Type.Field name="admin" defaultValue={false}>
            <Type.Boolean />
          </Type.Field>
        </Type.Object>
      </Type.Array>
    </Stdin>
  );
}
