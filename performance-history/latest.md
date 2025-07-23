# Performance Benchmark Report

Generated on: 2025-07-23T10:44:29.379Z
Platform: linux x64
Runtime: Bun 1.2.19

## Summary

- **Average startup time**: 2.68ms
- **Help/Error commands**: 2.65ms
- **Execution commands**: 2.70ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 2.82 | 2.67 | 4.90 |
| Simple command | 2.64 | 2.57 | 3.02 |
| Subcommand help | 2.65 | 2.59 | 2.98 |
| Command with validation | 2.65 | 2.64 | 2.96 |
| Error handling | 2.65 | 2.61 | 3.00 |

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
| Current | 2025-07-23 | 2.68ms | 2.65ms | 2.70ms |
| _Previous versions will be added by CI_ | | | | |

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
