# Contributing to CivicLens

Thank you for your interest in contributing to CivicLens! We welcome contributions from the community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism gracefully

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/tejasbhor/Civiclens_.git
   cd Civiclens_
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/tejasbhor/Civiclens_.git
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 💻 Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ with PostGIS
- Redis 6+ (optional but recommended)
- Git

### Backend Setup

```bash
cd civiclens-backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Run migrations
alembic upgrade head

# Run setup script
python setup_production.py

# Start development server
uvicorn app.main:app --reload
```

### Frontend Setup (Admin Dashboard)

```bash
cd civiclens-admin

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Frontend Setup (Citizen Portal)

```bash
cd civiclens-client

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## 🤝 How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the bug report template**
3. **Include**:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Python version, etc.)

### Suggesting Features

1. **Check existing feature requests**
2. **Use the feature request template**
3. **Include**:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Mockups or examples if applicable

### Code Contributions

1. **Pick an issue** or create one
2. **Comment** on the issue to let others know you're working on it
3. **Follow the development setup** above
4. **Make your changes** following our coding standards
5. **Test your changes** thoroughly
6. **Submit a pull request**

## 📝 Coding Standards

### Python (Backend)

- Follow **PEP 8** style guide
- Use **type hints** for function parameters and return values
- Write **docstrings** for all functions, classes, and modules
- Use **async/await** for I/O operations
- Keep functions **small and focused**
- Use **meaningful variable names**

Example:
```python
async def create_report(
    db: AsyncSession,
    report_data: ReportCreate,
    user_id: int
) -> Report:
    """
    Create a new civic issue report.
    
    Args:
        db: Database session
        report_data: Report creation data
        user_id: ID of the user creating the report
        
    Returns:
        Created report object
        
    Raises:
        ValidationException: If data is invalid
    """
    # Implementation
    pass
```

### TypeScript/JavaScript (Frontend)

- Follow **Airbnb style guide**
- Use **TypeScript** for type safety
- Use **functional components** with hooks
- Keep components **small and reusable**
- Use **meaningful component names**
- Write **JSDoc comments** for complex functions

Example:
```typescript
interface ReportCardProps {
  report: Report;
  onStatusChange: (id: number, status: ReportStatus) => void;
}

/**
 * Display card for a single report with status management
 */
export const ReportCard: React.FC<ReportCardProps> = ({ 
  report, 
  onStatusChange 
}) => {
  // Implementation
};
```

### General Guidelines

- **DRY** (Don't Repeat Yourself)
- **KISS** (Keep It Simple, Stupid)
- **SOLID** principles
- **Separation of concerns**
- **Error handling** - Always handle errors gracefully
- **Logging** - Use structured logging (no print statements)
- **Security** - Never commit secrets or credentials

## 📝 Commit Guidelines

We follow **Conventional Commits** specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
feat(api): add duplicate detection endpoint

Implement endpoint for detecting duplicate reports using
Sentence-BERT embeddings and PostGIS spatial queries.

Closes #123

fix(auth): resolve session hijacking vulnerability

Add session fingerprinting to prevent session hijacking attacks.
Includes user agent and IP address validation.

Fixes #456

docs(readme): update installation instructions

Add Redis installation steps and troubleshooting section.
```

### Rules

- Use **present tense** ("add feature" not "added feature")
- Use **imperative mood** ("move cursor to..." not "moves cursor to...")
- Keep **subject line under 72 characters**
- Reference **issue numbers** in footer
- Explain **what and why**, not how

## 🔄 Pull Request Process

### Before Submitting

1. **Update your branch** with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests** and ensure they pass:
   ```bash
   # Backend
   cd civiclens-backend
   pytest
   
   # Frontend
   cd civiclens-admin
   npm test
   ```

3. **Check code quality**:
   ```bash
   # Python
   flake8 app/
   mypy app/
   
   # TypeScript
   npm run lint
   npm run type-check
   ```

4. **Update documentation** if needed

### Submitting

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request** on GitHub

3. **Fill out the PR template** completely:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)
   - Breaking changes (if any)

4. **Wait for review** - Be patient and responsive to feedback

### PR Requirements

- ✅ All tests passing
- ✅ Code follows style guidelines
- ✅ Documentation updated
- ✅ No merge conflicts
- ✅ Commit messages follow guidelines
- ✅ PR description is clear and complete

### Review Process

1. **Automated checks** run first (CI/CD)
2. **Code review** by maintainers
3. **Feedback** and requested changes
4. **Approval** after all checks pass
5. **Merge** by maintainers

## 🧪 Testing

### Backend Testing

```bash
cd civiclens-backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_reports.py

# Run specific test
pytest tests/test_reports.py::test_create_report
```

### Frontend Testing

```bash
cd civiclens-admin

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Test Guidelines

- Write tests for **all new features**
- Maintain **test coverage above 80%**
- Use **descriptive test names**
- Test **edge cases** and error conditions
- Mock **external dependencies**
- Keep tests **fast and isolated**

## 📚 Documentation

### What to Document

- **New features** - Usage examples and API reference
- **Breaking changes** - Migration guide
- **Configuration** - New environment variables
- **Architecture** - Design decisions
- **Troubleshooting** - Common issues and solutions

### Documentation Style

- Use **clear and concise** language
- Include **code examples**
- Add **screenshots** for UI features
- Keep **README.md** up to date
- Update **API documentation**
- Add **inline comments** for complex logic

### Where to Document

- **README.md** - Overview and quick start
- **docs/** - Detailed documentation
- **Inline comments** - Code explanations
- **Docstrings** - Function/class documentation
- **CHANGELOG.md** - Version history
- **API docs** - OpenAPI/Swagger

## 🎯 Areas for Contribution

### High Priority

- 🐛 Bug fixes
- 📝 Documentation improvements
- 🧪 Test coverage
- ♿ Accessibility improvements
- 🌐 Internationalization (i18n)

### Feature Ideas

- 📱 Mobile apps (iOS/Android)
- 💬 WhatsApp integration
- 🤖 Advanced AI models
- 🏙️ Multi-city support
- 📊 Advanced analytics
- 🎮 Gamification features

### Good First Issues

Look for issues labeled `good-first-issue` - these are beginner-friendly tasks perfect for first-time contributors.

## 💬 Communication

- **GitHub Issues** - Bug reports and feature requests
- **Pull Requests** - Code contributions and discussions
- **Discussions** - General questions and ideas

## 📄 License

By contributing to CivicLens, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Your contributions make CivicLens better for everyone. We appreciate your time and effort!

---

**Questions?** Feel free to ask in the issues or discussions section.

**Need help?** Check out our [documentation](docs/) or reach out to the maintainers.
