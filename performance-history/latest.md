# Performance Benchmark Report

Generated on: 2025-08-01T17:39:20.139Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.65ms
- **Help/Error commands**: 2.61ms
- **Execution commands**: 2.68ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.81 | 2.63 | 4.82 |
| Simple command | 2.64 | 2.62 | 3.07 |
| Subcommand help | 2.63 | 2.60 | 3.01 |
| Command with validation | 2.59 | 2.57 | 2.95 |
| Error handling | 2.58 | 2.57 | 2.67 |

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
| Current | 2025-08-01 | 2.65ms | 2.61ms | 2.68ms |
| c766270 | 2025-08-01 | 2.73ms | 2.66ms | 2.78ms |
| 8e00b43 | 2025-07-28 | 2.69ms | 2.66ms | 2.71ms |
| 679a970 | 2025-07-27 | 2.64ms | 2.60ms | 2.66ms |

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
