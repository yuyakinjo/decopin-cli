/**
 * decopin-cli - TypeScript-first CLI builder with lazy loading architecture
 * 
 * This new architecture uses lazy loading to minimize startup time
 * and memory usage by only loading modules when they are actually needed.
 */

import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { Scanner } from './core/scanner.js';
import { PerformanceMonitor } from './core/performance.js';
// Core types imported but renamed to avoid conflicts

// Lazy-loaded modules
// TODO: Replace with `import defer` when TypeScript 5.9 fully supports it
// import defer * as commandModule from './command/index.js';
let commandModule: typeof import('./command/index.js') | null = null;

async function getCommandModule() {
  if (!commandModule) {
    commandModule = await import('./command/index.js');
  }
  return commandModule;
}

/**
 * Build configuration with defaults
 */
export interface BuildConfig {
  appDir: string;
  outputDir: string;
  cliName?: string;
  outputFileName?: string;
  version?: string;
  description?: string;
  verbose?: boolean;
}

/**
 * Build result
 */
export interface BuildResult {
  success: boolean;
  files: string[];
  errors: string[];
  warnings: string[];
  stats: {
    commandCount: number;
    buildTime: number;
  };
}

/**
 * Build a CLI from the app directory
 * Only loads the modules that are actually needed based on the files found
 */
export async function buildCLI(config: BuildConfig): Promise<BuildResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const files: string[] = [];
  
  // Performance monitoring
  const monitor = new PerformanceMonitor();

  try {
    if (config.verbose) {
      console.log(`🔍 Scanning app directory: ${config.appDir}`);
    }

    // Scan directory structure
    const scanner = new Scanner(config.appDir);
    const structure = await scanner.scan();
    
    if (structure.commands.length === 0) {
      warnings.push('No command files found in app directory');
      return {
        success: true,
        files: [],
        errors,
        warnings,
        stats: {
          commandCount: 0,
          buildTime: Date.now() - startTime,
        },
      };
    }

    if (config.verbose) {
      console.log(`📁 Found ${structure.commands.length} command files`);
    }

    // Create output directory
    await mkdir(config.outputDir, { recursive: true });

    // Parse and process commands (lazy-loaded)
    let cliContent = '';
    
    if (structure.commands.length > 0) {
      const cmdModule = await monitor.measureModuleLoad('command', getCommandModule);
      
      // Update command definitions with params/help/error info
      const commands = await cmdModule.parseCommands(structure.commands);
      
      // Extract aliases from help files at build time
      const { readFileSync } = await import('node:fs');
      const ts = await import('typescript');
      
      for (const cmd of commands) {
        const commandPath = cmd.name === 'root' ? '' : cmd.name;
        cmd.hasParams = structure.params.some(p => p.commandPath === commandPath);
        cmd.hasHelp = structure.help.some(h => h.commandPath === commandPath);
        cmd.hasError = structure.errors.some(e => e.commandPath === commandPath);
        
        // Try to get aliases from help file by parsing TypeScript
        const helpFile = structure.help.find(h => h.commandPath === commandPath);
        if (helpFile) {
          try {
            const content = readFileSync(helpFile.path, 'utf-8');
            const sourceFile = ts.createSourceFile(
              helpFile.path,
              content,
              ts.ScriptTarget.Latest,
              true
            );
            
            // Find aliases in the help handler object
            const aliases = extractAliasesFromHelpFile(sourceFile, ts);
            if (config.verbose) {
              console.log(`  Checking aliases for ${cmd.name}: ${aliases ? aliases.join(', ') : 'none'}`);
            }
            if (aliases && aliases.length > 0) {
              if (!cmd.metadata) cmd.metadata = {};
              cmd.metadata.aliases = aliases;
            }
          } catch (error) {
            // Failed to parse help file, continue without aliases
            if (config.verbose) {
              console.log(`  Failed to parse help file for ${cmd.name}:`, error);
            }
          }
        }
      }

      const generated = await cmdModule.generateCommands(commands, structure);
      cliContent = typeof generated === 'string' ? generated : (generated as any).content;
    }

    // Copy validation utilities if needed
    await copyValidationUtils(config.outputDir);

    // Write CLI file
    const outputFileName = config.outputFileName || 'cli.js';
    const outputPath = join(config.outputDir, outputFileName);
    await writeFile(outputPath, cliContent, 'utf-8');
    await chmod(outputPath, 0o755); // Make executable
    files.push(outputPath);

    if (config.verbose) {
      console.log(`✅ Generated ${outputPath}`);
      monitor.printSummary();
    }

    monitor.recordStartupComplete();

    return {
      success: true,
      files,
      errors,
      warnings,
      stats: {
        commandCount: structure.commands.length,
        buildTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    errors.push(`Build failed: ${error}`);
    return {
      success: false,
      files,
      errors,
      warnings,
      stats: {
        commandCount: 0,
        buildTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Build with default settings
 */
export async function buildWithDefaults(
  appDir: string = './app',
  outputDir: string = './dist',
  cliName: string = 'cli'
): Promise<BuildResult> {
  return buildCLI({
    appDir,
    outputDir,
    cliName,
    verbose: true,
  });
}

/**
 * List available commands
 */
export async function listCommands(appDir: string = './app'): Promise<string[]> {
  try {
    const scanner = new Scanner(appDir);
    const structure = await scanner.scan();
    return structure.commands.map(cmd => cmd.name === 'root' ? '(default)' : cmd.name);
  } catch (error) {
    console.error(`Failed to list commands: ${error}`);
    return [];
  }
}

/**
 * Builder info
 */
export const builderInfo = {
  name: 'decopin-cli',
  version: '0.2.0', // Updated for lazy-loading architecture
  description: 'TypeScript-first CLI builder with lazy loading and file-based routing',
};

// Re-export types
export type { 
  CLIStructure,
  CommandMetadata as CommandDefinition,
  ParamMapping as ParamsDefinition 
} from './core/types.js';

// Export from existing types for compatibility
export type {
  CommandContext,
  CommandHandler,
  CommandMetadata,
  ParsedCommand,
  ValidationError,
  ValidationResult,
} from './types/index.js';

// Version types
export type { VersionInfo } from './parser/version-parser.js';

/**
 * Extract aliases from help.ts file
 */
function extractAliasesFromHelpFile(sourceFile: any, ts: any): string[] | undefined {
  const aliases: string[] = [];
  
  function visit(node: any) {
    // Look for aliases property in the returned object
    if (ts.isPropertyAssignment(node) && 
        ts.isIdentifier(node.name) && 
        node.name.text === 'aliases' &&
        ts.isArrayLiteralExpression(node.initializer)) {
      
      node.initializer.elements.forEach((element: any) => {
        if (ts.isStringLiteral(element)) {
          aliases.push(element.text);
        }
      });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return aliases.length > 0 ? aliases : undefined;
}

/**
 * Copy validation utilities to output directory
 */
async function copyValidationUtils(outputDir: string): Promise<void> {
  try {
    const { copyFile, readFile } = await import('node:fs/promises');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Check if we're in src or dist directory
    const baseDir = __dirname.endsWith('/src') 
      ? join(__dirname, '..', 'dist')
      : __dirname;

    // Copy validation.js
    const validationSource = join(baseDir, 'utils', 'validation.js');
    const validationDest = join(outputDir, 'validation.js');
    
    let content = await readFile(validationSource, 'utf-8');
    content = content.replace(
      "import { isBoolean, isFunction, isString } from '../internal/guards/index.js';",
      "import { isBoolean, isFunction, isString } from './internal/guards/index.js';"
    );
    await writeFile(validationDest, content, 'utf-8');

    // Copy internal/guards
    const guardsSourceDir = join(baseDir, 'internal', 'guards');
    const guardsDestDir = join(outputDir, 'internal', 'guards');
    await mkdir(join(outputDir, 'internal'), { recursive: true });
    await mkdir(guardsDestDir, { recursive: true });

    const guardFiles = ['index.js', 'ast.js', 'string.js', 'validation.js'];
    for (const file of guardFiles) {
      const source = join(guardsSourceDir, file);
      const dest = join(guardsDestDir, file);
      await copyFile(source, dest);
    }
  } catch (error) {
    console.warn('Warning: Could not copy validation utilities:', error);
  }
}