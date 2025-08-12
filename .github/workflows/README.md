# GitHub Workflows

This directory contains automated workflows for PixelTracer.

## Workflows

### 🚀 Release (`release.yml`)
**Trigger**: Push to main branch or manual dispatch

Automated release workflow that:
- Bumps version based on conventional commits or manual input
- Runs tests and builds all packages
- Creates Chrome extension ZIP file
- Generates changelog
- Creates GitHub release with artifacts
- Tags the release

**Manual trigger options**:
- `patch`: Bug fixes (x.x.1)
- `minor`: New features (x.1.0)
- `major`: Breaking changes (1.0.0)

### ✅ CI (`ci.yml`)
**Trigger**: Pull requests and pushes to main

Continuous integration that:
- Tests on Node.js 18.x and 20.x
- Runs linter and type checks
- Executes test suite
- Builds all packages
- Verifies Chrome extension build
- Uploads artifacts for review

## Local Release

For local releases, use the provided script:

```bash
# Interactive mode
./scripts/release.sh

# Direct mode
./scripts/release.sh patch  # Bug fix
./scripts/release.sh minor  # New feature
./scripts/release.sh major  # Breaking change
```

## Version Strategy

- **Production releases**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Conventional commits**: Automatically determine version bump
  - `fix:` → patch
  - `feat:` → minor
  - `BREAKING CHANGE:` or `!:` → major

## Required Secrets

No additional secrets required. Uses default `GITHUB_TOKEN`.

## Artifacts

- **Chrome Extension ZIP**: Available on every release
- **Development builds**: Available for 7 days on CI runs

## Dependencies

Managed by Dependabot with weekly updates grouped by:
- Development dependencies
- React ecosystem
- Build tools
- GitHub Actions