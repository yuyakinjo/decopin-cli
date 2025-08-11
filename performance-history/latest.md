# Performance Benchmark Report

Generated on: 2025-08-11T00:16:55.188Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 3.21ms
- **Help/Error commands**: 3.45ms
- **Execution commands**: 3.06ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 3.07 | 2.82 | 5.66 |
| Simple command | 3.04 | 2.76 | 3.30 |
| Subcommand help | 3.06 | 2.74 | 3.58 |
| Command with validation | 3.05 | 2.76 | 3.68 |
| Error handling | 3.83 | 3.40 | 4.42 |

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
| Current | 2025-08-11 | 3.21ms | 3.45ms | 3.06ms |
| a4fd58c | 2025-08-04 | 2.75ms | 2.68ms | 2.80ms |
| c639def | 2025-08-04 | 2.68ms | 2.63ms | 2.71ms |
| ad76a10 | 2025-08-04 | 2.64ms | 2.62ms | 2.65ms |

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
