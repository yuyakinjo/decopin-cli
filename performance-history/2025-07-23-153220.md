# Performance Benchmark Report

Generated on: 2025-07-23T15:32:18.506Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.72ms
- **Help/Error commands**: 2.66ms
- **Execution commands**: 2.75ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.92 | 2.81 | 4.83 |
| Simple command | 2.67 | 2.62 | 3.13 |
| Subcommand help | 2.67 | 2.59 | 3.21 |
| Command with validation | 2.66 | 2.60 | 2.97 |
| Error handling | 2.66 | 2.60 | 3.60 |

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
| Current | 2025-07-23 | 2.72ms | 2.66ms | 2.75ms |
| 9f344a7 | 2025-07-23 | 2.69ms | 2.62ms | 2.73ms |
| 7dd691b | 2025-07-23 | 2.96ms | 2.88ms | 3.01ms |
| b569ad8 | 2025-07-23 | 2.68ms | 2.62ms | 2.72ms |

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
