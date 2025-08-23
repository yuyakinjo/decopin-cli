# Performance Benchmark Report

Generated on: 2025-08-23T15:03:01.856Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 2.72ms
- **Help/Error commands**: 2.64ms
- **Execution commands**: 2.77ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.88 | 2.70 | 4.74 |
| Simple command | 2.76 | 2.63 | 3.23 |
| Subcommand help | 2.66 | 2.63 | 3.03 |
| Command with validation | 2.67 | 2.59 | 2.96 |
| Error handling | 2.62 | 2.57 | 3.16 |

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
| Current | 2025-08-23 | 2.72ms | 2.64ms | 2.77ms |
| 7777767 | 2025-08-23 | 2.70ms | 2.67ms | 2.72ms |
| 5cf7e72 | 2025-08-18 | 2.77ms | 2.72ms | 2.80ms |
| 1ae8f72 | 2025-08-11 | 3.21ms | 3.45ms | 3.06ms |

## Environment Details

```json
{
  "runtime": "Bun 1.2.20",
  "platform": "linux",
  "arch": "x64",
  "cpus": 4,
  "memory": "15.62 GB"
}
```
