# Performance Benchmark Report

Generated on: 2025-07-23T13:47:48.721Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.64ms
- **Help/Error commands**: 2.60ms
- **Execution commands**: 2.67ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.79 | 2.63 | 4.76 |
| Simple command | 2.62 | 2.57 | 2.97 |
| Subcommand help | 2.62 | 2.57 | 2.93 |
| Command with validation | 2.59 | 2.57 | 2.93 |
| Error handling | 2.58 | 2.54 | 2.63 |

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
| Current | 2025-07-23 | 2.64ms | 2.60ms | 2.67ms |
| 56e0294 | 2025-07-23 | 2.68ms | 2.65ms | 2.70ms |

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
