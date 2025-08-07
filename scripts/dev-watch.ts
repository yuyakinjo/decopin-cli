#!/usr/bin/env bun

import { $ } from 'bun';
import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { scripts } from '../package.json';

const rootDir = resolve(process.cwd());
const watchDirs =  {
  src: resolve(rootDir, 'src'),
  app: resolve(rootDir, 'app'),
  scripts: resolve(rootDir, 'scripts'),
}

const status = {
  isBuilding: false,
  pendingBuild: false,
  buildCount: 0,
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function formatTime() {
  return new Date().toLocaleTimeString('ja-JP', { hour12: false });
}

function clearLine() {
  process.stdout.write('\r\x1b[K');
}

async function buildAndRegen() {
  if (status.isBuilding) {
    status.pendingBuild = true;
    return;
  }

  status.isBuilding = true;
  status.buildCount++;
  const currentBuild = status.buildCount;
  const startTime = Date.now();

  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}🔄 Build #${currentBuild}${colors.reset} ${colors.gray}[${formatTime()}]${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const steps: string[] = [];
  let currentStep = '';

  try {
    if (scripts.build) {
      currentStep = 'Building library';
      process.stdout.write(`${colors.yellow}⏳${colors.reset} ${currentStep}...`);
      await $`bun run build`.quiet();
      clearLine();
      steps.push(`${colors.green}✓${colors.reset} ${currentStep}`);
      console.log(steps[steps.length - 1]);
    }

    if (scripts['build:app']) {
      currentStep = 'Building app';
      process.stdout.write(`${colors.yellow}⏳${colors.reset} ${currentStep}...`);
      await $`bun run build:app`.quiet();
      clearLine();
      steps.push(`${colors.green}✓${colors.reset} ${currentStep}`);
      console.log(steps[steps.length - 1]);
    }

    if (scripts['dev:regen']) {
      currentStep = 'Regenerating CLI';
      process.stdout.write(`${colors.yellow}⏳${colors.reset} ${currentStep}...`);
      await $`bun run dev:regen`.quiet();
      clearLine();
      steps.push(`${colors.green}✓${colors.reset} ${currentStep}`);
      console.log(steps[steps.length - 1]);
    }

    const duration = Date.now() - startTime;
    console.log(`\n${colors.green}${colors.bright}✅ Build complete${colors.reset} ${colors.gray}(${duration}ms)${colors.reset}\n`);
  } catch (error) {
    clearLine();
    console.log(`${colors.red}✗${colors.reset} ${currentStep} ${colors.red}failed${colors.reset}`);
    console.error(`\n${colors.red}${colors.bright}Build failed:${colors.reset}`);
    console.error(error);
    console.log();
  } finally {
    status.isBuilding = false;

    if (status.pendingBuild) {
      status.pendingBuild = false;
      setTimeout(() => buildAndRegen(), 100);
    }
  }
}

function watchDirectory(dir: string, label: string) {
  watch(dir, { recursive: true }, (event, filename) => {
    if (filename && filename.endsWith('.ts')) {
      // 生成されたファイルは無視
      if (filename.includes('generated/') || filename.includes('.d.ts')) {
        return;
      }
      
      console.log(`${colors.blue}📝${colors.reset} ${colors.gray}[${formatTime()}]${colors.reset} ${label}/${filename}`);
      buildAndRegen();
    }
  });
}

console.clear();
console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}║${colors.reset}       ${colors.bright}decopin-cli dev mode${colors.reset}            ${colors.bright}${colors.cyan}║${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.gray}Runtime:${colors.reset} Bun ${process.versions.bun || 'unknown'}`);
console.log(`${colors.gray}Directory:${colors.reset} ${rootDir}\n`);

console.log(`${colors.bright}Watching:${colors.reset}`);
Object.entries(watchDirs).forEach(([label, dir]) => {
  console.log(`  ${colors.blue}•${colors.reset} ${label.padEnd(8)} ${colors.gray}${dir.replace(rootDir, '.')}${colors.reset}`);
});

console.log(`\n${colors.gray}Press Ctrl+C to stop${colors.reset}\n`);

// Run clean only once at startup
if (scripts.clean) {
  process.stdout.write(`${colors.yellow}⏳${colors.reset} Initial cleaning...`);
  await $`bun run clean`.quiet();
  clearLine();
  console.log(`${colors.green}✓${colors.reset} Initial cleaning`);
}

await buildAndRegen();

Object.entries(watchDirs).forEach(([label, dir]) => {
  watchDirectory(dir, label);
});

process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}👋 Stopping...${colors.reset}`);
  process.exit(0);
});

await new Promise(() => {});