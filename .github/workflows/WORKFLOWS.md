# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated CI/CD, testing, linting, performance benchmarking, and dependency management.

## Overview

The project uses multiple specialized workflows to ensure code quality, performance, and maintainability:

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| **CI** | Main continuous integration | Push/PR to main/develop |
| **Test** | Run unit and integration tests | Code changes |
| **Lint** | Code quality checks | Code changes |
| **Build** | Verify build process | Code changes |
| **Integration** | End-to-end CLI testing | Code changes |
| **Performance** | Benchmark CLI startup times | Push to main, PR, weekly |
| **Auto-merge Dependabot** | Auto-merge safe dependency updates | Dependabot PRs |

## Workflow Details

### 1. CI (`ci.yml`)
The main continuous integration workflow that orchestrates all quality checks.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Only runs when source code, tests, or configuration files change

**Jobs:**
- Runs tests with Bun (latest version)
- Executes lint checks using Biome
- Builds both the library and example CLI app
- Generates the CLI and verifies it works
- Runs all tests and displays results in GitHub summary
- Includes an `all-checks` job for branch protection

**Environment:**
- Ubuntu latest
- Test environment variables configured for CI

### 2. Test (`test.yml`)
Dedicated workflow for running the test suite.

**Triggers:**
- Push events when test-related files change
- Uses concurrency control to cancel in-progress runs

**Jobs:**
- Builds the project and example app
- Generates the CLI
- Runs unit tests using Vitest
- Runs integration tests
- Ensures all tests pass before completing

### 3. Lint and Format (`lint.yml`)
Ensures code quality and consistent formatting.

**Triggers:**
- Push events when source code changes
- Changes to Biome configuration

**Jobs:**
- Builds the project first (required for some lint rules)
- Runs Biome linter and formatter checks
- Fails if code doesn't meet quality standards

### 4. Build Check (`build.yml`)
Verifies the build process works correctly.

**Triggers:**
- Push events when source code or build configuration changes
- Uses concurrency control

**Jobs:**
- Builds the main library (`dist/`)
- Builds the example app (`examples/`)
- Verifies build artifacts exist
- Checks that `dist/index.js` is created

### 5. Integration Tests (`integration.yml`)
Comprehensive end-to-end testing of the generated CLI.

**Triggers:**
- Push and PR events for code changes
- Changes to integration test files

**Jobs:**
1. **Integration Tests:**
   - Builds and generates the CLI
   - Verifies CLI file exists
   - Tests basic CLI functionality (help, version)
   - Runs integration test suite

2. **CLI Validation:**
   - Tests specific commands work correctly:
     - `hello` command output validation
     - `user create` command with parameters
     - `user list` command with options
   - Validates error handling for unknown commands
   - Ensures proper exit codes

### 6. Performance Benchmark (`performance.yml`)
Tracks CLI startup performance over time.

**Triggers:**
- Push to `main` branch
- Pull requests to `main`
- Manual workflow dispatch
- Weekly schedule (Mondays at 00:00 UTC)

**Features:**
- Measures CLI startup times across different command types
- Stores performance history in `performance-history` branch
- Compares PR performance against main branch
- Comments on PRs with performance impact analysis
- Creates performance badges
- Tracks performance trends over multiple versions

**Performance Metrics:**
- Average startup time
- Help/Error command performance
- Execution command performance
- Version-to-version comparisons

**PR Comments Include:**
- Performance change percentage
- Historical performance data
- Trend analysis (improving/degrading/stable)
- Recent version comparison table

### 7. Auto-merge Dependabot (`auto-merge-dependabot.yml`)
Automatically handles dependency updates from Dependabot.

**Triggers:**
- Dependabot pull request events
- PR reviews and check completions
- CI workflow completion

**Features:**
- **Auto-merge:** Patch and minor updates are automatically merged
- **Auto-approve:** Patch and minor updates are automatically approved
- **Manual review:** Major updates require human review
- **CI verification:** Waits for all CI checks to pass before merging

**Security Levels:**
- ✅ **Patch updates** (1.0.0 → 1.0.1): Auto-merged
- ✅ **Minor updates** (1.0.0 → 1.1.0): Auto-merged
- ⚠️ **Major updates** (1.0.0 → 2.0.0): Manual review required

**Process:**
1. Fetches Dependabot metadata
2. Waits for CI checks to complete
3. Auto-approves safe updates
4. Enables auto-merge for approved updates
5. Comments on major updates with review instructions

## Common Patterns

### Path Filters
Most workflows use path filters to run only when relevant files change:
```yaml
paths:
  - 'src/**/*.ts'
  - 'src/**/*.js'
  - 'app/**/*.ts'
  - 'app/**/*.js'
  - 'test/**/*.ts'
  - 'package.json'
  - 'bun.lockb'
```

### Concurrency Control
Workflows use concurrency groups to prevent duplicate runs:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Environment Variables
Standard test environment configuration:
```yaml
env:
  API_KEY: test-api-key-for-github-actions
  NODE_ENV: test
  PORT: 3000
  DEBUG: false
```

### Shared Setup Action
All workflows use a shared setup action (`.github/actions/setup`) for:
- Installing Bun
- Installing dependencies with frozen lockfile
- Caching dependencies

## Setup Requirements

### Repository Settings

1. **Enable Auto-merge:**
   - Go to Settings → General → Pull Requests
   - Check "Allow auto-merge"

2. **Branch Protection Rules for `main`:**
   - Require pull request reviews
   - Require status checks to pass before merging
   - Add `all-checks` as a required status check
   - Allow Dependabot to bypass requirements

3. **Permissions:**
   - Workflows use default `GITHUB_TOKEN`
   - No additional secrets required
   - Auto-merge workflow needs:
     - `contents: write` (merge PRs)
     - `pull-requests: write` (approve/comment)

### Dependabot Configuration

Configured in `.github/dependabot.yml`:
- Weekly npm dependency updates (Mondays 9:00 AM JST)
- Weekly GitHub Actions updates
- Groups dependencies by type
- Semantic commit messages
- Auto-assigns reviewers

## Performance History Branch

The `performance-history` branch stores:
- Historical performance data (`versions.csv`)
- Individual benchmark reports
- Latest performance report
- Performance badge data

This data enables:
- Long-term performance tracking
- Version-to-version comparisons
- Performance regression detection
- Trend analysis

## Best Practices

1. **Test Locally:** Run `bun test` and `bun run lint` before pushing
2. **Monitor Performance:** Check PR comments for performance impacts
3. **Review Major Updates:** Manually review Dependabot major version updates
4. **Fix Failures Quickly:** Address CI failures promptly to keep main branch green
5. **Use Path Filters:** Workflows only run when relevant files change

## Troubleshooting

### Common Issues

1. **CI Failures:**
   - Check test output in GitHub Actions logs
   - Look for lint errors in the lint workflow
   - Verify build artifacts are created correctly

2. **Auto-merge Not Working:**
   - Ensure repository settings allow auto-merge
   - Check that all required status checks pass
   - Verify Dependabot has necessary permissions

3. **Performance Regression:**
   - Review performance PR comments
   - Check recent changes for inefficiencies
   - Compare with historical data in performance-history branch

### Debugging Workflows

- Use `act` locally to test workflows
- Add `workflow_dispatch` trigger for manual testing
- Check workflow permissions if actions fail
- Review concurrency settings if workflows are skipped