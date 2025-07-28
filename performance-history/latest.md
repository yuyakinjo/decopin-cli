# Performance Benchmark Report

Generated on: 2025-07-28T00:17:14.959Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.69ms
- **Help/Error commands**: 2.66ms
- **Execution commands**: 2.71ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.85 | 2.70 | 4.82 |
| Simple command | 2.67 | 2.64 | 3.12 |
| Subcommand help | 2.72 | 2.62 | 3.02 |
| Command with validation | 2.61 | 2.58 | 2.96 |
| Error handling | 2.59 | 2.53 | 3.01 |

## Performance Characteristics

### Fast Operations (~3ms)
- Help display
- Error handling
- Subcommand help

### Slower Operations (~3ms)
- Command execution
- Parameter validation
- Dynamic imports

## Comparison with Previous Runs

> Note: This section will be populated by GitHub Actions when comparing with previous benchmarks.

### Version History

| Version | Date | Average Startup | Help Commands | Exec Commands |
|---------|------|-----------------|---------------|---------------|
| Current | 2025-07-28 | 2.69ms | 2.66ms | 2.71ms |
| 437c2f7 | 2025-07-27 | 2.69ms | 2.67ms | 2.70ms |
| 11ddda2 | 2025-07-26 | 2.76ms | 2.71ms | 2.80ms |
| fbc77e4 | 2025-07-26 | 2.73ms | 2.74ms | 2.72ms |

## Environment Details

```json
{
  "runtime": "Bun 1.2.19",
  "platform": "linux",
  "arch": "x64",
  "cpus": 4,
  "memory": "15.62 GB"
}
```
