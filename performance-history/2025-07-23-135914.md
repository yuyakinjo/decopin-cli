# Performance Benchmark Report

Generated on: 2025-07-23T13:59:13.468Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.96ms
- **Help/Error commands**: 2.88ms
- **Execution commands**: 3.01ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 3.14 | 2.94 | 5.54 |
| Simple command | 2.89 | 2.85 | 3.30 |
| Subcommand help | 2.87 | 2.79 | 3.49 |
| Command with validation | 2.99 | 2.87 | 3.47 |
| Error handling | 2.90 | 2.80 | 3.29 |

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
| Current | 2025-07-23 | 2.96ms | 2.88ms | 3.01ms |
| 6778f8b | 2025-07-23 | 2.64ms | 2.60ms | 2.67ms |
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
