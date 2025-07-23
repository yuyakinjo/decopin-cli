# Performance Benchmark Report

Generated on: 2025-07-23T10:23:04.729Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.66ms
- **Help/Error commands**: 2.62ms
- **Execution commands**: 2.68ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.78 | 2.64 | 4.95 |
| Simple command | 2.64 | 2.57 | 3.00 |
| Subcommand help | 2.66 | 2.61 | 2.97 |
| Command with validation | 2.62 | 2.56 | 2.95 |
| Error handling | 2.59 | 2.58 | 2.63 |

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
