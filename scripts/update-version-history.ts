#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs';

interface Version {
  sha: string;
  date: string;
  avg: string;
  help: string;
  exec: string;
}

function parseCSV(csvPath: string): Version[] {
  if (!existsSync(csvPath)) {
    return [];
  }
  
  const content = readFileSync(csvPath, 'utf8');
  const lines = content.trim().split('\n').slice(1); // Skip header
  
  return lines.map(line => {
    const [sha, date, avg, help, exec] = line.split(',');
    return { sha, date, avg, help, exec };
  });
}

function updatePerformanceReport(reportPath: string, versions: Version[]) {
  const content = readFileSync(reportPath, 'utf8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  let inVersionTable = false;
  let foundCurrent = false;
  
  for (const line of lines) {
    if (line.includes('### Version History')) {
      inVersionTable = true;
      newLines.push(line);
    } else if (inVersionTable && line.startsWith('| Current')) {
      foundCurrent = true;
      newLines.push(line);
      
      // Add the last 3 versions (excluding the most recent which is "Current")
      const previousVersions = versions.slice(-4, -1).reverse();
      for (const version of previousVersions) {
        newLines.push(`| ${version.sha} | ${version.date} | ${version.avg}ms | ${version.help}ms | ${version.exec}ms |`);
      }
    } else if (inVersionTable && line.includes('| _Previous versions')) {
      // Skip the placeholder line
      continue;
    } else {
      newLines.push(line);
    }
  }
  
  writeFileSync(reportPath, newLines.join('\n'));
}

// Main execution
const csvPath = process.argv[2] || 'performance-history/versions.csv';
const reportPath = process.argv[3] || 'performance.md';

console.log(`Reading versions from: ${csvPath}`);
console.log(`Updating report: ${reportPath}`);

const versions = parseCSV(csvPath);
if (versions.length > 0) {
  updatePerformanceReport(reportPath, versions);
  console.log(`Updated performance report with ${Math.min(3, versions.length - 1)} previous versions`);
} else {
  console.log('No version history found');
}