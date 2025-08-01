# Performance Benchmark Report

Generated on: 2025-08-01T17:28:06.616Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.67ms
- **Help/Error commands**: 2.64ms
- **Execution commands**: 2.69ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.79 | 2.70 | 4.67 |
| Simple command | 2.67 | 2.60 | 3.02 |
| Subcommand help | 2.65 | 2.60 | 3.00 |
| Command with validation | 2.61 | 2.57 | 3.01 |
| Error handling | 2.63 | 2.57 | 2.94 |

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
| Current | 2025-08-01 | 2.67ms | 2.64ms | 2.69ms |
| 8e00b43 | 2025-07-28 | 2.69ms | 2.66ms | 2.71ms |
| 679a970 | 2025-07-27 | 2.64ms | 2.60ms | 2.66ms |
| 437c2f7 | 2025-07-27 | 2.69ms | 2.67ms | 2.70ms |

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
