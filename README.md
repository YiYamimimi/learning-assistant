# Monorepo Project

A modern monorepo with React frontend and Next.js backend.

## Project Structure

```
.
├── apps/
│   ├── frontend/          # React 19 + Vite + CRXJS + Tailwind CSS
│   └── backend/           # Next.js 15 + Supabase + OpenAI + Turbopack
├── packages/
│   └── shared/            # Shared TypeScript types and utilities
├── .husky/                # Git hooks
├── package.json           # Root package.json
└── pnpm-workspace.yaml    # PNPM workspace configuration
```

## Tech Stack

### Frontend

- React 19
- Vite
- CRXJS (Chrome Extension)
- Tailwind CSS
- TypeScript

### Backend

- Next.js 15
- Turbopack
- Supabase
- OpenAI
- TypeScript

### Development Tools

- PNPM (Package Manager)
- ESLint (with no-console rule)
- Prettier
- Husky (Git hooks)
- Commitlint (Commit message linting)
- Lint-staged

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables for backend
cp apps/backend/.env.example apps/backend/.env.local
# Edit apps/backend/.env.local with your credentials
```

### Development

```bash
# Start all applications
pnpm dev

# Start specific application
pnpm --filter frontend dev
pnpm --filter backend dev
```

### Build

```bash
# Build all applications
pnpm build

# Build specific application
pnpm --filter frontend build
pnpm --filter backend build
```

### Linting & Formatting

```bash
# Lint all applications
pnpm lint

# Format all files
pnpm format

# Type check
pnpm typecheck
```

## Git Hooks

This project uses Husky for Git hooks:

- **pre-commit**: Runs lint-staged to lint and format staged files
- **commit-msg**: Validates commit messages using Commitlint

## Commit Message Convention

Follow the conventional commit format with required scope:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**⚠️ Important: Scope is required!**

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `build`: Build system changes
- `ci`: CI/CD changes

### Scopes (Required)

- `frontend`: Changes to the frontend app (React + Vite + CRXJS)
- `backend`: Changes to the backend app (Next.js + Supabase + OpenAI)
- `shared`: Changes to shared packages
- `monorepo`: Changes to monorepo configuration (root level)
- `deps`: Dependency updates
- `config`: Configuration changes

### Examples

```
feat(frontend): add user login component

Implement login form with email/password authentication.
Add error handling and loading states.

Closes #123
```

```
fix(backend): resolve API authentication issue

Fix JWT token validation in authentication middleware.
Users were unable to login with valid credentials.

Fixes #456
```

```
style(frontend): improve button component styling

Update button styles to match new design system.
Use consistent colors and spacing.
```

```
chore(deps): upgrade React to version 19

Update all React-related packages to latest version.
Test compatibility with existing components.
```

```
refactor(backend): optimize database queries

Improve query performance by adding indexes.
Reduce response time by 40%.
```

## Code Quality

- ESLint is configured to disallow `console.log()` statements
- Prettier is configured for consistent code formatting
- TypeScript strict mode is enabled
- All files are automatically linted and formatted on commit

## Environment Variables

### Backend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## API Endpoints

### Backend API

- `GET /api/items` - Fetch items from Supabase
- `POST /api/items` - Create a new item
- `POST /api/chat` - Chat with OpenAI

## License

MIT
