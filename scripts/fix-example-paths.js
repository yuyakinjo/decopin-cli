#!/usr/bin/env node

/**
 * Fix import paths in the generated examples/cli.js file
 * This script updates the import paths from './app/' to './' since
 * the compiled files are directly in the examples directory
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, '..', 'examples', 'cli.js');

try {
  let content = readFileSync(cliPath, 'utf-8');

  // Replace import('../app/' with import('./' since files are in examples directory
  content = content.replace(/import\('\.\.\/app\//g, "import('./");

  // Replace import('app/' with import('./'
  content = content.replace(/import\('app\//g, "import('./");

  // Replace import('./app/' with import('./'
  content = content.replace(/import\('\.\/app\//g, "import('./");

  writeFileSync(cliPath, content, 'utf-8');
  console.log('✅ Fixed import paths in examples/cli.js');
} catch (error) {
  console.error('❌ Failed to fix import paths:', error.message);
  process.exit(1);
}