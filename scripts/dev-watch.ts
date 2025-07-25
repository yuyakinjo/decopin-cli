#!/usr/bin/env bun
// @ts-expect-error - Bun built-in module
import { $ } from 'bun';
import { watch } from 'node:fs';
import { join, resolve } from 'node:path';

const rootDir = resolve(process.cwd());
const srcDir = join(rootDir, 'src');
const appDir = join(rootDir, 'app');

let isBuilding = false;
let pendingBuild = false;
let buildCount = 0;

async function buildAndRegen() {
  if (isBuilding) {
    pendingBuild = true;
    return;
  }

  isBuilding = true;
  buildCount++;
  const currentBuild = buildCount;

  console.log(`\n🔄 [Build #${currentBuild}] Building and regenerating CLI...`);

  try {
    // Clean
    await $`rm -rf dist examples`.quiet();

    // Build TypeScript
    console.log(`📦 [Build #${currentBuild}] Compiling TypeScript...`);
    await $`tsc`;
    await $`tsc -p app/tsconfig.json`;
    await $`tsc -p tsconfig.prod.json`;

    // Regenerate CLI
    console.log(`🔧 [Build #${currentBuild}] Regenerating CLI...`);
    await $`bunx tsx src/cli.ts build --app-dir app --output-dir examples --cli-name cli --verbose`;

    console.log(`✅ [Build #${currentBuild}] CLI regeneration complete!\n`);
  } catch (error) {
    console.error(`❌ [Build #${currentBuild}] Build failed:`, error);
  } finally {
    isBuilding = false;

    // If there was a change while building, trigger another build
    if (pendingBuild) {
      pendingBuild = false;
      setTimeout(() => buildAndRegen(), 100);
    }
  }
}

function watchDirectory(dir: string, label: string) {
  console.log(`👀 Watching ${label}: ${dir}`);

  watch(dir, { recursive: true }, (event, filename) => {
    if (filename && filename.endsWith('.ts')) {
      console.log(`📝 Change detected in ${label}: ${filename}`);
      buildAndRegen();
    }
  });
}

console.log('🚀 Starting development mode...');
console.log('⚡ Using Bun for fast TypeScript execution');
console.log('Press Ctrl+C to stop\n');

// Initial build
await buildAndRegen();

// Start watching
watchDirectory(srcDir, 'src/');
watchDirectory(appDir, 'app/');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping development mode...');
  process.exit(0);
});

// Keep the process running
await new Promise(() => {});