---
title: Versioning
description: Versions are timestamps, and what that means for ^ and ~.
---

Versions are timestamps, not SemVer: `YYYY.MMdd.HHmm` in UTC. `2026.828.1430`
was published on 2026-08-28 at 14:30 UTC.

**This changes what `^` and `~` mean for you.** `^2026.828.1430` allows anything
below `2027.0.0`, and `~2026.828.1430` allows anything later that same day. Pin
the exact version if that matters to you.

```jsonc
"decopin-cli": "2026.828.1430"   // exactly this one
```

## Breaking changes

A version number is a date, so it cannot tell you whether an upgrade is safe.
Instead:

- nothing is removed without warning. It is deprecated first, keeps working,
  and is removed **one year later**
- `decopin build` warns when your code uses something deprecated, and tells you
  what to use instead and by when
- every GitHub Release lists breaking changes and pending removals at the top

## Currently deprecated

| Deprecated    | Use instead                                                            | Removed after |
| ------------- | ---------------------------------------------------------------------- | ------------- |
| `Type.Date`   | `<Type.Instant/>` for a moment, `<Type.PlainDate/>` for a calendar day | 2027-08-29    |
| `command.tsx` | `cmd.tsx` (`command.ts` → `cmd.ts`)                                    | 2027-09-02    |
