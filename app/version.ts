import type { VersionHandler } from '../src/types/validation.js';

/**
 * CLI バージョン情報
 */
export default function createVersion(): VersionHandler {
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