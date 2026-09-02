import { Output, Type } from 'decopin-cli';

/**
 * The shape `data.tsx` promises. Declaring it here makes it the source of
 * truth for the `data` prop's type, and checks the value at runtime (ADR 28).
 */
export default function DefineOutput() {
  return (
    <Output>
      <Type.Object>
        <Type.Field name="counted" required>
          <Type.Number min={0} integer />
        </Type.Field>
        <Type.Field name="total" required>
          <Type.Number min={0} integer />
        </Type.Field>
        <Type.Field name="files" required>
          <Type.Array>
            <Type.String minLength={1} />
          </Type.Array>
        </Type.Field>
      </Type.Object>
    </Output>
  );
}
