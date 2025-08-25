# Performance Benchmark Report

Generated on: 2025-08-25T00:59:35.573Z
Platform: linux x64
Runtime: Bun 1.2.20

## Summary

- **Average startup time**: 3.08ms
- **Help/Error commands**: 2.87ms
- **Execution commands**: 3.21ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
| Help display | 3.75 | 2.86 | 5.44 |
| Simple command | 3.02 | 2.70 | 3.57 |
| Subcommand help | 2.85 | 2.73 | 3.52 |
| Command with validation | 2.87 | 2.72 | 3.41 |
| Error handling | 2.89 | 2.75 | 3.45 |

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
| Current | 2025-08-25 | 3.08ms | 2.87ms | 3.21ms |
| 7d4b458 | 2025-08-23 | 2.90ms | 3.03ms | 2.82ms |
| fb3ee48 | 2025-08-23 | 2.99ms | 2.91ms | 3.04ms |
| 8a708c4 | 2025-08-23 | 2.72ms | 2.64ms | 2.77ms |

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
