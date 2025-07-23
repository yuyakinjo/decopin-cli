/**
 * Checks if a string is a CLI flag (starts with '-')
 * @param value - The string to check
 * @returns True if the string starts with '-'
 * @example
 * ```ts
 * isFlag('-v')        // true
 * isFlag('--version') // true
 * isFlag('version')   // false
 * ```
 */
export function isFlag(value: string): boolean {
  return value.startsWith('-');
}

/**
 * Checks if a string is a long CLI flag (starts with '--')
 * @param value - The string to check
 * @returns True if the string starts with '--'
 * @example
 * ```ts
 * isLongFlag('--version')  // true
 * isLongFlag('--help')     // true
 * isLongFlag('-v')         // false
 * ```
 */
export function isLongFlag(value: string): boolean {
  return value.startsWith('--');
}

/**
 * Checks if a string is a short CLI flag (starts with '-' but not '--')
 * @param value - The string to check
 * @returns True if the string is a short flag
 * @example
 * ```ts
 * isShortFlag('-v')        // true
 * isShortFlag('-h')        // true
 * isShortFlag('--version') // false
 * ```
 */
export function isShortFlag(value: string): boolean {
  return value.startsWith('-') && !value.startsWith('--');
}

/**
 * Checks if a string represents a dynamic route segment (e.g., '[id]')
 * @param value - The string to check
 * @returns True if the string is wrapped in square brackets
 * @example
 * ```ts
 * isDynamicSegment('[id]')      // true
 * isDynamicSegment('[userId]')  // true
 * isDynamicSegment('id')        // false
 * ```
 */
export function isDynamicSegment(value: string): boolean {
  return value.startsWith('[') && value.endsWith(']');
}

/**
 * Checks if a string represents an optional/variadic parameter (e.g., '[...args]')
 * @param value - The string to check
 * @returns True if the string starts with '[...' and ends with ']'
 * @example
 * ```ts
 * isOptionalParam('[...args]')   // true
 * isOptionalParam('[...params]') // true
 * isOptionalParam('[id]')        // false
 * ```
 */
export function isOptionalParam(value: string): boolean {
  return value.startsWith('[...') && value.endsWith(']');
}

/**
 * Checks if a string contains variadic parameter syntax ('...')
 * @param value - The string to check
 * @returns True if the string contains '...'
 * @example
 * ```ts
 * isVariadicParam('[...args]')  // true
 * isVariadicParam('...rest')    // true
 * isVariadicParam('normal')     // false
 * ```
 */
export function isVariadicParam(value: string): boolean {
  return value.includes('...');
}

/**
 * Checks if a path represents a TypeScript file
 * @param path - The file path to check
 * @returns True if the path ends with '.ts' or '.tsx'
 * @example
 * ```ts
 * isTypeScriptFile('file.ts')      // true
 * isTypeScriptFile('component.tsx') // true
 * isTypeScriptFile('file.js')      // false
 * ```
 */
export function isTypeScriptFile(path: string): boolean {
  return path.endsWith('.ts') || path.endsWith('.tsx');
}

/**
 * Checks if a filename is 'command.ts' (special command file in decopin-cli)
 * @param filename - The filename to check
 * @returns True if the filename is exactly 'command.ts'
 * @example
 * ```ts
 * isCommandFile('command.ts')  // true
 * isCommandFile('commands.ts') // false
 * ```
 */
export function isCommandFile(filename: string): boolean {
  return filename === 'command.ts';
}

/**
 * Checks if a filename is 'help.ts' (special help file in decopin-cli)
 * @param filename - The filename to check
 * @returns True if the filename is exactly 'help.ts'
 * @example
 * ```ts
 * isHelpFile('help.ts')  // true
 * isHelpFile('helps.ts') // false
 * ```
 */
export function isHelpFile(filename: string): boolean {
  return filename === 'help.ts';
}

/**
 * Checks if a filename is 'params.ts' (special params file in decopin-cli)
 * @param filename - The filename to check
 * @returns True if the filename is exactly 'params.ts'
 * @example
 * ```ts
 * isParamsFile('params.ts') // true
 * isParamsFile('param.ts')  // false
 * ```
 */
export function isParamsFile(filename: string): boolean {
  return filename === 'params.ts';
}

/**
 * Checks if a filename is 'env.ts' (special environment file in decopin-cli)
 * @param filename - The filename to check
 * @returns True if the filename is exactly 'env.ts'
 * @example
 * ```ts
 * isEnvFile('env.ts')  // true
 * isEnvFile('.env')    // false
 * ```
 */
export function isEnvFile(filename: string): boolean {
  return filename === 'env.ts';
}

/**
 * Checks if a filename matches a specific special file type in decopin-cli
 * @param filename - The filename to check
 * @param type - The type of special file to check for
 * @returns True if the filename matches the specified type
 * @example
 * ```ts
 * isSpecialFile('command.ts', 'command') // true
 * isSpecialFile('help.ts', 'help')       // true
 * isSpecialFile('other.ts', 'command')   // false
 * ```
 */
export function isSpecialFile(
  filename: string,
  type: 'command' | 'help' | 'params' | 'env'
): boolean {
  switch (type) {
    case 'command':
      return isCommandFile(filename);
    case 'help':
      return isHelpFile(filename);
    case 'params':
      return isParamsFile(filename);
    case 'env':
      return isEnvFile(filename);
    default:
      return false;
  }
}

/**
 * Extracts the parameter name from a dynamic segment (removes brackets)
 * @param segment - The dynamic segment string
 * @returns The extracted name without brackets, or null if not a dynamic segment
 * @example
 * ```ts
 * extractDynamicSegmentName('[id]')        // 'id'
 * extractDynamicSegmentName('[userId]')    // 'userId'
 * extractDynamicSegmentName('[...params]') // '...params'
 * extractDynamicSegmentName('id')          // null
 * ```
 */
export function extractDynamicSegmentName(segment: string): string | null {
  if (!isDynamicSegment(segment)) {
    return null;
  }
  return segment.slice(1, -1);
}

/**
 * Extracts the flag name without the leading dashes
 * @param flag - The flag string
 * @returns The flag name without '-' or '--' prefix
 * @example
 * ```ts
 * extractFlagName('--version')     // 'version'
 * extractFlagName('-v')            // 'v'
 * extractFlagName('--output-file') // 'output-file'
 * extractFlagName('notaflag')      // 'notaflag'
 * ```
 */
export function extractFlagName(flag: string): string {
  if (isLongFlag(flag)) {
    return flag.slice(2);
  }
  if (isShortFlag(flag)) {
    return flag.slice(1);
  }
  return flag;
}

/**
 * Checks if a string is empty or contains only whitespace
 * @param value - The string to check
 * @returns True if the string is empty or only whitespace
 * @example
 * ```ts
 * isEmptyString('')       // true
 * isEmptyString('   ')    // true
 * isEmptyString('\t\n')   // true
 * isEmptyString('hello')  // false
 * ```
 */
export function isEmptyString(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Checks if a string contains non-whitespace characters
 * @param value - The string to check
 * @returns True if the string contains non-whitespace characters
 * @example
 * ```ts
 * isNonEmptyString('hello')  // true
 * isNonEmptyString(' hi ')   // true
 * isNonEmptyString('')       // false
 * isNonEmptyString('   ')    // false
 * ```
 */
export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}
