import { Box, KeyValue, type CommandProps } from 'decopin-cli';

export default function Command({ env }: CommandProps<'config'>) {
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
