import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getVersionInfo,
  hasVersionFile,
  parseVersionFile,
} from './version-parser.js';

describe('Version Parser', () => {
  const testAppDir = join(process.cwd(), 'test-app-version');

  beforeEach(async () => {
    await mkdir(testAppDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testAppDir, { recursive: true, force: true });
  });

  it('should detect version file exists', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "1.0.0"
    `
    );

    const exists = await hasVersionFile(testAppDir);
    expect(exists).toBe(true);
  });

  it('should detect version file does not exist', async () => {
    const exists = await hasVersionFile(testAppDir);
    expect(exists).toBe(false);
  });

  it('should parse simple version export', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "1.2.3"
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '1.2.3',
    });
  });

  it('should parse version with metadata', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "2.0.0"

export const metadata = {
  name: "awesome-cli",
  description: "An awesome CLI tool",
  author: "Developer"
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '2.0.0',
      metadata: {
        name: 'awesome-cli',
        description: 'An awesome CLI tool',
        author: 'Developer',
      },
    });
  });

  it('should parse default export version', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default "3.1.0"
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '3.1.0',
    });
  });

  it('should prefer named export over default export', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "1.0.0"
export default "2.0.0"
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '1.0.0',
    });
  });

  it('should handle complex metadata', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "1.5.2"

export const metadata = {
  name: "complex-cli",
  version: "1.5.2",
  description: "A complex CLI with many features",
  author: "Team Lead",
  repository: "https://github.com/example/complex-cli",
  license: "MIT",
  keywords: ["cli", "tool", "awesome"]
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '1.5.2',
      metadata: {
        name: 'complex-cli',
        description: 'A complex CLI with many features',
        author: 'Team Lead',
        repository: 'https://github.com/example/complex-cli',
        license: 'MIT',
        keywords: ['cli', 'tool', 'awesome'],
      },
    });
  });

  it('should handle syntax errors gracefully', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "1.0.0"
// Syntax error
export const metadata = {
  name: "broken-cli"
  // Missing comma and closing brace
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors.length).toBeGreaterThan(0);
    // Note: TypeScript parser may still extract some valid parts
    // So we just verify that errors are detected
  });

  it('should warn when no version info found', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
// No version exports
export const other = "something"
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.warnings).toContain(
      'No version information found in version.ts'
    );
    expect(result.versionInfo).toBeNull();
  });

  it('should warn when version file not found', async () => {
    const result = await parseVersionFile(testAppDir);

    expect(result.warnings).toContain(
      'version.ts file not found in app directory'
    );
    expect(result.versionInfo).toBeNull();
  });

  it('should get version info with fallback', async () => {
    const versionInfo = await getVersionInfo(testAppDir, '0.5.0');

    expect(versionInfo).toMatchObject({
      version: '0.5.0',
      metadata: {
        description: 'CLI built with decopin-cli',
      },
    });
  });

  it('should get version info from file when available', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "3.0.0"
export const metadata = {
  name: "file-cli",
  description: "CLI from file"
}
    `
    );

    const versionInfo = await getVersionInfo(testAppDir, '0.5.0');

    expect(versionInfo).toMatchObject({
      version: '3.0.0',
      metadata: {
        name: 'file-cli',
        description: 'CLI from file',
      },
    });
  });

  it('should handle empty version file', async () => {
    await writeFile(join(testAppDir, 'version.ts'), '');

    const result = await parseVersionFile(testAppDir);

    expect(result.versionInfo).toBeNull();
    expect(result.warnings).toContain(
      'No version information found in version.ts'
    );
  });
});
