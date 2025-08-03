# Performance Benchmark Report

Generated on: 2025-08-03T12:15:49.239Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.67ms
- **Help/Error commands**: 2.62ms
- **Execution commands**: 2.70ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.82 | 2.69 | 4.98 |
| Simple command | 2.66 | 2.62 | 3.07 |
| Subcommand help | 2.63 | 2.53 | 3.03 |
| Command with validation | 2.63 | 2.59 | 3.01 |
| Error handling | 2.61 | 2.57 | 2.99 |

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
| Current | 2025-08-03 | 2.67ms | 2.62ms | 2.70ms |
| 337c3ac | 2025-08-01 | 2.65ms | 2.61ms | 2.68ms |
| d3f604d | 2025-08-01 | 2.67ms | 2.64ms | 2.69ms |
| c766270 | 2025-08-01 | 2.73ms | 2.66ms | 2.78ms |

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
