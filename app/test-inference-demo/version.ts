import type { VersionContext, VersionHandler } from '../../dist/types/index.js';

// Version handler with context
export default function createVersion(
  context: VersionContext<typeof process.env>
): VersionHandler {
  // Can use environment to customize version info
  const buildNumber = context.env.BUILD_NUMBER || 'local';
  const gitCommit = context.env.GIT_COMMIT || 'unknown';
  
  return {
    version: '1.0.0',
    metadata: {
      name: 'decopin-cli-demo',
      version: '1.0.0',
      description: 'Type inference demo for decopin-cli',
      author: 'TypeScript Developer',
      build: buildNumber,
      commit: gitCommit,
      environment: context.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }
  };
}