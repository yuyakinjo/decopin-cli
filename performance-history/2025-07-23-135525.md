# Performance Benchmark Report

Generated on: 2025-07-23T13:55:23.855Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.68ms
- **Help/Error commands**: 2.62ms
- **Execution commands**: 2.72ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.78 | 2.71 | 4.70 |
| Simple command | 2.72 | 2.65 | 3.04 |
| Subcommand help | 2.64 | 2.61 | 3.02 |
| Command with validation | 2.66 | 2.58 | 2.98 |
| Error handling | 2.60 | 2.55 | 2.99 |

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
| Current | 2025-07-23 | 2.68ms | 2.62ms | 2.72ms |
| d6fa57f | 2025-07-23 | 2.66ms | 2.63ms | 2.68ms |
| 56e0294 | 2025-07-23 | 2.68ms | 2.65ms | 2.70ms |

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
