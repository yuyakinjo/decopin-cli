# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated CI/CD and dependency management.

## Workflows

### 1. CI (`ci.yml`)
Runs on every push and pull request to ensure code quality.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- Runs tests on Node.js 20.x, 22.x, and 24.x
- Lints code with Biome
- Builds the project and example app
- Runs all tests
- Displays test results in GitHub Actions summary

### 2. Auto-merge Dependabot (`auto-merge-dependabot.yml`)
Automatically merges Dependabot pull requests when all tests pass.

**Features:**
- **Auto-merge:** Patch and minor updates are automatically merged
- **Auto-approve:** Patch and minor updates are automatically approved
- **Manual review:** Major updates require manual review
- **Wait for CI:** Waits for all CI checks to pass before merging

**Security levels:**
- ✅ **Patch updates** (1.0.0 → 1.0.1): Auto-merged
- ✅ **Minor updates** (1.0.0 → 1.1.0): Auto-merged
- ⚠️ **Major updates** (1.0.0 → 2.0.0): Manual review required

## Setup Requirements

### Repository Settings
1. Enable **Allow auto-merge** in repository settings:
   - Go to Settings → General → Pull Requests
   - Check "Allow auto-merge"

2. Set up branch protection rules for `main`:
   - Require pull request reviews (can be bypassed by Dependabot)
   - Require status checks to pass before merging
   - Select "all-checks" as a required status check

### Secrets
No additional secrets are required. The workflows use the default `GITHUB_TOKEN`.

## Dependabot Configuration

Dependabot is configured in `.github/dependabot.yml` to:
- Check for npm updates weekly (Mondays at 9:00 AM JST)
- Check for GitHub Actions updates weekly
- Group dependencies by type (dev/production)
- Create PRs with semantic commit messages
- Assign reviewers automatically

## Workflow Permissions

The auto-merge workflow requires:
- `contents: write` - To merge PRs
- `pull-requests: write` - To approve and comment on PRs

These permissions are explicitly set in the workflow file.