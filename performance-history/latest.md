# Performance Benchmark Report

Generated on: 2025-07-27T02:35:28.635Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.69ms
- **Help/Error commands**: 2.67ms
- **Execution commands**: 2.70ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.84 | 2.67 | 4.84 |
| Simple command | 2.68 | 2.63 | 3.07 |
| Subcommand help | 2.65 | 2.62 | 3.00 |
| Command with validation | 2.59 | 2.59 | 2.95 |
| Error handling | 2.69 | 2.61 | 2.98 |

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
| Current | 2025-07-27 | 2.69ms | 2.67ms | 2.70ms |
| fbc77e4 | 2025-07-26 | 2.73ms | 2.74ms | 2.72ms |
| 17ac3ea | 2025-07-25 | 2.71ms | 2.71ms | 2.72ms |
| 36d4e4c | 2025-07-25 | 2.69ms | 2.64ms | 2.73ms |

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
