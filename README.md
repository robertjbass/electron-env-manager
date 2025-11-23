# electron-env-manager


## Name Ideas
- Envy


## TODOs

- [ ] Create a custom update workflow using GitHub Actions to avoid paying for an Apple Developer license (see below)
- [ ] Add update status UI in the renderer
- [ ] Configure beta vs stable update channels


## Updates Without Code Signing

macOS auto-updates via `electron-updater` normally require code signing ($99/year Apple Developer license). To avoid this cost, you can implement a custom update workflow:

### Option 1: Manual Update Check with In-App Notification

Instead of `autoUpdater.checkForUpdatesAndNotify()`, fetch the latest release from GitHub API and show a custom UI prompting users to download the new version manually:

```typescript
// Check GitHub releases API
const res = await fetch("https://api.github.com/repos/robertjbass/electron-env-manager/releases/latest")
const release = await res.json()

if (semver.gt(release.tag_name, app.getVersion())) {
  // Show UI: "New version available! Click to download"
  // Open release.html_url in browser when clicked
}
```

### Option 2: GitHub Actions for Cross-Platform Builds

Set up GitHub Actions to build and publish releases automatically. This avoids needing to run `pnpm publish-release` locally and works for all platforms:

1. Create `.github/workflows/release.yml`
2. Trigger on version tag push (e.g., `v*`)
3. Build for macOS, Windows, and Linux in the workflow
4. Upload artifacts to GitHub Releases

Users would manually download new versions from GitHub Releases until code signing is set up.


## Releases & Versioning

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and releases.

### How It Works

1. Push commits to `main` or `dev` branch
2. GitHub Actions runs semantic-release to analyze commits
3. If releasable commits are found, it:
   - Bumps the version in package.json
   - Generates/updates CHANGELOG.md
   - Creates a git tag and GitHub release
   - Builds the app for macOS, Windows, and Linux
   - Uploads artifacts to the GitHub release

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types and Version Bumps

| Commit Type | Description | Version Bump |
|-------------|-------------|--------------|
| `fix:` | Bug fixes | Patch (1.0.0 → 1.0.1) |
| `feat:` | New features | Minor (1.0.0 → 1.1.0) |
| `feat!:` or `BREAKING CHANGE:` | Breaking changes | Major (1.0.0 → 2.0.0) |
| `docs:` | Documentation only | No release |
| `style:` | Code style (formatting) | No release |
| `refactor:` | Code refactoring | No release |
| `test:` | Adding/updating tests | No release |
| `chore:` | Maintenance tasks | No release |

### Examples

```bash
# Patch release (1.0.0 → 1.0.1)
git commit -m "fix: resolve crash when loading empty env file"

# Minor release (1.0.0 → 1.1.0)
git commit -m "feat: add ability to export env files as JSON"

# Major release (1.0.0 → 2.0.0)
git commit -m "feat!: change config file format from JSON to YAML"

# No release triggered
git commit -m "docs: update README with new examples"
git commit -m "chore: update dependencies"
```

### Release Channels

- **`main` branch** → Stable releases (1.0.0, 1.1.0, 2.0.0)
- **`dev` branch** → Beta prereleases (1.1.0-beta.1, 1.1.0-beta.2)


## Flow: