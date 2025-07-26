# Performance Benchmark Report

Generated on: 2025-07-26T00:37:28.185Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.73ms
- **Help/Error commands**: 2.74ms
- **Execution commands**: 2.72ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.83 | 2.73 | 4.95 |
| Simple command | 2.66 | 2.62 | 3.07 |
| Subcommand help | 2.81 | 2.63 | 3.14 |
| Command with validation | 2.66 | 2.64 | 2.98 |
| Error handling | 2.67 | 2.60 | 3.08 |

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
| Current | 2025-07-26 | 2.73ms | 2.74ms | 2.72ms |
| 36d4e4c | 2025-07-25 | 2.69ms | 2.64ms | 2.73ms |
| 480c821 | 2025-07-23 | 2.81ms | 2.76ms | 2.84ms |
| 51c59e8 | 2025-07-23 | 2.72ms | 2.66ms | 2.75ms |

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
