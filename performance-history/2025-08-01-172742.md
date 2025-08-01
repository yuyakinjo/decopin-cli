# Performance Benchmark Report

Generated on: 2025-08-01T17:27:40.442Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.73ms
- **Help/Error commands**: 2.66ms
- **Execution commands**: 2.78ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.90 | 2.72 | 5.08 |
| Simple command | 2.66 | 2.61 | 3.10 |
| Subcommand help | 2.66 | 2.59 | 3.03 |
| Command with validation | 2.77 | 2.67 | 3.10 |
| Error handling | 2.66 | 2.63 | 3.12 |

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
| Current | 2025-08-01 | 2.73ms | 2.66ms | 2.78ms |
| 679a970 | 2025-07-27 | 2.64ms | 2.60ms | 2.66ms |
| 437c2f7 | 2025-07-27 | 2.69ms | 2.67ms | 2.70ms |
| 11ddda2 | 2025-07-26 | 2.76ms | 2.71ms | 2.80ms |

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
