#!/usr/bin/env node

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(dirname(__dirname), 'examples/cli.js');

interface Measurement {
  description: string;
  command: string;
  average: number;
  min: number;
  max: number;
  measurements: number[];
}

interface Scenario {
  command: string;
  description: string;
}

interface JsonOutput {
  timestamp: string;
  averageStartup: number;
  averageHelp: number;
  averageExec: number;
  results: Array<{
    description: string;
    average: number;
    min: number;
    max: number;
  }>;
}

// Helper to measure execution time
function measureCommand(command: string, description: string): Measurement {
  const measurements: number[] = [];

  // Run multiple times to get average
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    try {
      execSync(`bun run ${CLI_PATH} ${command}`, {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
      });
    } catch (e) {
      // Ignore errors for now, we're measuring performance
    }
    const end = performance.now();
    measurements.push(end - start);
  }

  // Remove outliers (first run might be slower)
  measurements.sort((a, b) => a - b);
  const trimmed = measurements.slice(1, -1);
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;

  return {
    description,
    command,
    average: avg,
    min: Math.min(...measurements),
    max: Math.max(...measurements),
    measurements
  };
}

// Test scenarios
const scenarios: Scenario[] = [
  { command: '--help', description: 'Help display' },
  { command: 'hello "World"', description: 'Simple command' },
  { command: 'user --help', description: 'Subcommand help' },
  { command: 'user create --name "John" --email "john@example.com"', description: 'Command with validation' },
  { command: 'nonexistent', description: 'Error handling' },
];

// Run benchmarks
const results: Measurement[] = scenarios.map(scenario =>
  measureCommand(scenario.command, scenario.description)
);

// Calculate statistics
const avgStartup = results.reduce((sum, r) => sum + r.average, 0) / results.length;
const helpCommands = results.filter(r => r.description.includes('help') || r.description.includes('Error'));
const execCommands = results.filter(r => !r.description.includes('help') && !r.description.includes('Error'));
const avgHelp = helpCommands.reduce((sum, r) => sum + r.average, 0) / helpCommands.length;
const avgExec = execCommands.reduce((sum, r) => sum + r.average, 0) / execCommands.length;

// Generate markdown report
const markdown = `# Performance Benchmark Report

Generated on: ${new Date().toISOString()}
Platform: ${process.platform} ${process.arch}
Runtime: Bun ${process.versions.bun || 'unknown'}

## Summary

- **Average startup time**: ${avgStartup.toFixed(2)}ms
- **Help/Error commands**: ${avgHelp.toFixed(2)}ms
- **Execution commands**: ${avgExec.toFixed(2)}ms

## Detailed Results

| Command | Average (ms) | Min (ms) | Max (ms) |
|---------|-------------|----------|----------|
${results.map(r => `| ${r.description} | ${r.average.toFixed(2)} | ${r.min.toFixed(2)} | ${r.max.toFixed(2)} |`).join('\n')}

## Performance Characteristics

### Fast Operations (~${avgHelp.toFixed(0)}ms)
- Help display
- Error handling
- Subcommand help

### Slower Operations (~${avgExec.toFixed(0)}ms)
- Command execution
- Parameter validation
- Dynamic imports

## Comparison with Previous Runs

> Note: This section will be populated by GitHub Actions when comparing with previous benchmarks.

### Version History

| Version | Date | Average Startup | Help Commands | Exec Commands |
|---------|------|-----------------|---------------|---------------|
| Current | ${new Date().toISOString().split('T')[0]} | ${avgStartup.toFixed(2)}ms | ${avgHelp.toFixed(2)}ms | ${avgExec.toFixed(2)}ms |
| _Previous versions will be added by CI_ | | | | |

## Environment Details

\`\`\`json
{
  "runtime": "Bun ${process.versions.bun || 'unknown'}",
  "platform": "${process.platform}",
  "arch": "${process.arch}",
  "cpus": ${os.cpus().length},
  "memory": "${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB"
}
\`\`\`
`;

// Write to file
const outputPath: string = process.argv[2] || 'performance.md';
writeFileSync(outputPath, markdown);

console.log(`Performance report written to: ${outputPath}`);

// Also output JSON for GitHub Actions
const jsonOutput: JsonOutput = {
  timestamp: new Date().toISOString(),
  averageStartup: avgStartup,
  averageHelp: avgHelp,
  averageExec: avgExec,
  results: results.map(r => ({
    description: r.description,
    average: r.average,
    min: r.min,
    max: r.max
  }))
};

console.log('::performance-data::' + JSON.stringify(jsonOutput));