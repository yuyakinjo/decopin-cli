import type { VersionInfo } from '../dist/index.js';

/**
 * CLI バージョン情報
 */
export default function createVersion(): VersionInfo {
  return {
    version: "2.1.3",
    metadata: {
      name: "super-cli",
      version: "2.1.3",
      description: "The ultimate command line interface for developers",
      author: "TypeScript Ninja"
    }
  };
}