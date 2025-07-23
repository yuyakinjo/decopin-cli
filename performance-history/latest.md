# Performance Benchmark Report

Generated on: 2025-07-23T14:13:22.163Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.69ms
- **Help/Error commands**: 2.62ms
- **Execution commands**: 2.73ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.84 | 2.63 | 5.06 |
| Simple command | 2.71 | 2.57 | 3.04 |
| Subcommand help | 2.63 | 2.56 | 3.01 |
| Command with validation | 2.64 | 2.59 | 2.95 |
| Error handling | 2.61 | 2.55 | 3.09 |

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
| Current | 2025-07-23 | 2.69ms | 2.62ms | 2.73ms |
| b569ad8 | 2025-07-23 | 2.68ms | 2.62ms | 2.72ms |
| 6778f8b | 2025-07-23 | 2.64ms | 2.60ms | 2.67ms |
| d6fa57f | 2025-07-23 | 2.66ms | 2.63ms | 2.68ms |

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
