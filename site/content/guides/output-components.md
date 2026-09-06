---
title: Output components
description: The building blocks a command returns.
---

```tsx
<Line>one line (a newline is appended)</Line>
<Text bold dim italic underline color="green" bg="#333">
  decorated
</Text>
<Br />
<Stdout>
  <Line>this goes to stdout</Line>
</Stdout>
<Stderr>
  <Line>this goes to stderr</Line>
</Stderr>
<Exit code={2} />
```

```tsx
<Indent by={2}>
  <Line>indented</Line>
</Indent>
<Box border="round" title="summary">
  <Line>framed</Line>
</Box>
<Columns gap={4}>
  <Line>left column</Line>
  <Line>right column</Line>
</Columns>
<Success>ok</Success>
<Warn>careful</Warn>
<Info>fyi</Info>
<Danger>failed</Danger>
<List items={['a', 'b']} ordered />
<Table
  columns={['NAME', 'SCORE']}
  rows={[['alice', 42]]}
  align={['left', 'right']}
/>
<KeyValue data={{ version: '0.1.0', routes: 6 }} />
<Json value={{ ok: true }} />
<Line>
  <Link href="https://example.com">docs</Link>
</Line>
```

## Display width

Display width is counted properly, so frames and tables do not drift when the
content is CJK or emoji.

```
╭─ summary ──────────────────────╮
│ decopin-cli v0.1.0             │
│ 日本語も桁がずれない           │
╰────────────────────────────────╯
```

## Colour

Colour turns itself off when it should: piped or redirected output, `NO_COLOR`,
`--no-color`, or `TERM=dumb` (`FORCE_COLOR` forces it back on). `<Line>` never
wraps on its own, so line-oriented consumers downstream keep working.

## Streams

Everything goes to stdout unless wrapped in `<Stderr>`. Errors, progress
([Partial Repainting](/guides/partial-repainting/)) and prompts
([Prompts](/guides/prompts/)) use stderr on their own, so `cli cmd | tee log`
receives only the document.
