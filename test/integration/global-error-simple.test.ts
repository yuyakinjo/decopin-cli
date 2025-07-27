import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

describe('Global Error Handler - Simple Integration Test', () => {
  const cliPath = join(process.cwd(), 'examples/cli.js');

  it('should use global error handler for runtime errors', () => {
    // Create a test command that throws an error
    try {
      execSync(`node ${cliPath} test-error runtime`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      const output = error.stderr || error.stdout;
      
      // Check that global error handler was used
      expect(output).toContain('❌ An error occurred');
      expect(output).toContain('💥 Error Details:');
      expect(output).toContain('💡 Tips:');
    }
  });

  it('should use global error handler for validation errors', () => {
    try {
      execSync(`node ${cliPath} user create --name`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      const output = error.stderr || error.stdout;
      
      // This command has custom error handler, so it should NOT use global handler
      expect(output).not.toContain('❌ An error occurred');
      expect(output).toContain('❌ User creation failed:');
    }
  });

  it('should show stack trace in debug mode', () => {
    try {
      execSync(`DEBUG=true node ${cliPath} test-error runtime`, {
        stdio: 'pipe',
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'true' }
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      const output = error.stderr || error.stdout;
      
      // Check that stack trace is shown
      expect(output).toContain('📍 Stack Trace:');
      expect(output).toContain('at createCommand');
    }
  });
});