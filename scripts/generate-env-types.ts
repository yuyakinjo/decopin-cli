#!/usr/bin/env bunx tsx
import { generateEnvTypes } from '../src/generator/env-types-generator.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

const projectRoot = path.resolve(process.cwd());
const envFilePath = path.join(projectRoot, 'app', 'env.ts');
const outputPath = path.join(projectRoot, 'app', 'generated', 'env-types.ts');

// env.tsが存在するか確認
if (!fs.existsSync(envFilePath)) {
  console.log('ℹ️  No env.ts file found, skipping type generation');
  process.exit(0);
}

try {
  generateEnvTypes(envFilePath, outputPath);
  console.log('✅ Environment types generated successfully');
} catch (error) {
  console.error('❌ Failed to generate environment types:', error);
  process.exit(1);
}