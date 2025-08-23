# Performance Benchmark Report

Generated on: 2025-08-23T15:05:30.472Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 2.99ms
- **Help/Error commands**: 2.91ms
- **Execution commands**: 3.04ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 3.13 | 2.83 | 6.36 |
| Simple command | 3.18 | 2.79 | 4.03 |
| Subcommand help | 3.03 | 2.66 | 3.56 |
| Command with validation | 2.81 | 2.73 | 3.25 |
| Error handling | 2.79 | 2.65 | 3.34 |

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
| Current | 2025-08-23 | 2.99ms | 2.91ms | 3.04ms |
| d583647 | 2025-08-23 | 2.70ms | 2.67ms | 2.71ms |
| 7777767 | 2025-08-23 | 2.70ms | 2.67ms | 2.72ms |
| 5cf7e72 | 2025-08-18 | 2.77ms | 2.72ms | 2.80ms |

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
