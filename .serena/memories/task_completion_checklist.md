# Task Completion Checklist for decopin-cli

When completing any development task in decopin-cli, follow this checklist:

## 1. Code Quality Checks
Always run these commands before considering a task complete:

```bash
npm run lint              # Fix any linting issues with Biome
npm run build            # Ensure TypeScript compilation succeeds
npm test                 # Run all tests to ensure nothing is broken
```

## 2. Type Safety Verification
- Ensure no `any` types are used (will trigger warnings)
- All functions have proper return types
- Context types are properly used in handlers
- Generic types are used where appropriate

## 3. Testing Requirements
- New features must have corresponding tests
- Test both success and error scenarios
- Integration tests for end-to-end functionality
- Run specific tests: `vitest run test/[module-name]`

## 4. Command Testing
After implementing CLI commands:
```bash
npm run dev:regen        # Regenerate the CLI
node examples/cli.js [command] --help    # Test help output
node examples/cli.js [command] [args]    # Test actual execution
```

## 5. Development Workflow
- Use `npm run dev` during active development for auto-rebuild
- Changes to `src/` trigger library rebuild
- Changes to `app/` trigger example rebuild

## 6. Pre-Commit Checklist
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] New commands work correctly when tested
- [ ] No console.log statements left (unless intentional)
- [ ] Error handling is comprehensive
- [ ] Type safety is maintained throughout

## 7. Special Considerations
- **Parse, Don't Validate**: Use valibot schemas for validation
- **Context Pattern**: All handlers use the context-based pattern
- **No Comments**: Code should be self-documenting
- **Function Length**: Keep under 150 lines
- **Error Handling**: Use proper error handlers or global error handler

## 8. Integration Points
When modifying core functionality, ensure:
- Scanner still discovers all command files
- Parser correctly extracts metadata
- Generator produces valid CLI code
- Middleware execution order is preserved
- Dynamic imports work correctly

## 9. Documentation Updates
Only update documentation when explicitly requested:
- CLAUDE.md for AI assistance guidelines
- README.md for user-facing documentation
- Help text in command files