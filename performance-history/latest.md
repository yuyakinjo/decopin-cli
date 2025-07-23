# Performance Benchmark Report

Generated on: 2025-07-23T15:45:43.777Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.81ms
- **Help/Error commands**: 2.76ms
- **Execution commands**: 2.84ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.95 | 2.81 | 5.28 |
| Simple command | 2.76 | 2.75 | 3.24 |
| Subcommand help | 2.77 | 2.71 | 3.26 |
| Command with validation | 2.81 | 2.74 | 3.72 |
| Error handling | 2.75 | 2.72 | 3.21 |

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
| Current | 2025-07-23 | 2.81ms | 2.76ms | 2.84ms |
| 6125f57 | 2025-07-23 | 2.77ms | 2.81ms | 2.75ms |
| 9f344a7 | 2025-07-23 | 2.69ms | 2.62ms | 2.73ms |
| 7dd691b | 2025-07-23 | 2.96ms | 2.88ms | 3.01ms |

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
