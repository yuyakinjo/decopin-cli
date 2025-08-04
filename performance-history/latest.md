# Performance Benchmark Report

Generated on: 2025-08-04T17:30:51.624Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.67ms
- **Help/Error commands**: 2.64ms
- **Execution commands**: 2.69ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.81 | 2.74 | 4.77 |
| Simple command | 2.64 | 2.60 | 3.04 |
| Subcommand help | 2.67 | 2.57 | 3.00 |
| Command with validation | 2.63 | 2.60 | 2.99 |
| Error handling | 2.61 | 2.56 | 3.07 |

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
| Current | 2025-08-04 | 2.67ms | 2.64ms | 2.69ms |
| c639def | 2025-08-04 | 2.68ms | 2.63ms | 2.71ms |
| ad76a10 | 2025-08-04 | 2.64ms | 2.62ms | 2.65ms |
| 9671d5f | 2025-08-03 | 2.67ms | 2.62ms | 2.70ms |

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
