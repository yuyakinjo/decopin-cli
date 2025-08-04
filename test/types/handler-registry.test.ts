import { describe, expect, test } from 'bun:test';
import {
  HANDLER_REGISTRY,
  EXECUTION_ORDER,
  createHandlerRegistryMap,
  getHandlersByScope,
  getHandlersByExecutionOrder,
  validateHandlerDependencies,
  type HandlerDefinition,
} from '../../src/types/handler-registry.js';

describe('Handler Registry', () => {
  test('should contain all expected handlers', () => {
    const handlerNames = HANDLER_REGISTRY.map(h => h.name);
    const expectedHandlers = [
      'global-error',
      'env',
      'version',
      'middleware',
      'help',
      'params',
      'command',
      'error',
    ];
    
    expect(handlerNames).toEqual(expectedHandlers);
  });

  test('should have unique handler names', () => {
    const names = HANDLER_REGISTRY.map(h => h.name);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  test('should have unique file names', () => {
    const fileNames = HANDLER_REGISTRY.map(h => h.fileName);
    const uniqueFileNames = new Set(fileNames);
    expect(fileNames.length).toBe(uniqueFileNames.size);
  });

  test('should have exactly one required handler', () => {
    const requiredHandlers = HANDLER_REGISTRY.filter(h => h.required);
    expect(requiredHandlers.length).toBe(1);
    expect(requiredHandlers[0].name).toBe('command');
  });
});

describe('Execution Order', () => {
  test('should have correct execution order values', () => {
    const orderMap = new Map<string, number>([
      ['global-error', EXECUTION_ORDER.GLOBAL_ERROR],
      ['env', EXECUTION_ORDER.ENV],
      ['version', EXECUTION_ORDER.VERSION],
      ['middleware', EXECUTION_ORDER.MIDDLEWARE],
      ['help', EXECUTION_ORDER.HELP],
      ['params', EXECUTION_ORDER.PARAMS],
      ['command', EXECUTION_ORDER.COMMAND],
      ['error', EXECUTION_ORDER.ERROR],
    ]);

    for (const handler of HANDLER_REGISTRY) {
      expect(handler.executionOrder).toBe(orderMap.get(handler.name));
    }
  });

  test('should sort handlers by execution order', () => {
    const sorted = getHandlersByExecutionOrder();
    const executionOrders = sorted.map(h => h.executionOrder);
    
    // Check that the array is sorted
    for (let i = 1; i < executionOrders.length; i++) {
      expect(executionOrders[i]).toBeGreaterThanOrEqual(executionOrders[i - 1]);
    }
    
    // Check specific order
    const nameOrder = sorted.map(h => h.name);
    expect(nameOrder).toEqual([
      'global-error',
      'env',
      'version',
      'middleware',
      'help',
      'params',
      'command',
      'error',
    ]);
  });
});

describe('Handler Scopes', () => {
  test('should have correct scope assignments', () => {
    const globalHandlers = ['global-error', 'env', 'version', 'middleware'];
    const commandHandlers = ['help', 'params', 'command', 'error'];

    for (const handler of HANDLER_REGISTRY) {
      if (globalHandlers.includes(handler.name)) {
        expect(handler.scope).toBe('global');
      } else if (commandHandlers.includes(handler.name)) {
        expect(handler.scope).toBe('command');
      } else {
        throw new Error(`Unknown handler: ${handler.name}`);
      }
    }
  });

  test('should filter handlers by scope correctly', () => {
    const globalHandlers = getHandlersByScope('global');
    const commandHandlers = getHandlersByScope('command');

    expect(globalHandlers.length).toBe(4);
    expect(commandHandlers.length).toBe(4);

    expect(globalHandlers.every(h => h.scope === 'global')).toBe(true);
    expect(commandHandlers.every(h => h.scope === 'command')).toBe(true);
  });
});

describe('Dependencies', () => {
  test('should have valid dependencies', () => {
    const { valid, errors } = validateHandlerDependencies();
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  test('params should depend on env', () => {
    const paramsHandler = HANDLER_REGISTRY.find(h => h.name === 'params');
    expect(paramsHandler?.dependencies).toContain('env');
  });

  test('command should depend on params', () => {
    const commandHandler = HANDLER_REGISTRY.find(h => h.name === 'command');
    expect(commandHandler?.dependencies).toContain('params');
  });

  test('should not have circular dependencies', () => {
    // This is tested by validateHandlerDependencies, but we can also check manually
    for (const handler of HANDLER_REGISTRY) {
      if (handler.dependencies) {
        for (const dep of handler.dependencies) {
          const depHandler = HANDLER_REGISTRY.find(h => h.name === dep);
          if (depHandler?.dependencies) {
            expect(depHandler.dependencies.includes(handler.name)).toBe(false);
          }
        }
      }
    }
  });

  test('dependencies should respect execution order', () => {
    for (const handler of HANDLER_REGISTRY) {
      if (handler.dependencies) {
        for (const dep of handler.dependencies) {
          const depHandler = HANDLER_REGISTRY.find(h => h.name === dep);
          if (depHandler) {
            expect(depHandler.executionOrder).toBeLessThan(handler.executionOrder);
          }
        }
      }
    }
  });
});

describe('Handler Registry Map', () => {
  test('should create a map for efficient lookup', () => {
    const map = createHandlerRegistryMap();
    
    expect(map.size).toBe(HANDLER_REGISTRY.length);
    
    for (const handler of HANDLER_REGISTRY) {
      expect(map.get(handler.name)).toBe(handler);
    }
  });

  test('should allow quick handler lookup by name', () => {
    const map = createHandlerRegistryMap();
    
    const envHandler = map.get('env');
    expect(envHandler).toBeDefined();
    expect(envHandler?.fileName).toBe('env.ts');
    expect(envHandler?.handlerType).toBe('EnvHandler');
    
    const commandHandler = map.get('command');
    expect(commandHandler).toBeDefined();
    expect(commandHandler?.required).toBe(true);
  });
});

describe('Handler Type and Context Names', () => {
  test('should have consistent handler type naming', () => {
    for (const handler of HANDLER_REGISTRY) {
      // Handler type should be PascalCase version of name + 'Handler'
      const expectedHandlerType = handler.name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') + 'Handler';
      
      expect(handler.handlerType).toBe(expectedHandlerType);
    }
  });

  test('should have consistent context type naming', () => {
    for (const handler of HANDLER_REGISTRY) {
      // Context type should be PascalCase version of name + 'Context'
      const expectedContextType = handler.name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') + 'Context';
      
      expect(handler.contextType).toBe(expectedContextType);
    }
  });
});

describe('Handler Descriptions', () => {
  test('should have descriptions for all handlers', () => {
    for (const handler of HANDLER_REGISTRY) {
      expect(handler.description).toBeDefined();
      expect(handler.description).not.toBe('');
    }
  });
});