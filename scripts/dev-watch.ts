#!/usr/bin/env bun
// @ts-expect-error - Bun built-in module
import { $ } from 'bun';
import { watch } from 'node:fs';
import { join, resolve } from 'node:path';
import { scripts } from '../package.json';

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
    // Use scripts from package.json
    if (scripts.clean) {
      console.log(`🧹 [Build #${currentBuild}] Cleaning...`);
      await $`bun run clean`.quiet();
    }

    // Build TypeScript
    if (scripts.build) {
      console.log(`📦 [Build #${currentBuild}] Building (using 'build' script)...`);
      await $`bun run build`;
    }

    // Build app if separate
    if (scripts['build:app']) {
      console.log(`📱 [Build #${currentBuild}] Building app...`);
      await $`bun run build:app`;
    }

    // Regenerate CLI
    if (scripts['dev:regen']) {
      console.log(`🔧 [Build #${currentBuild}] Regenerating CLI...`);
      await $`bun run dev:regen`;
    }

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
console.log('📦 Available scripts from package.json:');
console.log(`  - clean: ${scripts.clean ? '✓' : '✗'}`);
console.log(`  - build: ${scripts.build ? '✓' : '✗'}`);
console.log(`  - build:app: ${scripts['build:app'] ? '✓' : '✗'}`);
console.log(`  - dev:regen: ${scripts['dev:regen'] ? '✓' : '✗'}`);
console.log('\nPress Ctrl+C to stop\n');

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