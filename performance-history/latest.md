# Performance Benchmark Report

Generated on: 2025-07-26T07:30:41.300Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.76ms
- **Help/Error commands**: 2.71ms
- **Execution commands**: 2.80ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.95 | 2.63 | 4.93 |
| Simple command | 2.70 | 2.61 | 3.15 |
| Subcommand help | 2.72 | 2.62 | 3.09 |
| Command with validation | 2.75 | 2.63 | 3.15 |
| Error handling | 2.70 | 2.60 | 3.40 |

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
| Current | 2025-07-26 | 2.76ms | 2.71ms | 2.80ms |
| 17ac3ea | 2025-07-25 | 2.71ms | 2.71ms | 2.72ms |
| 36d4e4c | 2025-07-25 | 2.69ms | 2.64ms | 2.73ms |
| 480c821 | 2025-07-23 | 2.81ms | 2.76ms | 2.84ms |

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
