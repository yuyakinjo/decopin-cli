# Performance Benchmark Report

Generated on: 2025-08-25T00:15:31.463Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 2.69ms
- **Help/Error commands**: 2.65ms
- **Execution commands**: 2.72ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.84 | 2.64 | 5.09 |
| Simple command | 2.65 | 2.58 | 3.01 |
| Subcommand help | 2.62 | 2.61 | 2.99 |
| Command with validation | 2.67 | 2.57 | 2.99 |
| Error handling | 2.67 | 2.62 | 2.99 |

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
| Current | 2025-08-25 | 2.69ms | 2.65ms | 2.72ms |
| fb3ee48 | 2025-08-23 | 2.99ms | 2.91ms | 3.04ms |
| 8a708c4 | 2025-08-23 | 2.72ms | 2.64ms | 2.77ms |
| d583647 | 2025-08-23 | 2.70ms | 2.67ms | 2.71ms |

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
