/**
 * Phase 7 の装飾コンポーネントの見た目を確認する。
 *
 *   bun scripts/demo-decor.tsx            端末幅で
 *   COLUMNS=40 bun scripts/demo-decor.tsx 幅 40 で
 */
import {
  Box,
  Br,
  Columns,
  Danger,
  Indent,
  Info,
  Json,
  KeyValue,
  Line,
  Link,
  List,
  render,
  Success,
  Table,
  Text,
  Warn,
  write,
} from 'decopin-cli';

const columns =
  process.env.COLUMNS === undefined ? undefined : Number(process.env.COLUMNS);

const result = await render(
  <>
    <Success>build finished</Success>
    <Warn>2 files were skipped</Warn>
    <Info>cache is warm</Info>
    <Danger>1 test failed</Danger>
    <Br />
    <Box border="round" title="summary">
      <Line>
        <Text bold>decopin-cli</Text> v0.1.0
      </Line>
      <Line>日本語の幅も数えて枠がずれない</Line>
      <Indent by={2}>
        <Line>
          <Text dim>indented</Text>
        </Line>
      </Indent>
    </Box>
    <Br />
    <Table
      columns={['NAME', 'ROLE', 'SCORE']}
      rows={[
        ['alice', 'admin', 42],
        ['ボブ', 'user', 7],
        ['carol', 'user', 1234],
      ]}
      align={['left', 'left', 'right']}
    />
    <Br />
    <Columns gap={4}>
      <List items={['one', 'two', 'three']} />
      <List items={['first', 'second']} ordered />
    </Columns>
    <Br />
    <KeyValue data={{ version: '0.1.0', routes: 6, unicode: true }} />
    <Br />
    <Json
      value={{ name: 'decopin', tags: ['cli', 'jsx'], ok: true, count: 3 }}
    />
    <Br />
    <Line>
      docs: <Link href="https://example.com/docs">example.com/docs</Link>
    </Line>
  </>,
  { columns, color: { stdout: 4 } }
);
write(result);
