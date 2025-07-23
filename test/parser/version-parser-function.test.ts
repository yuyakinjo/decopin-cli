import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  getVersionInfo,
  hasVersionFile,
  parseVersionFile,
} from '../../src/parser/version-parser.js';

describe('Version Parser - Function Pattern', () => {
  const testAppDir = join(process.cwd(), 'test-app-version-func');

  beforeEach(async () => {
    await mkdir(testAppDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testAppDir, { recursive: true, force: true });
  });

  it('should parse function pattern with version only', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  return {
    version: "1.2.3"
  };
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '1.2.3',
    });
  });

  it('should parse function pattern with version and metadata', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  return {
    version: "2.0.0",
    metadata: {
      name: "awesome-cli",
      description: "An awesome CLI tool",
      author: "Developer"
    }
  };
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

  it('should handle function pattern with complex metadata', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  return {
    version: "3.0.0",
    metadata: {
      name: "super-cli",
      version: "3.0.0",
      description: "The ultimate command line interface",
      author: "TypeScript Ninja",
      repository: "https://github.com/example/super-cli",
      license: "MIT",
      keywords: ["cli", "typescript", "awesome"],
      engines: {
        node: ">=18.0.0"
      }
    }
  };
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '3.0.0',
      metadata: {
        name: 'super-cli',
        version: '3.0.0',
        description: 'The ultimate command line interface',
        author: 'TypeScript Ninja',
        repository: 'https://github.com/example/super-cli',
        license: 'MIT',
        keywords: ['cli', 'typescript', 'awesome'],
        engines: {
          node: '>=18.0.0'
        }
      },
    });
  });

  it('should handle function pattern without metadata', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  return {
    version: "1.0.0"
  };
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '1.0.0',
    });
    expect(result.versionInfo?.metadata).toBeUndefined();
  });

  it('should handle arrow function syntax', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
const createVersion = () => {
  return {
    version: "2.5.0",
    metadata: {
      name: "arrow-cli"
    }
  };
};

export default createVersion;
    `
    );

    const result = await parseVersionFile(testAppDir);

    // Arrow function syntax is not currently supported, should fall back to no version found
    expect(result.warnings).toContain('No version information found in version.ts');
    expect(result.versionInfo).toBeNull();
  });

  it('should handle function with different name', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function getVersion() {
  return {
    version: "1.5.0"
  };
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    // Function must be named createVersion
    expect(result.warnings).toContain('No version information found in version.ts');
    expect(result.versionInfo).toBeNull();
  });

  it('should handle function that returns null', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  return null;
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.warnings).toContain('No version information found in version.ts');
    expect(result.versionInfo).toBeNull();
  });

  it('should handle function without return statement', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  const version = "1.0.0";
  // Forgot to return
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.warnings).toContain('No version information found in version.ts');
    expect(result.versionInfo).toBeNull();
  });

  it('should handle function with conditional return', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  if (process.env.NODE_ENV === 'production') {
    return {
      version: "1.0.0",
      metadata: {
        name: "prod-cli"
      }
    };
  } else {
    return {
      version: "1.0.0-dev",
      metadata: {
        name: "dev-cli"
      }
    };
  }
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    // Parser only checks the first return statement in the function body
    expect(result.warnings).toContain('No version information found in version.ts');
    expect(result.versionInfo).toBeNull();
  });

  it('should handle both patterns in the same file (function pattern takes precedence)', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
// Old pattern
export const version = "1.0.0";
export const metadata = {
  name: "old-cli"
};

// New pattern
export default function createVersion() {
  return {
    version: "2.0.0",
    metadata: {
      name: "new-cli"
    }
  };
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    // Function pattern should take precedence
    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '2.0.0',
      metadata: {
        name: 'new-cli',
      },
    });
  });

  it('should handle function with async keyword', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default async function createVersion() {
  return {
    version: "1.0.0"
  };
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    // Async functions are actually parsed the same as regular functions
    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '1.0.0',
    });
  });

  it('should handle function with parameters', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion(config) {
  return {
    version: config?.version || "1.0.0"
  };
}
    `
    );

    const result = await parseVersionFile(testAppDir);

    // Functions with parameters are not supported
    expect(result.warnings).toContain('No version information found in version.ts');
    expect(result.versionInfo).toBeNull();
  });

  it('should maintain backward compatibility with object pattern', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export const version = "0.9.0";
export const metadata = {
  name: "legacy-cli",
  description: "Legacy CLI using object pattern"
};
    `
    );

    const result = await parseVersionFile(testAppDir);

    expect(result.errors).toEqual([]);
    expect(result.versionInfo).toMatchObject({
      version: '0.9.0',
      metadata: {
        name: 'legacy-cli',
        description: 'Legacy CLI using object pattern',
      },
    });
  });

  it('should work with getVersionInfo for function pattern', async () => {
    await writeFile(
      join(testAppDir, 'version.ts'),
      `
export default function createVersion() {
  return {
    version: "5.0.0",
    metadata: {
      name: "get-version-cli",
      description: "Testing getVersionInfo"
    }
  };
}
    `
    );

    const versionInfo = await getVersionInfo(testAppDir, '1.0.0');

    expect(versionInfo).toMatchObject({
      version: '5.0.0',
      metadata: {
        name: 'get-version-cli',
        description: 'Testing getVersionInfo',
      },
    });
  });
});