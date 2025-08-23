# Performance Benchmark Report

Generated on: 2025-08-23T14:46:44.111Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 2.70ms
- **Help/Error commands**: 2.67ms
- **Execution commands**: 2.72ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.80 | 2.72 | 4.70 |
| Simple command | 2.67 | 2.61 | 3.04 |
| Subcommand help | 2.71 | 2.65 | 3.11 |
| Command with validation | 2.70 | 2.65 | 3.05 |
| Error handling | 2.63 | 2.61 | 3.11 |

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
| Current | 2025-08-23 | 2.70ms | 2.67ms | 2.72ms |
| 1ae8f72 | 2025-08-11 | 3.21ms | 3.45ms | 3.06ms |
| ac05fa8 | 2025-08-04 | 2.67ms | 2.64ms | 2.69ms |
| a4fd58c | 2025-08-04 | 2.75ms | 2.68ms | 2.80ms |

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
