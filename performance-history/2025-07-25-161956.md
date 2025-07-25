# Performance Benchmark Report

Generated on: 2025-07-25T16:19:55.742Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.69ms
- **Help/Error commands**: 2.64ms
- **Execution commands**: 2.73ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.89 | 2.68 | 4.73 |
| Simple command | 2.67 | 2.64 | 3.02 |
| Subcommand help | 2.67 | 2.61 | 3.07 |
| Command with validation | 2.64 | 2.60 | 2.96 |
| Error handling | 2.60 | 2.58 | 2.97 |

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
| Current | 2025-07-25 | 2.69ms | 2.64ms | 2.73ms |
| 51c59e8 | 2025-07-23 | 2.72ms | 2.66ms | 2.75ms |
| 6125f57 | 2025-07-23 | 2.77ms | 2.81ms | 2.75ms |
| 9f344a7 | 2025-07-23 | 2.69ms | 2.62ms | 2.73ms |

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
