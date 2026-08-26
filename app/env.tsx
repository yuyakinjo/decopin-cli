import { Env, Type, Var } from 'decopin-cli';

/** 起動時に一度だけ検証される (§4.7) */
export default function DefineEnv() {
  return (
    <Env>
      <Var name="DECOPIN_LOG" default="info" description="log level">
        <Type.Enum values={['debug', 'info', 'warn', 'error']} />
      </Var>
      <Var
        name="DECOPIN_RETRIES"
        default={3}
        description="how many times to retry"
      >
        <Type.Number min={0} max={10} integer />
      </Var>
      <Var
        name="DECOPIN_TOKEN"
        type="string"
        description="API token (optional)"
      />
    </Env>
  );
}
