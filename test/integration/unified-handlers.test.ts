import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Scanner } from '../../src/core/scanner.js';
import { generate } from '../../src/command/generator.js';
import { parseCommands } from '../../src/command/index.js';

describe('Unified Handler System Integration', () => {
  let tempDir: string;
  let appDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'unified-handlers-test-'));
    appDir = join(tempDir, 'app');
    mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Full integration with all handlers', () => {
    it('should generate CLI with unified handler execution', async () => {
      // Create a complete command structure
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir);

      // Create all command handlers
      writeFileSync(
        join(helloDir, 'command.ts'),
        `export default async function createCommand(context) {
          console.log('Hello, ' + context.validatedData.name);
        }`
      );

      writeFileSync(
        join(helloDir, 'params.ts'),
        `export default function createParams(context) {
          return {
            mappings: [
              {
                field: 'name',
                type: 'string',
                argIndex: 0,
                defaultValue: 'World',
              }
            ]
          };
        }`
      );

      writeFileSync(
        join(helloDir, 'help.ts'),
        `export default function createHelp() {
          return {
            name: 'hello',
            description: 'Say hello to someone',
            examples: ['hello Alice', 'hello --name Bob'],
          };
        }`
      );

      writeFileSync(
        join(helloDir, 'error.ts'),
        `export default async function createErrorHandler(context) {
          console.error('Error in hello command:', context.error.message);
          process.exit(1);
        }`
      );

      // Create global handlers
      writeFileSync(
        join(appDir, 'env.ts'),
        `export default function createEnv(context) {
          return { NODE_ENV: 'test' };
        }`
      );

      writeFileSync(
        join(appDir, 'version.ts'),
        `export default function createVersion() {
          return { version: '1.0.0' };
        }`
      );

      writeFileSync(
        join(appDir, 'middleware.ts'),
        `export default function createMiddleware(context) {
          return async (ctx, next) => {
            console.log('Before command');
            await next();
            console.log('After command');
          };
        }`
      );

      writeFileSync(
        join(appDir, 'global-error.ts'),
        `export default function createGlobalErrorHandler(context) {
          return async (error) => {
            console.error('Global error:', error.message);
            process.exit(1);
          };
        }`
      );

      // Scan and parse
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();
      const parsedCommands = await parseCommands(structure.commands);

      // Generate CLI
      const generated = await generate(parsedCommands, structure);

      // Verify generated code includes unified handler execution
      expect(generated.content).toContain('// Global handler initialization');
      expect(generated.content).toContain("globalHandlers['env']");
      expect(generated.content).toContain("globalHandlers['middleware']");
      expect(generated.content).toContain("globalHandlers['global-error']");

      // Verify command handler execution
      expect(generated.content).toContain('const commandModule = await import');
      expect(generated.content).toContain('const paramsModule = await import');
      expect(generated.content).toContain('const helpModule = await import');
      expect(generated.content).toContain('const errorModule = await import');

      // Verify context building
      expect(generated.content).toContain('let context = {');
      expect(generated.content).toContain('args: commandArgs,');
      expect(generated.content).toContain('options: parsedOptions,');
      expect(generated.content).toContain('env: env || process.env,');

      // Verify help handling
      expect(generated.content).toContain("if (commandArgs.includes('--help')");

      // Verify params validation
      expect(generated.content).toContain('const paramsHandler = paramsModule.default');
      expect(generated.content).toContain('const validatedData = await validateParams');

      // Verify error handling
      expect(generated.content).toContain('try {');
      expect(generated.content).toContain('} catch (error) {');
      expect(generated.content).toContain('const errorHandler = errorModule.default');
    });

    it('should handle commands with partial handlers', async () => {
      // Create a command with only command.ts and params.ts
      const simpleDir = join(appDir, 'simple');
      mkdirSync(simpleDir);

      writeFileSync(
        join(simpleDir, 'command.ts'),
        `export default async function createCommand(context) {
          console.log('Simple command');
        }`
      );

      writeFileSync(
        join(simpleDir, 'params.ts'),
        `export default function createParams() {
          return {
            mappings: [
              {
                field: 'value',
                type: 'string',
                argIndex: 0,
              }
            ]
          };
        }`
      );

      // Scan and parse
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();
      const parsedCommands = await parseCommands(structure.commands);

      // Generate CLI
      const generated = await generate(parsedCommands, structure);

      // Should have command and params imports
      expect(generated.content).toContain('const commandModule = await import');
      expect(generated.content).toContain('const paramsModule = await import');

      // Should not have help or error imports in the command execution section
      const simpleCommandSection = generated.content.split("case 'simple':")[1].split('break;')[0];
      expect(simpleCommandSection).not.toContain('const helpModule = await import');
      expect(simpleCommandSection).not.toContain('const errorModule = await import');

      // Should have params validation
      expect(generated.content).toContain('const validatedData = await validateParams');

      // Should not have try-catch for error handling
      expect(simpleCommandSection).not.toContain('try {');
      expect(simpleCommandSection).not.toContain('} catch (error) {');
    });

    it('should require structure parameter for generation', async () => {
      // Create a minimal command
      const minimalDir = join(appDir, 'minimal');
      mkdirSync(minimalDir);

      writeFileSync(
        join(minimalDir, 'command.ts'),
        `export default async function() {
          console.log('Minimal command');
        }`
      );

      // Scan the structure
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();
      const parsedCommands = await parseCommands(structure.commands);

      // Generate with structure - should work
      const generated = await generate(parsedCommands, structure);
      
      // Should contain unified handler code
      expect(generated.content).toContain('let context = {');
      expect(generated.content).toContain('const commandModule = await import');
    });
  });

  describe('Handler execution order', () => {
    it('should respect handler execution order', async () => {
      // Create a command with all handlers
      const orderDir = join(appDir, 'order-test');
      mkdirSync(orderDir);

      // Create handlers that modify context
      writeFileSync(
        join(appDir, 'env.ts'),
        `export default function() {
          return { NODE_ENV: 'test', order: ['env'] };
        }`
      );

      writeFileSync(
        join(orderDir, 'params.ts'),
        `export default function(context) {
          return {
            mappings: [{
              field: 'value',
              type: 'string',
              argIndex: 0,
            }]
          };
        }`
      );

      writeFileSync(
        join(orderDir, 'command.ts'),
        `export default async function(context) {
          console.log('Command executed with:', context);
        }`
      );

      // Scan and parse
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();
      const parsedCommands = await parseCommands(structure.commands);

      // Generate CLI
      const generated = await generate(parsedCommands, structure);

      // Verify env is loaded before params
      const envIndex = generated.content.indexOf("globalHandlers['env']");
      const paramsIndex = generated.content.indexOf('const paramsHandler = paramsModule.default');
      const commandIndex = generated.content.indexOf('await commandHandler(context)');

      expect(envIndex).toBeLessThan(paramsIndex);
      expect(paramsIndex).toBeLessThan(commandIndex);
    });
  });
});