# Performance Benchmark Report

Generated on: 2025-08-18T00:16:50.595Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 2.77ms
- **Help/Error commands**: 2.72ms
- **Execution commands**: 2.80ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.89 | 2.72 | 5.30 |
| Simple command | 2.79 | 2.73 | 3.54 |
| Subcommand help | 2.73 | 2.70 | 3.17 |
| Command with validation | 2.72 | 2.69 | 3.12 |
| Error handling | 2.70 | 2.67 | 3.09 |

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
| Current | 2025-08-18 | 2.77ms | 2.72ms | 2.80ms |
| ac05fa8 | 2025-08-04 | 2.67ms | 2.64ms | 2.69ms |
| a4fd58c | 2025-08-04 | 2.75ms | 2.68ms | 2.80ms |
| c639def | 2025-08-04 | 2.68ms | 2.63ms | 2.71ms |

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
