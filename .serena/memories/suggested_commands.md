# Essential Commands for decopin-cli Development

## Development Workflow Commands

### Primary Development Command
```bash
npm run dev
```
Starts build + watch mode using Bun. This watches:
- `src/**/*.ts` - Triggers library rebuild
- `app/**/*.ts` - Triggers example rebuild + CLI regeneration
- Import paths are automatically fixed

### Testing Commands
```bash
npm test                  # Run all tests once
npm run test:watch        # Watch mode for TDD
vitest run test/parser    # Run specific test directory
npm run test:integration  # Full integration test (builds everything first)
npm run test:integration:only  # Run integration tests without rebuild
```

### Code Quality
```bash
npm run lint              # Check and fix code with Biome
```

### Build Commands
```bash
npm run build            # Build library (src/ → dist/)
npm run build:app        # Build example app (app/ → examples/)
npm run build:prod       # Production build with production tsconfig
npm run dev:regen        # Regenerate CLI after changes
npm run dev:build-all    # Build everything
```

### Generated CLI Testing
```bash
# After building, test your commands:
node examples/cli.js hello "World"
node examples/cli.js user create --name "John" --email "john@example.com"
node examples/cli.js --help
node examples/cli.js --version
```

### Cleanup
```bash
npm run clean            # Remove dist and examples directories
```

### Publishing
```bash
npm run prepublishOnly   # Runs clean, build, tests before publishing
```

## Git Commands (Darwin/macOS)
```bash
git status               # Check current git status
git add .                # Stage all changes
git commit -m "message"  # Commit with message
git push                 # Push to remote
git diff                 # Show unstaged changes
git log --oneline -10    # Show recent commits
```

## System Commands (Darwin/macOS)
```bash
ls -la                   # List files with details
cd <directory>           # Change directory
pwd                      # Print working directory
grep -r "pattern" .      # Search for pattern recursively
find . -name "*.ts"      # Find TypeScript files
open .                   # Open current directory in Finder
```

## CLI Generation
```bash
npx decopin-cli build [options]
```
Options:
- `--output-dir <dir>`: Output directory (default: `dist`)
- `--output-file <file>`: Output file name (default: `cli.js`)
- `--app-dir <dir>`: App directory path (default: `app`)
- `--cli-name <name>`: CLI name for generated files