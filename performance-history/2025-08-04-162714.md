# Performance Benchmark Report

Generated on: 2025-08-04T16:27:13.277Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.75ms
- **Help/Error commands**: 2.68ms
- **Execution commands**: 2.80ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.96 | 2.81 | 5.24 |
| Simple command | 2.72 | 2.64 | 3.22 |
| Subcommand help | 2.69 | 2.60 | 3.21 |
| Command with validation | 2.70 | 2.64 | 3.10 |
| Error handling | 2.66 | 2.59 | 3.10 |

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
| Current | 2025-08-04 | 2.75ms | 2.68ms | 2.80ms |
| ad76a10 | 2025-08-04 | 2.64ms | 2.62ms | 2.65ms |
| 9671d5f | 2025-08-03 | 2.67ms | 2.62ms | 2.70ms |
| ffa4d6e | 2025-08-03 | 2.68ms | 2.65ms | 2.70ms |

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
