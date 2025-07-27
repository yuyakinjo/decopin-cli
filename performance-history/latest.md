# Performance Benchmark Report

Generated on: 2025-07-27T10:02:12.166Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.64ms
- **Help/Error commands**: 2.60ms
- **Execution commands**: 2.66ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.78 | 2.63 | 4.79 |
| Simple command | 2.60 | 2.57 | 3.05 |
| Subcommand help | 2.60 | 2.56 | 2.93 |
| Command with validation | 2.61 | 2.55 | 2.96 |
| Error handling | 2.60 | 2.54 | 2.67 |

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
| Current | 2025-07-27 | 2.64ms | 2.60ms | 2.66ms |
| 11ddda2 | 2025-07-26 | 2.76ms | 2.71ms | 2.80ms |
| fbc77e4 | 2025-07-26 | 2.73ms | 2.74ms | 2.72ms |
| 17ac3ea | 2025-07-25 | 2.71ms | 2.71ms | 2.72ms |

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
