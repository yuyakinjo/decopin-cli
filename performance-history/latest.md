# Performance Benchmark Report

Generated on: 2025-08-03T11:51:10.976Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.68ms
- **Help/Error commands**: 2.65ms
- **Execution commands**: 2.70ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.81 | 2.76 | 4.84 |
| Simple command | 2.65 | 2.63 | 3.03 |
| Subcommand help | 2.66 | 2.58 | 3.03 |
| Command with validation | 2.64 | 2.59 | 2.99 |
| Error handling | 2.64 | 2.57 | 3.21 |

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
| Current | 2025-08-03 | 2.68ms | 2.65ms | 2.70ms |
| d3f604d | 2025-08-01 | 2.67ms | 2.64ms | 2.69ms |
| c766270 | 2025-08-01 | 2.73ms | 2.66ms | 2.78ms |
| 8e00b43 | 2025-07-28 | 2.69ms | 2.66ms | 2.71ms |

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
