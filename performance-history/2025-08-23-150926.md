# Performance Benchmark Report

Generated on: 2025-08-23T15:09:24.848Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 2.90ms
- **Help/Error commands**: 3.03ms
- **Execution commands**: 2.82ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.99 | 2.77 | 5.03 |
| Simple command | 2.72 | 2.68 | 3.21 |
| Subcommand help | 2.84 | 2.65 | 3.51 |
| Command with validation | 2.73 | 2.67 | 3.12 |
| Error handling | 3.21 | 2.70 | 4.20 |

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
| Current | 2025-08-23 | 2.90ms | 3.03ms | 2.82ms |
| 8a708c4 | 2025-08-23 | 2.72ms | 2.64ms | 2.77ms |
| d583647 | 2025-08-23 | 2.70ms | 2.67ms | 2.71ms |
| 7777767 | 2025-08-23 | 2.70ms | 2.67ms | 2.72ms |

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
