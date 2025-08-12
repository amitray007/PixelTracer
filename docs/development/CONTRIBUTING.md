# Contributing to PixelTracer

First off, thank you for considering contributing to PixelTracer! It's people like you that make PixelTracer such a great tool. We welcome contributions from everyone, regardless of experience level.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@pixeltracer.dev](mailto:conduct@pixeltracer.dev).

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:
- Age, body size, disability, ethnicity, gender identity and expression
- Level of experience, education, socio-economic status, nationality
- Personal appearance, race, religion, or sexual identity and orientation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm 8+
- Git
- Chrome browser (for testing)
- A GitHub account
- Basic knowledge of TypeScript and React

### First Time Setup

1. **Fork the Repository**
   ```bash
   # Click the 'Fork' button on GitHub
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/amitray007/pixeltracer.git
   cd pixeltracer
   ```

3. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/amitray007/pixeltracer.git
   ```

4. **Install Dependencies**
   ```bash
   pnpm install
   ```

5. **Build the Project**
   ```bash
   pnpm build
   ```

6. **Run Tests**
   ```bash
   pnpm test
   ```

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
```markdown
### Description
[Clear description of the bug]

### Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

### Expected Behavior
[What you expected to happen]

### Actual Behavior
[What actually happened]

### Screenshots
[If applicable]

### Environment
- OS: [e.g., macOS 13.0]
- Chrome Version: [e.g., 120.0]
- PixelTracer Version: [e.g., 2.0.0]

### Additional Context
[Any other information]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

**Enhancement Template:**
```markdown
### Problem Statement
[What problem does this solve?]

### Proposed Solution
[Your suggested solution]

### Alternatives Considered
[Other solutions you've thought about]

### Additional Context
[Mockups, examples, etc.]
```

### Adding New Providers

Want to add support for a new tracking service? Great! Here's how:

1. **Create Provider Class**
   ```typescript
   // packages/providers/src/your-provider/your-provider.ts
   import { BaseProvider } from '../base/base-provider'
   
   export class YourProvider extends BaseProvider {
     // Implementation
   }
   ```

2. **Add Tests**
   ```typescript
   // packages/providers/src/your-provider/your-provider.test.ts
   describe('YourProvider', () => {
     // Test cases
   })
   ```

3. **Register Provider**
   ```typescript
   // packages/providers/src/registry/default-providers.ts
   import { YourProvider } from '../your-provider'
   
   registry.register(new YourProvider())
   ```

4. **Add Documentation**
   ```markdown
   // docs/providers/your-provider.md
   # Your Provider Documentation
   ```

### Improving Documentation

Documentation improvements are always welcome! This includes:
- Fixing typos and grammar
- Adding examples
- Clarifying explanations
- Translating documentation
- Creating tutorials

## 💻 Development Setup

### Project Structure
```
pixeltracer/
├── apps/
│   └── chrome-extension/    # Chrome extension app
├── packages/
│   ├── shared/             # Shared types and utils
│   ├── core/               # Core engine
│   ├── providers/          # Provider implementations
│   └── ui/                 # React components
├── docs/                   # Documentation
├── scripts/                # Build scripts
└── .github/                # GitHub Actions
```

### Environment Setup

1. **Create Environment File**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure IDE**
   - Install recommended VS Code extensions
   - Enable TypeScript strict mode
   - Configure Prettier and ESLint

3. **Chrome Extension Development**
   ```bash
   # Start development mode
   pnpm dev
   
   # Load extension in Chrome:
   # 1. Open chrome://extensions
   # 2. Enable Developer mode
   # 3. Click "Load unpacked"
   # 4. Select apps/chrome-extension/dist
   ```

## 🔄 Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number
```

### 2. Make Your Changes
```bash
# Make changes
pnpm dev          # Watch mode
pnpm test:watch   # Test watch mode
```

### 3. Write/Update Tests
```bash
pnpm test         # Run all tests
pnpm test:coverage # Check coverage
```

### 4. Update Documentation
- Update relevant `.md` files
- Add JSDoc comments
- Update CHANGELOG.md (for significant changes)

### 5. Commit Your Changes
```bash
git add .
git commit -m "feat: add amazing feature"
```

### 6. Push to Your Fork
```bash
git push origin feature/your-feature-name
```

### 7. Create Pull Request
- Go to GitHub and create a PR
- Fill out the PR template
- Link relevant issues

## 🎨 Style Guidelines

### TypeScript Style

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
  email: string
}

function processUser(user: UserData): void {
  // Implementation
}

// ❌ Bad
interface user_data {
  ID: string,
  Name: string,
  Email: string
}

function ProcessUser(user: any) {
  // Implementation
}
```

### React Style

```tsx
// ✅ Good
export function UserCard({ user }: { user: User }) {
  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}

// ❌ Bad
export default class UserCard extends React.Component {
  render() {
    return <div class="user-card">...</div>
  }
}
```

### CSS/Tailwind Style

```css
/* ✅ Good - Use Tailwind classes */
<div className="flex items-center justify-between p-4">

/* ❌ Bad - Avoid inline styles */
<div style={{ display: 'flex', padding: '16px' }}>
```

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples
```bash
# Feature
git commit -m "feat(providers): add LinkedIn Insight Tag support"

# Bug fix
git commit -m "fix(ui): resolve memory leak in event list"

# Documentation
git commit -m "docs: update provider implementation guide"

# Breaking change
git commit -m "feat!: migrate to new storage format

BREAKING CHANGE: Storage format v2 is not compatible with v1"
```

## 🔀 Pull Request Process

### Before Submitting

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run checks**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm build
   ```

3. **Update documentation**
   - Add/update relevant docs
   - Update CHANGELOG.md for significant changes

### PR Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All checks passing

## Screenshots
[If applicable]

## Related Issues
Fixes #(issue number)
```

### Review Process

1. **Automated Checks**: CI/CD runs automatically
2. **Code Review**: At least one maintainer review
3. **Testing**: Manual testing if needed
4. **Merge**: Squash and merge to main

## 🧪 Testing Guidelines

### Unit Tests
```typescript
describe('ProviderRegistry', () => {
  it('should register a provider', () => {
    const provider = new TestProvider()
    registry.register(provider)
    expect(registry.getProvider('test')).toBe(provider)
  })
})
```

### Integration Tests
```typescript
describe('Extension Integration', () => {
  it('should capture network requests', async () => {
    // Test implementation
  })
})
```

### E2E Tests
```typescript
describe('User Workflow', () => {
  it('should display events in real-time', async () => {
    // Test implementation
  })
})
```

## 📚 Learning Resources

### Getting Started with Development
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [pnpm Workspaces](https://pnpm.io/workspaces)

### Understanding the Codebase
- Read the [Architecture Documentation](../architecture/README.md)
- Review existing providers in `packages/providers/src/`
- Explore the UI components in `packages/ui/src/`
- Check the CLAUDE.md files in each package

## 🌍 Community

### Communication Channels
- **GitHub Discussions**: General discussions and questions
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time chat and support
- **Twitter**: Updates and announcements

### Getting Help
- Check the [documentation](../README.md)
- Search existing issues
- Ask in GitHub Discussions
- Join our Discord server

### Recognition

We recognize all contributors in our README. Contributors include:
- Code contributors
- Documentation writers
- Bug reporters
- Feature suggesters
- Community helpers

## 🏆 Contributor Levels

### 🌱 First-time Contributor
- Fix typos or small bugs
- Improve documentation
- Add tests

### 🌿 Regular Contributor
- Implement features
- Fix complex bugs
- Review PRs

### 🌳 Core Contributor
- Architecture decisions
- Major features
- Mentoring

### 🏔️ Maintainer
- Merge rights
- Release management
- Strategic planning

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Thank you for taking the time to contribute to PixelTracer! Your efforts help make web analytics debugging better for everyone.

---

*Last updated: August 2025*

*Questions? Reach out to [contribute@pixeltracer.dev](mailto:contribute@pixeltracer.dev)*