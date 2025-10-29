# Contributing to CivicLens

Thank you for your interest in contributing to CivicLens! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/yourusername/civiclens.git
   cd civiclens
   ```
3. **Create a branch** for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Workflow

### Backend Development

```bash
cd civiclens-backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Start development server
uvicorn app.main:app --reload
```

### Frontend Development (Admin Dashboard)

```bash
cd civiclens-admin

# Install dependencies
npm install

# Run development server
npm run dev

# Run linter
npm run lint

# Run tests
npm test
```

### Frontend Development (Citizen Portal)

```bash
cd civiclens-client

# Install dependencies
npm install

# Run development server
npm run dev

# Run linter
npm run lint

# Run tests
npm test
```

## 🎯 Contribution Guidelines

### Code Style

**Python (Backend):**
- Follow PEP 8 style guide
- Use type hints for function parameters and return values
- Maximum line length: 100 characters
- Use meaningful variable and function names
- Add docstrings for classes and functions

**TypeScript/JavaScript (Frontend):**
- Use TypeScript for type safety
- Follow ESLint configuration
- Use functional components with hooks
- Use meaningful component and variable names
- Add JSDoc comments for complex functions

### Commit Messages

Follow the conventional commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add endpoint for bulk report updates

fix(dashboard): resolve issue with date picker not updating

docs(readme): update installation instructions

test(auth): add tests for 2FA functionality
```

### Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Ensure all tests pass** before submitting
4. **Update CHANGELOG.md** with your changes
5. **Create a pull request** with a clear title and description

**PR Title Format:**
```
[Type] Brief description of changes
```

**PR Description Should Include:**
- What changes were made
- Why the changes were necessary
- How to test the changes
- Screenshots (if UI changes)
- Related issues (if any)

### Testing Requirements

- **Backend**: All new features must have unit tests
- **Frontend**: Add tests for complex components and logic
- **E2E Tests**: Update if changing user flows
- **Test Coverage**: Aim for >80% coverage on new code

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the bug
3. **Expected behavior** vs actual behavior
4. **Screenshots** or error messages
5. **Environment details** (OS, browser, versions)
6. **Possible solution** (if you have one)

Use the bug report template when creating issues.

## 💡 Suggesting Features

When suggesting features, please include:

1. **Clear description** of the feature
2. **Use case** - why is this needed?
3. **Proposed solution** - how should it work?
4. **Alternatives considered**
5. **Additional context** (mockups, examples)

Use the feature request template when creating issues.

## 📋 Development Setup Checklist

- [ ] PostgreSQL with PostGIS installed and running
- [ ] Redis installed and running
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Super admin user created
- [ ] All services running without errors

## 🔍 Code Review Process

1. **Automated checks** must pass (linting, tests, build)
2. **At least one maintainer** must review and approve
3. **Address feedback** from reviewers
4. **Squash commits** before merging (if requested)
5. **Delete branch** after merge

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- CHANGELOG.md for their contributions
- GitHub contributors page

## 📞 Questions?

- Open a [GitHub Discussion](https://github.com/yourusername/civiclens/discussions)
- Check existing [Issues](https://github.com/yourusername/civiclens/issues)
- Review [Documentation](docs/)

## 🎉 Thank You!

Your contributions make CivicLens better for everyone. We appreciate your time and effort!

---

**Happy Contributing! 🚀**
