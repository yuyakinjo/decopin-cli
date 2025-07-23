# Performance Benchmark Report

Generated on: 2025-07-23T10:46:21.810Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.66ms
- **Help/Error commands**: 2.63ms
- **Execution commands**: 2.68ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.79 | 2.70 | 4.65 |
| Simple command | 2.62 | 2.60 | 3.00 |
| Subcommand help | 2.64 | 2.54 | 2.96 |
| Command with validation | 2.63 | 2.59 | 2.95 |
| Error handling | 2.62 | 2.57 | 2.98 |

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
| Current | 2025-07-23 | 2.66ms | 2.63ms | 2.68ms |

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
