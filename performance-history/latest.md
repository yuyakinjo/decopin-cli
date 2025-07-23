# Performance Benchmark Report

Generated on: 2025-07-23T14:28:10.051Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.77ms
- **Help/Error commands**: 2.81ms
- **Execution commands**: 2.75ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.81 | 2.70 | 5.00 |
| Simple command | 2.77 | 2.63 | 3.14 |
| Subcommand help | 2.73 | 2.67 | 3.04 |
| Command with validation | 2.66 | 2.63 | 3.04 |
| Error handling | 2.89 | 2.68 | 4.13 |

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
| Current | 2025-07-23 | 2.77ms | 2.81ms | 2.75ms |
| 7dd691b | 2025-07-23 | 2.96ms | 2.88ms | 3.01ms |
| b569ad8 | 2025-07-23 | 2.68ms | 2.62ms | 2.72ms |
| 6778f8b | 2025-07-23 | 2.64ms | 2.60ms | 2.67ms |

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
