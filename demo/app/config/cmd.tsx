import { Box, KeyValue, type CmdProps } from 'decopin-cli';

export default function Command({ env }: CmdProps<'config'>) {
  return (
    <Box border="round" title="config">
      <KeyValue
        data={{
          log: env.DECOPIN_LOG,
          retries: env.DECOPIN_RETRIES,
          token: env.DECOPIN_TOKEN ?? '(not set)',
        }}
      />
    </Box>
  );
}
