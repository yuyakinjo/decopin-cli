# Performance Benchmark Report

Generated on: 2025-08-04T00:17:38.384Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.64ms
- **Help/Error commands**: 2.62ms
- **Execution commands**: 2.65ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.75 | 2.67 | 4.92 |
| Simple command | 2.63 | 2.56 | 3.00 |
| Subcommand help | 2.62 | 2.53 | 2.90 |
| Command with validation | 2.59 | 2.52 | 2.92 |
| Error handling | 2.62 | 2.59 | 2.65 |

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
| Current | 2025-08-04 | 2.64ms | 2.62ms | 2.65ms |
| ffa4d6e | 2025-08-03 | 2.68ms | 2.65ms | 2.70ms |
| 337c3ac | 2025-08-01 | 2.65ms | 2.61ms | 2.68ms |
| d3f604d | 2025-08-01 | 2.67ms | 2.64ms | 2.69ms |

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
