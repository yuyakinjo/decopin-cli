# Performance Benchmark Report

Generated on: 2025-07-25T16:46:29.397Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.71ms
- **Help/Error commands**: 2.71ms
- **Execution commands**: 2.72ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.81 | 2.69 | 5.12 |
| Simple command | 2.65 | 2.61 | 3.17 |
| Subcommand help | 2.71 | 2.60 | 3.27 |
| Command with validation | 2.69 | 2.62 | 3.03 |
| Error handling | 2.70 | 2.61 | 3.40 |

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
| Current | 2025-07-25 | 2.71ms | 2.71ms | 2.72ms |
| 480c821 | 2025-07-23 | 2.81ms | 2.76ms | 2.84ms |
| 51c59e8 | 2025-07-23 | 2.72ms | 2.66ms | 2.75ms |
| 6125f57 | 2025-07-23 | 2.77ms | 2.81ms | 2.75ms |

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
