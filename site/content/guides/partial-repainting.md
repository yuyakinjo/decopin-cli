---
title: Partial Repainting (PPR)
description: Static by default. Opt a region in to repainting over time with <Dynamic>.
---

Output is static by default. When part of it should update over time, a
progress display, a step counter, opt in with `<Dynamic>`. Time is passed
as a stream of values: hand it an async generator, and render a frame from
the latest value.

We call this **Partial Repainting**: the document streams, and dynamic
islands repaint in place. It is the CLI counterpart of Next.js Partial
Prerendering, same acronym, same "static by default, dynamic opt-in"
stance, but a terminal has no build-time render, and the island is redrawn
many times rather than filled once, so the P stands for repainting.

```tsx
import { Dynamic, Line, ProgressBar, Spinner } from 'decopin-cli';

interface Progress {
  step: string;
  done: number;
}

async function* deploySteps(): AsyncGenerator<Progress> {
  yield { step: 'building', done: 0 };
  // ...do the work between yields...
  yield { step: 'pushing', done: 1 };
  yield { step: 'released', done: 2 };
}

export default function Command() {
  return (
    <>
      <Line>deploy started</Line>
      <Dynamic source={deploySteps()} interval={100}>
        {(progress) => (
          <Line>
            <Spinner /> <ProgressBar value={progress.done} max={2} width={16} />{' '}
            {progress.step}
          </Line>
        )}
      </Dynamic>
      <Line>all done</Line>
    </>
  );
}
```

## How the document streams

The document streams top to bottom: static parts flush as soon as they are
reached, the `<Dynamic>` region repaints in place until its source is
exhausted, then the last frame stays put and the rest of the document
follows. `interval` (ms) repaints even without a new value, for frames that
read the clock.

## Cancelling the source

Pass a function instead of an iterable to receive the island's
`AbortSignal`. It is called when the island is reached, and the signal is
aborted when the island ends: the source settles, a frame throws, or the
process receives SIGHUP, SIGINT or SIGTERM while stderr is a TTY. Hand it to `fetch`,
`Bun.spawn` or anything else that waits, so a source stuck on a slow call
still gets to run its `finally`.

```tsx
import { Dynamic, Line } from 'decopin-cli';

async function* watchJob(signal: AbortSignal): AsyncGenerator<string> {
  while (true) {
    const res = await fetch('https://example.com/job', { signal });
    const { state } = (await res.json()) as { state: string };
    yield state;
    if (state === 'done') return;
  }
}

export default function Command() {
  return (
    <Dynamic source={(signal) => watchJob(signal)}>
      {(state) => <Line>{state}</Line>}
    </Dynamic>
  );
}
```

## Where the region lives

The region lives on **stderr**, following the Unix convention for progress
decoration (like curl and cargo), so `cli deploy | tee log` stays clean:
stdout carries only the static document. When stderr is not a TTY (pipes,
CI), intermediate frames are skipped entirely and only the final frame is
written once.

While the island is live, frames taller than the terminal are trimmed to fit,
keeping the tail (the latest lines) and replacing the dropped head with a
single `… (N more lines)` marker. Once the source settles, the final frame is
written in full, so the settled output matches what a pipe would receive.

`<Dynamic>` must sit at the top level of the command output, not inside
`<Line>`, `<Box>`, `<Columns>`, or `<Indent>`.

## Spinner and ProgressBar

`<Spinner>` and `<ProgressBar>` are ordinary inline components, so compose
them inside a `<Line>` with anything else. The spinner advances on each
repaint rather than reading the clock, which keeps frames a pure function of
their input: the same input always renders the same output, and animation
falls out of the repaint loop (pair it with `interval`). In static output a
spinner simply shows its first frame. Both fall back to ASCII (`|/-\\`, `#-`)
when the terminal is not UTF-8.
