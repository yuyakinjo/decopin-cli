import { Stdin } from 'decopin-cli';
import * as v from 'valibot';

/** schema エスケープハッチ (§4.8)。深い JSON を valibot で直接書く */
export default function DefineStdin() {
  return (
    <Stdin
      mode="json"
      required
      schema={v.array(
        v.object({
          name: v.pipe(v.string(), v.minLength(1)),
          tags: v.optional(v.array(v.string())),
          meta: v.record(v.string(), v.string()),
        })
      )}
    />
  );
}
