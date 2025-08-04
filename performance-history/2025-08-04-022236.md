# Performance Benchmark Report

Generated on: 2025-08-04T02:22:35.091Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.68ms
- **Help/Error commands**: 2.63ms
- **Execution commands**: 2.71ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.79 | 2.68 | 4.78 |
| Simple command | 2.67 | 2.62 | 3.01 |
| Subcommand help | 2.64 | 2.58 | 2.93 |
| Command with validation | 2.67 | 2.59 | 2.95 |
| Error handling | 2.61 | 2.59 | 2.96 |

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
| Current | 2025-08-04 | 2.68ms | 2.63ms | 2.71ms |
| 9671d5f | 2025-08-03 | 2.67ms | 2.62ms | 2.70ms |
| ffa4d6e | 2025-08-03 | 2.68ms | 2.65ms | 2.70ms |
| 337c3ac | 2025-08-01 | 2.65ms | 2.61ms | 2.68ms |

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
