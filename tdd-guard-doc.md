Directory structure:
└── nizos-tdd-guard/
    ├── README.md
    ├── CLAUDE.md
    ├── CONTRIBUTING.md
    ├── DEVELOPMENT.md
    ├── docs/
    │   ├── ai-model.md
    │   ├── claude-binary.md
    │   ├── configuration.md
    │   ├── ignore-patterns.md
    │   ├── linting.md
    │   ├── quick-commands.md
    │   ├── session-clearing.md
    │   └── adr/
    │       ├── 001-claude-session-subdirectory.md
    │       ├── 002-secure-claude-binary-path.md
    │       ├── 003-remove-configurable-data-directory.md
    │       ├── 004-monorepo-architecture.md
    │       ├── 005-claude-project-dir-support.md
    │       └── 006-phpunit-separate-repository.md
    ├── reporters/
    │   ├── go/
    │   │   └── README.md
    │   ├── jest/
    │   │   └── README.md
    │   ├── phpunit/
    │   │   ├── README.md
    │   │   └── SYNC_README.md
    │   ├── pytest/
    │   │   └── README.md
    │   └── vitest/
    │       └── README.md
    └── .devcontainer/
        └── README.md


Files Content:

================================================
FILE: README.md
================================================
# TDD Guard

[![npm version](https://badge.fury.io/js/tdd-guard.svg)](https://www.npmjs.com/package/tdd-guard)
[![CI](https://github.com/nizos/tdd-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/tdd-guard/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/tdd-guard/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/tdd-guard/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Automated Test-Driven Development enforcement for Claude Code.

## Overview

TDD Guard ensures Claude Code follows Test-Driven Development principles. When your agent tries to skip tests or over-implement, TDD Guard blocks the action and explains what needs to happen instead—enforcing the red-green-refactor cycle automatically.

<p align="center">
  <a href="https://nizar.se/uploads/videos/tdd-guard-demo.mp4">
    <img src="docs/assets/tdd-guard-demo-screenshot.gif" alt="TDD Guard Demo" width="600">
  </a>
  <br>
  <em>Click to watch TDD Guard in action</em>
</p>

## Features

- **Test-First Enforcement** - Blocks implementation without failing tests
- **Minimal Implementation** - Prevents code beyond current test requirements
- **Lint Integration** - Enforces refactoring using your linting rules
- **Multi-Language Support** - TypeScript, JavaScript, Python, PHP, and Go
- **Session Control** - Toggle on and off mid-session
- **Configurable Validation** - Configure which files to validate with ignore patterns
- **Flexible Validation** - Use local Claude or Anthropic API

## Requirements

- Node.js 18+
- Claude Code or Anthropic API key
- Test framework (Jest, Vitest, pytest, PHPUnit, or Go 1.24+)

## Quick Start

### 1. Install TDD Guard

```bash
npm install -g tdd-guard
```

### 2. Add Test Reporter

TDD Guard needs to capture test results from your test runner. Choose your language below:

<details>
<summary><b>JavaScript/TypeScript</b></summary>

Choose your test runner:

#### Vitest

Install the [tdd-guard-vitest](https://www.npmjs.com/package/tdd-guard-vitest) reporter in your project:

```bash
npm install --save-dev tdd-guard-vitest
```

Add to your `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import { VitestReporter } from 'tdd-guard-vitest'

export default defineConfig({
  test: {
    reporters: [
      'default',
      new VitestReporter('/Users/username/projects/my-app'),
    ],
  },
})
```

#### Jest

Install the [tdd-guard-jest](https://www.npmjs.com/package/tdd-guard-jest) reporter in your project:

```bash
npm install --save-dev tdd-guard-jest
```

Add to your `jest.config.ts`:

```typescript
import type { Config } from 'jest'

const config: Config = {
  reporters: [
    'default',
    [
      'tdd-guard-jest',
      {
        projectRoot: '/Users/username/projects/my-app',
      },
    ],
  ],
}

export default config
```

**Note:** For both Vitest and Jest, specify the project root path when your test config is not at the project root (e.g., in workspaces or monorepos). This ensures TDD Guard can find the test results. See the reporter configuration docs for more details:

- [Vitest configuration](reporters/vitest/README.md#configuration)
- [Jest configuration](reporters/jest/README.md#configuration)

</details>

<details>
<summary><b>Python (pytest)</b></summary>

Install the [tdd-guard-pytest](https://pypi.org/project/tdd-guard-pytest) reporter:

```bash
pip install tdd-guard-pytest
```

Configure the project root in your `pyproject.toml`:

```toml
[tool.pytest.ini_options]
tdd_guard_project_root = "/Users/username/projects/my-app"
```

**Note:** Specify the project root path when your tests run from a subdirectory or in a monorepo setup. This ensures TDD Guard can find the test results. See the [pytest reporter configuration](reporters/pytest/README.md#configuration) for alternative configuration methods (pytest.ini, setup.cfg).

</details>

<details>
<summary><b>PHP (PHPUnit)</b></summary>

Install the tdd-guard/phpunit reporter in your project:

```bash
composer require --dev tdd-guard/phpunit
```

For PHPUnit 9.x, add to your `phpunit.xml`:

```xml
<listeners>
    <listener class="TddGuard\PHPUnit\TddGuardListener">
        <arguments>
            <string>/Users/username/projects/my-app</string>
        </arguments>
    </listener>
</listeners>
```

For PHPUnit 10.x/11.x/12.x, add to your `phpunit.xml`:

```xml
<extensions>
    <bootstrap class="TddGuard\PHPUnit\TddGuardExtension">
        <parameter name="projectRoot" value="/Users/username/projects/my-app"/>
    </bootstrap>
</extensions>
```

**Note:** Specify the project root path when your phpunit.xml is not at the project root (e.g., in subdirectories or monorepos). This ensures TDD Guard can find the test results. The reporter saves results to `.claude/tdd-guard/data/test.json`.

</details>

<details>
<summary><b>Go</b></summary>

Install the tdd-guard-go reporter:

```bash
go install github.com/nizos/tdd-guard/reporters/go/cmd/tdd-guard-go@latest
```

Pipe `go test -json` output to the reporter:

```bash
go test -json ./... 2>&1 | tdd-guard-go -project-root /Users/username/projects/my-app
```

For Makefile integration:

```makefile
test:
	go test -json ./... 2>&1 | tdd-guard-go -project-root /Users/username/projects/my-app
```

**Note:** The reporter acts as a filter that passes test output through unchanged while capturing results for TDD Guard. See the [Go reporter configuration](reporters/go/README.md#configuration) for more details.

</details>

### 3. Configure Claude Code Hook

Use the `/hooks` command in Claude Code:

1. Type `/hooks` in Claude Code
2. Select `PreToolUse - Before tool execution`
3. Choose `+ Add new matcher...` and enter: `Write|Edit|MultiEdit|TodoWrite`
4. Select `+ Add new hook...` and enter: `tdd-guard`
5. Choose where to save (Project settings recommended)

## Configuration

**Quick Setup:**

- [Toggle commands](docs/quick-commands.md) - Enable/disable with `tdd-guard on/off`
- [Session clearing](docs/session-clearing.md) - Automatic cleanup on new sessions
- [Ignore patterns](docs/ignore-patterns.md) - Control which files are validated

**Advanced:**

- [ESLint integration](docs/linting.md) - Automated refactoring support
- [AI Models](docs/ai-model.md) - Switch between Claude CLI and Anthropic API
- [All Settings](docs/configuration.md) - Complete configuration reference

**Note:** If TDD Guard can't find Claude, see [Claude Binary Setup](docs/claude-binary.md).

## Security Notice

As stated in the [Claude Code Hooks documentation](https://docs.anthropic.com/en/docs/claude-code/hooks#security-considerations):

> Hooks execute shell commands with your full user permissions without confirmation. You are responsible for ensuring your hooks are safe and secure. Anthropic is not liable for any data loss or system damage resulting from hook usage.

We share this information for transparency. Please read the full [security considerations](https://docs.anthropic.com/en/docs/claude-code/hooks#security-considerations) before using hooks.

TDD Guard runs with your user permissions and has access to your file system. We follow security best practices including automated security scanning, dependency audits, and test-driven development. Review the source code if you have security concerns.

## Roadmap

- Add support for more testing frameworks (Mocha, unittest, etc.)
- Add support for additional programming languages (Ruby, Rust, Java, C#, etc.)
- Encourage meaningful refactoring opportunities when tests are green
- Add support for multiple concurrent sessions per project

## Development

- [Development Guide](DEVELOPMENT.md) - Setup instructions and development guidelines
- [Architecture Decision Records](docs/adr/) - Technical design decisions and rationale

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

**Contributors:**

- Python/pytest support: [@Durafen](https://github.com/Durafen)
- PHP/PHPUnit support: [@wazum](https://github.com/wazum)

## License

[MIT](LICENSE)



================================================
FILE: CLAUDE.md
================================================
# TDD Guard

## Project Goal

TDD Guard is a Claude Code hook that enforces Test-Driven Development by intercepting file operations.
When Claude Code attempts to edit or write files, TDD Guard:

1. **Captures**: Intercepts Edit, MultiEdit, and Write operations
2. **Analyzes**: Examines test results, file paths, and code changes
3. **Validates**: Checks TDD compliance using an AI model
4. **Blocks**: Prevents operations that skip tests or over-implement
5. **Guides**: Explains violations and suggests corrections

This automated enforcement maintains code quality without cluttering prompts with TDD reminders.

## Development Workflow

### Commit Guidelines

- **Atomic commits**: Each commit represents one logical change with its tests
- **Test and implementation together**: Never separate tests from the code they test
- **Explain why, not what**: Commit messages should explain the reason for the change
- **Conventional format**: Use prefixes to categorize changes: feat, fix, refactor, test, chore, docs

Example: `feat: add network request filtering to reduce noise in captured data` (explains why, not just what)

## Project Structure

The codebase is organized with core functionality in src/ and language-specific reporters:

```
reporters/                        # Language-specific test reporters
├── go/                           # tdd-guard-go - Go test reporter
├── jest/                         # tdd-guard-jest - Jest reporter (npm)
├── phpunit/                      # tdd-guard/phpunit - PHPUnit reporter (composer)
├── pytest/                       # tdd-guard-pytest - Pytest reporter (pip)
├── test/                         # Shared test artifacts and integration tests
└── vitest/                       # tdd-guard-vitest - Vitest reporter (npm)

src/                              # Main CLI application
├── cli/                          # Hook entry point and context builder
├── config/                       # Configuration management
├── contracts/                    # Types and Zod schemas
├── guard/                        # Guard enable/disable management
├── hooks/                        # Claude Code hook parsing and processing
├── linters/                      # ESLint integration for code quality
├── processors/                   # Test result and lint processing
├── providers/                    # Model and linter client factories
├── storage/                      # Storage abstractions
├── validation/                   # TDD principle validation
│   ├── validator.ts              # Sends context to AI model and parses response
│   ├── context/                  # Formats operations for AI validation
│   ├── prompts/                  # TDD validation rules and AI instructions
│   └── models/                   # Claude CLI and Anthropic API clients
└── index.ts                      # Package entry point

test/                             # Main test suite (hooks, integration, utils)
docs/                             # Documentation (ADRs, configuration, etc.)
```

### Architecture

TDD Guard is organized as a TypeScript project with integrated language-specific reporters:

- **src/**: Core functionality including contracts, config, storage, and validation
- **reporters/**: Language-specific test reporters (go, jest, phpunit, pytest, vitest)
- **test/**: Comprehensive test suite with integration tests and utilities

### Testing

#### Guidelines

- **Use test helpers**: Extract setup logic into helper functions placed at the bottom of test files
- **Use test factories**: Always use factories from `test/utils/` instead of creating data inline
- **Group tests effectively**: Use `describe` blocks and `beforeEach` for common setup
- **Keep tests concise**: Keep as little logic in the tests themselves as possible

#### Commands

```bash
npm run build             # Build main package and workspace reporters (jest, vitest)
npm run test              # All unit tests and base integration tests
npm run test:unit         # Fast unit tests only
npm run test:integration  # Slow integration tests (run after major prompt changes)
npm run test:reporters    # Test all reporter implementations
npm run lint              # Check code style and quality
npm run format            # Auto-format code with Prettier
npm run checks            # Run all checks: typecheck, lint, format, and test
```

### Key Design Principles

- **Interface-driven**: Core functionality defined by interfaces (`Storage`, `ModelClient`)
- **Dependency injection**: Components receive dependencies as parameters
- **Single responsibility**: Each module has one clear purpose
- **Type safety**: Comprehensive TypeScript types with runtime validation



================================================
FILE: CONTRIBUTING.md
================================================
# Contributing

## Core Requirements

Implementation must be test driven with all relevant and affected tests passing. Run linting and formatting (`npm run checks`) and ensure the build succeeds (`npm run build`).

## Pull Requests

Create focused PRs with meaningful titles that describe what the change accomplishes. The description must explain what the PR introduces and why it's needed. Document any important design decisions or architectural choices. Keep PRs small and focused for easier review and incremental feedback.

## Commit Messages

Use conventional commits and communicate the why, not just what. Focus on the reasoning behind changes rather than describing what was changed.

## Reporter Contributions

Project root path can be specified so that tests can be run from any directory in the project. For security, validate that the project root path is absolute and that it is the current working directory or an ancestor of it. Relevant cases must be added to reporter integration tests.

## Style Guidelines

No emojis in code or documentation. Avoid generic or boilerplate content. Be deliberate and intentional. Keep it clean and concise.

## Development

- [Development Guide](DEVELOPMENT.md) - Setup instructions and testing
- [Dev Container setup](.devcontainer/README.md) - Consistent development environment



================================================
FILE: DEVELOPMENT.md
================================================
# Development Guide

## Prerequisites

### Main Tests

- Node.js 18+ and npm

### Reporter Tests

- Node.js 18+ and npm
- Python 3.8+ (for pytest reporter)
- PHP 8.1+ and Composer (for PHPUnit reporter)
- Go 1.21+ (for Go reporter)

## Using Dev Containers

For a consistent development environment with all dependencies pre-installed, see the [devcontainer setup guide](.devcontainer/README.md).

## Building

Before running tests, install dependencies and build the TypeScript packages:

```bash
# Install dependencies
npm install

# Build the main package and all workspaces
npm run build
```

## Running Main Tests

The main test suite covers the core TDD Guard functionality:

```bash
# Run all tests
npm test

# Run unit tests only (faster)
npm run test:unit

# Run integration tests
npm run test:integration
```

## Running Reporter Tests

Reporter tests verify the language-specific test result collectors.

### Setup

First, install the language-specific dependencies:

```bash
# Install PHPUnit dependencies
composer install -d reporters/phpunit

# Set up Python virtual environment and install pytest
python3 -m venv reporters/pytest/.venv
reporters/pytest/.venv/bin/pip install -e reporters/pytest pytest

# Build Go reporter
go build -C reporters/go ./cmd/tdd-guard-go
```

### Running Tests

```bash
# Run all reporter tests
npm run test:reporters
```

## Code Quality

The project uses ESLint, Prettier, and TypeScript for code quality:

```bash
# Run all checks (typecheck, lint, format, test)
npm run checks

# Individual commands
npm run typecheck      # Type checking
npm run lint           # Lint and auto-fix
npm run format         # Format code with Prettier
```

## Troubleshooting

### PHPUnit Issues

If you get composer errors:

- Ensure PHP 8.1+ is installed: `php --version`
- Ensure Composer is installed: `composer --version`

### Python/pytest Issues

If you get Python errors:

- Ensure Python 3.8+ is installed: `python3 --version`
- On some systems, you may need to install python3-venv: `sudo apt install python3-venv`



================================================
FILE: docs/ai-model.md
================================================
# AI Model Configuration

TDD Guard validates changes using AI. Choose between Claude Code CLI (default) or Anthropic API.

## Claude Code CLI (Default)

No setup required - uses your existing Claude Code session.

```bash
MODEL_TYPE=claude_cli  # Default, can be omitted
```

If Claude is not found, see the [Claude Binary Configuration](claude-binary.md) guide.

## Anthropic API

Faster validation using direct API access. Requires separate billing from Claude Code.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/)
2. Add to `.env`:

```bash
TDD_GUARD_ANTHROPIC_API_KEY=your_api_key_here
MODEL_TYPE=anthropic_api
```

**Note:** Uses `TDD_GUARD_ANTHROPIC_API_KEY` to avoid conflicts with Claude CLI authentication.

## When to Use Which

**Claude CLI**: Default choice. Free with Claude Code subscription.

**Anthropic API**: Use for CI/CD environments or when you need faster validation.

## Costs

- **Claude CLI**: Included with Claude Code
- **Anthropic API**: Token-based billing ([pricing](https://www.anthropic.com/pricing))



================================================
FILE: docs/claude-binary.md
================================================
# Claude Binary Configuration

Claude Code can be installed in different ways depending on your system and installation method.
TDD Guard needs to locate your Claude binary to validate changes. This guide helps you configure TDD Guard to work with your installation.

## Finding Your Claude Installation

First, locate where Claude is installed on your system:

```bash
# Check system-wide installation
which claude

# Check local installation
ls ~/.claude/local/claude
```

One of these should show your Claude installation path.

## Configuration Options

If TDD Guard cannot find your Claude installation, choose one of these solutions:

### Option 1: Environment Variable

If Claude is in your PATH, add to your `.env` file:

```bash
USE_SYSTEM_CLAUDE=true
```

### Option 2: Symlink

Point TDD Guard to your Claude installation:

```bash
# Create the directory if it doesn't exist
mkdir -p ~/.claude/local

# Create symlink (replace /path/to/your/claude with your actual path)
ln -s /path/to/your/claude ~/.claude/local/claude
```

Example for Homebrew on macOS:

```bash
ln -s /opt/homebrew/bin/claude ~/.claude/local/claude
```

### Option 3: Migrate Installation

Use Claude Code's built-in command to set up Claude in the standard location:

```bash
/migrate-installer
```

## Troubleshooting

If Claude CLI fails unexpectedly, check for environment variable conflicts:

```bash
# Claude uses your authenticated session, not an API key
unset ANTHROPIC_API_KEY
```

## Getting Help

If you continue to experience issues:

1. Run `which claude` and note the output
2. Check if `~/.claude/local/claude` exists
3. Open an issue at [github.com/nizos/tdd-guard/issues](https://github.com/nizos/tdd-guard/issues) with this information



================================================
FILE: docs/configuration.md
================================================
# Configuration Guide

This guide covers the configuration options for TDD Guard.

## Environment Variables

TDD Guard uses environment variables for configuration.
Create a `.env` file in your project root:

```bash
# Model selection for TDD validation
# Options: 'claude_cli' (default) or 'anthropic_api'
MODEL_TYPE=claude_cli

# Override model type for integration tests (optional)
# If not set, uses MODEL_TYPE value
# TEST_MODEL_TYPE=anthropic_api

# Use system Claude installation
# Only applies when using 'claude_cli' model type
# Set to 'true' to use the system Claude (claude in PATH)
# Set to 'false' to use the Claude from ~/.claude/local/claude
USE_SYSTEM_CLAUDE=false

# Anthropic API Key
# Required when MODEL_TYPE or TEST_MODEL_TYPE is set to 'anthropic_api'
# Get your API key from https://console.anthropic.com/
TDD_GUARD_ANTHROPIC_API_KEY=your-api-key-here

# Linter type for refactoring phase support (optional)
# Options: 'eslint' or unset (no linting)
# See docs/linting.md for detailed setup and configuration
LINTER_TYPE=eslint
```

## Model Configuration

### Claude CLI

The default model uses the Claude Code command-line interface:

- **System Claude**: Set `USE_SYSTEM_CLAUDE=true` to use Claude from your PATH
- **Local Claude**: Set `USE_SYSTEM_CLAUDE=false` to use Claude from `~/.claude/local/claude`

### Anthropic API

For consistent cloud-based validation:

- Requires valid `TDD_GUARD_ANTHROPIC_API_KEY`

### Test-specific Configuration

You can use different models for tests and production:

```bash
MODEL_TYPE=claude_cli          # Production uses CLI
TEST_MODEL_TYPE=anthropic_api  # Tests use API
```

This is useful for:

- Running faster integration tests with API
- Avoiding local Claude dependencies in CI

## Hook Configuration

### Interactive Setup (Recommended)

Use Claude Code's `/hooks` command to set up both hooks:

#### PreToolUse Hook (TDD Validation)

1. Type `/hooks` in Claude Code
2. Select `PreToolUse - Before tool execution`
3. Choose `+ Add new matcher...`
4. Enter: `Write|Edit|MultiEdit|TodoWrite`
5. Select `+ Add new hook...`
6. Enter command: `tdd-guard`
7. Choose where to save:
   - **Project settings** (`.claude/settings.json`) - Recommended for team consistency
   - **Local settings** (`.claude/settings.local.json`) - For personal preferences
   - **User settings** (`~/.claude/settings.json`) - For global configuration

### Manual Configuration

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit|TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "tdd-guard"
          }
        ]
      }
    ]
  }
}
```

**Tip:** Also configure [quick commands](quick-commands.md) for `tdd-guard on/off` and [ESLint integration](linting.md) for automated refactoring support.

## Test Reporter Configuration

- **JavaScript/TypeScript**:
  - [Vitest reporter configuration](../reporters/vitest/README.md#configuration)
  - [Jest reporter configuration](../reporters/jest/README.md#configuration)
- **Python**: See [Pytest reporter configuration](../reporters/pytest/README.md#configuration)
- **PHP**: See [PHPUnit reporter configuration](../reporters/phpunit/README.md#configuration)

## Data Storage

TDD Guard stores context data in `.claude/tdd-guard/data/`:

- `test.json` - Latest test results from your test runner (Vitest or pytest)
- `todos.json` - Current todo state
- `modifications.json` - File modification history
- `lint.json` - ESLint results (only created when LINTER_TYPE=eslint)

This directory is created automatically and should be added to `.gitignore`.

## Troubleshooting

### Claude CLI Issues

#### Finding Your Claude Installation

To determine which Claude installation you're using:

```bash
# Check global Claude
which claude

# Check local Claude
ls ~/.claude/local/claude
```

#### Testing Claude CLI

Test if Claude is working correctly:

```bash
# For system Claude
claude -p "which directory are we in?"

# For local Claude
~/.claude/local/claude -p "which directory are we in?"
```

#### API Key Conflicts

When using Claude CLI (not the API), ensure no `ANTHROPIC_API_KEY` environment variable is set. The Claude binary may attempt to use this key instead of your authenticated session:

```bash
# Check if API key is set
echo $ANTHROPIC_API_KEY

# Temporarily unset it
unset ANTHROPIC_API_KEY
```

### Dependency Versions

#### Vitest

Use the latest Vitest version to ensure correct test output format for TDD Guard:

```bash
npm install --save-dev vitest@latest
```

#### pytest

For Python projects, ensure you have a recent version of pytest:

```bash
pip install pytest>=7.0.0
```

### Common Issues

1. **TDD Guard not triggering**: Check that hooks are properly configured in `.claude/settings.json`
2. **Test results not captured**: Ensure `VitestReporter` is added to your Vitest config
3. **Claude CLI failures**: Verify Claude installation and check for API key conflicts
4. **"Command not found" errors**: Make sure `tdd-guard` is installed globally with `npm install -g tdd-guard`
5. **Changes not taking effect**: Restart your Claude session after modifying hooks or environment variables

### Updating TDD Guard

To update to the latest version:

```bash
# Update CLI tool
npm update -g tdd-guard

# For JavaScript/TypeScript projects, update the Vitest reporter in your project
npm update tdd-guard-vitest

# For Python projects, update the pytest reporter
pip install --upgrade tdd-guard-pytest
```

Check your current version:

```bash
npm list -g tdd-guard
pip show tdd-guard-pytest
```

## Advanced Configuration

### Custom Validation Rules

To modify TDD validation behavior, fork the repository and edit the prompt files in `src/validation/prompts/`. Key files:

- `tdd-core-principles.ts` - Core TDD rules
- `write-analysis.ts` - Rules for Write operations
- `edit-analysis.ts` - Rules for Edit operations
- `multi-edit-analysis.ts` - Rules for MultiEdit operations



================================================
FILE: docs/ignore-patterns.md
================================================
# Ignore Patterns Guide

Configure TDD Guard to skip validation for specific files using glob patterns.

## Why Use Ignore Patterns?

Control exactly which files TDD Guard validates. Useful for monorepos, rapid prototyping, or when different parts of your codebase need different validation rules.

## Default Ignore Patterns

By default, TDD Guard ignores files with these extensions:

- `*.md` - Markdown documentation
- `*.txt` - Text files
- `*.log` - Log files
- `*.json` - JSON configuration files
- `*.yml` / `*.yaml` - YAML configuration files
- `*.xml` - XML files
- `*.html` - HTML files
- `*.css` - Stylesheets
- `*.rst` - reStructuredText documentation

## Custom Ignore Patterns

You can configure custom ignore patterns by creating a `config.json` file in the TDD Guard data directory (`.claude/tdd-guard/data/`):

```json
{
  "guardEnabled": true,
  "ignorePatterns": [
    "*.md",
    "*.css",
    "*.json",
    "*.yml",
    "**/*.generated.ts",
    "**/public/**",
    "*.config.*"
  ]
}
```

**Note**: Custom patterns replace the default patterns entirely. If you want to keep some defaults (like `*.md` or `*.json`), include them in your custom list.

## Pattern Syntax

Patterns use minimatch syntax (similar to `.gitignore`):

- `*.ext` - Match files with extension (e.g., `*.md`)
- `dir/**` - Match all files in directory (e.g., `dist/**`)
- `**/*.ext` - Match extension anywhere (e.g., `**/*.test.ts`)
- `*.{js,ts}` - Match multiple extensions (e.g., `*.{yml,yaml}`)
- `path/**/*.ext` - Match in specific path (e.g., `src/**/*.spec.js`)

## Managing Patterns

### Viewing Current Patterns

To see which patterns are currently active, check your `config.json` file:

```bash
cat .claude/tdd-guard/data/config.json
```

If no custom patterns are configured, the default patterns listed above are used.

### Updating Patterns

1. Create or edit `.claude/tdd-guard/data/config.json`
2. Add your `ignorePatterns` array
3. The changes take effect immediately

### Testing Patterns

To verify your patterns work as expected:

1. Edit a file that should be ignored
2. TDD Guard should skip validation immediately

## Summary

Ignore patterns provide the flexibility to apply TDD validation exactly where you want it in your codebase. Start with the defaults, then customize as your project's needs evolve.



================================================
FILE: docs/linting.md
================================================
# Linting and Refactoring Support

TDD Guard can optionally check code quality during the refactoring phase (when tests are green) using ESLint.
When issues are detected, the coding agent will be prompted to fix them.

## Why Use Refactoring Support?

During the TDD green phase, the coding agent may:

- Clean up implementation code
- Extract methods or constants
- Improve naming
- Remove duplication

The refactoring support helps by:

- Running ESLint automatically after file modifications
- Detecting code quality issues
- Prompting the coding agent to fix any issues found

## Setup

1. **Install ESLint** in your project:

   ```bash
   npm install --save-dev eslint@latest
   ```

2. **Enable linting** by setting the environment variable:

   ```bash
   LINTER_TYPE=eslint
   ```

   Note: Currently only ESLint is supported. Additional linters may be added in the future.

3. **Configure the PostToolUse hook**

   ### Interactive Setup (Recommended)
   1. Type `/hooks` in Claude Code
   2. Select `PostToolUse - After tool execution`
   3. Choose `+ Add new matcher...`
   4. Enter: `Write|Edit|MultiEdit`
   5. Select `+ Add new hook...`
   6. Enter command: `tdd-guard`
   7. Choose where to save (same location as your PreToolUse hook)

   ### Manual Configuration

   Add to your `.claude/settings.json`:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Write|Edit|MultiEdit",
           "hooks": [
             {
               "type": "command",
               "command": "tdd-guard"
             }
           ]
         }
       ]
     }
   }
   ```

## How It Works

When enabled:

1. After any file modification (Edit, MultiEdit, Write)
2. TDD Guard runs ESLint on modified files
3. If issues are found, the coding agent receives a notification
4. The agent will then fix the identified issues

Without `LINTER_TYPE=eslint`, TDD Guard skips all linting operations.

**Tip**: Configure ESLint with complexity rules (e.g., `complexity`, `max-depth`) and the SonarJS plugin to encourage meaningful refactoring.
These rules help identify code that could benefit from simplification during the green phase.

## ESLint Configuration

For effective refactoring support, consider adding these rules to your `.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    complexity: ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines-per-function': ['warn', 50],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 4],
  },
}
```

## Troubleshooting

### ESLint Not Running

1. Verify ESLint is installed: `npm list eslint`
2. Check that `LINTER_TYPE=eslint` is set in your `.env` file
3. Ensure the PostToolUse hook is configured
4. Restart your Claude session after making changes



================================================
FILE: docs/quick-commands.md
================================================
# TDD Guard Quick Commands

TDD Guard can be quickly enabled or disabled using simple commands in your Claude Code session.
This is particularly useful when you need to temporarily disable TDD enforcement during prototyping or exploration phases.

## Usage

Simply type one of these commands in your Claude Code prompt:

- `tdd-guard on` - Enables TDD Guard enforcement
- `tdd-guard off` - Disables TDD Guard enforcement

The commands are case-insensitive, so `TDD-Guard OFF`, `tdd-guard off`, and `Tdd-Guard Off` all work the same way.

## Setup

To enable the quick commands feature, you need to add the UserPromptSubmit hook to your Claude Code configuration.
You can set this up either through the interactive `/hooks` command or by manually editing your settings file.

### Using Interactive Setup (Recommended)

1. Type `/hooks` in Claude Code
2. Select `UserPromptSubmit - When the user submits a prompt`
3. Select `+ Add new hook...`
4. Enter command: `tdd-guard`
5. Choose where to save:
   - **Project settings** (`.claude/settings.json`) - Recommended for team consistency
   - **Local settings** (`.claude/settings.local.json`) - For personal preferences
   - **User settings** (`~/.claude/settings.json`) - For global configuration

### Manual Configuration (Alternative)

Add the following to your `.claude/settings.local.json`:

```json
{
  "hooks": {
    "userpromptsubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "tdd-guard"
          }
        ]
      }
    ]
  }
}
```

Note: Your configuration file may already have other hooks configured.
Simply add the `userpromptsubmit` section to your existing hooks object.

**Tip**: To prevent Claude from modifying the TDD Guard state, add the following to your settings file:

```json
{
  "permissions": {
    "deny": ["Read(.claude/tdd-guard/**)"]
  }
}
```



================================================
FILE: docs/session-clearing.md
================================================
# TDD Guard Session Clearing

TDD Guard automatically clears transient data when starting a new Claude Code session, preventing outdated test results from affecting TDD validation.

## What Gets Cleared

- Test results from previous sessions
- Lint reports and code quality checks
- Any other transient validation data

**Note:** The guard's enabled/disabled state is preserved across sessions.

## Setup

To enable automatic session clearing, you need to add the SessionStart hook to your Claude Code configuration.
You can set this up either through the interactive `/hooks` command or by manually editing your settings file.

### Using Interactive Setup (Recommended)

1. Type `/hooks` in Claude Code
2. Select `SessionStart - When a new session is started`
3. Select `+ Add new matcher…`
4. Enter matcher: `startup|resume|clear`
5. Select `+ Add new hook…`
6. Enter command: `tdd-guard`
7. Choose where to save:
   - **Project settings** (`.claude/settings.json`) - Recommended for team consistency
   - **Local settings** (`.claude/settings.local.json`) - For personal preferences
   - **User settings** (`~/.claude/settings.json`) - For global configuration

### Manual Configuration (Alternative)

Add the following to your `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear",
        "hooks": [
          {
            "type": "command",
            "command": "tdd-guard"
          }
        ]
      }
    ]
  }
}
```

Note: Your configuration file may already have other hooks configured.
Simply add the `SessionStart` section to your existing hooks object.

## How It Works

The SessionStart hook triggers when:

- Claude Code starts up (`startup`)
- A session is resumed (`resume`)
- The `/clear` command is used (`clear`)

When triggered, TDD Guard clears all transient data while preserving the guard state.

## Tips

- No manual intervention needed - clearing happens automatically
- To toggle the guard on/off, use the [quick commands](quick-commands.md)
- For debugging, check `.claude/tdd-guard/` to see stored data



================================================
FILE: docs/adr/001-claude-session-subdirectory.md
================================================
# ADR-001: Execute Claude CLI from Subdirectory for Session Management

## Status

Accepted

## Context

The TDD Guard validation system creates a new Claude session for each validation operation when running `claude` commands. This results in session list clutter and makes it difficult to track the actual development sessions.

We considered two approaches:

1. Clear the context before each validation using `/clear` command
2. Run the Claude CLI from a subdirectory to isolate validation sessions

The first approach has limitations:

- Cannot clear and ask a question in the same command
- Would require multiple command executions
- Still shows all sessions in the same directory listing

## Decision

We will execute all Claude validation commands from a `.claude` subdirectory within the project root.

Implementation details:

- Create `.claude` directory if it doesn't exist
- Set the `cwd` option in `execSync` to the subdirectory path
- The `.claude` directory itself is not ignored (contains settings.json which should be tracked)
- User-specific files like `.claude/settings.local.json` should already be in `.gitignore`

## Consequences

### Positive

- Validation sessions are isolated from development sessions
- No cluttering of the main project's session list
- Automatic trust inheritance from parent directory
- Simple implementation with minimal code changes
- No impact on validation functionality

### Negative

- Creates an additional directory in the project
- Slightly increases complexity in the model client
- Sessions are less visible (though this is mostly a benefit)

### Neutral

- All validation sessions will appear in the `.claude` subdirectory listing
- Developers need to know to look in `.claude` for validation session history



================================================
FILE: docs/adr/002-secure-claude-binary-path.md
================================================
# ADR-002: Secure Claude Binary Path Configuration

## Status

Accepted

## Context

CodeQL security scanning identified a potential command injection vulnerability in `ClaudeModelClient` where the Claude binary path is taken from an environment variable (`CLAUDE_BINARY_PATH`) and interpolated into a shell command executed via `execSync`.

The vulnerability occurs because:

- Environment variables can be manipulated by attackers
- Shell metacharacters in the path could be interpreted, allowing arbitrary command execution
- For example, setting `CLAUDE_BINARY_PATH="claude; rm -rf /"` would execute both commands

We considered several approaches:

1. **Use execFileSync instead of execSync** - Avoids shell interpretation entirely
2. **Validate/sanitize the binary path** - Check for allowed characters only
3. **Use shell-quote library** - Properly escape shell metacharacters
4. **Boolean flag for predefined paths** - Switch between hardcoded safe paths

## Decision

We will use a boolean environment variable `USE_LOCAL_CLAUDE` to switch between two hardcoded, safe paths:

- When `USE_LOCAL_CLAUDE=true`: Use `$HOME/.claude/local/claude`
- Otherwise: Use system `claude` command

Additionally, we will:

- Implement the path logic in `ClaudeModelClient` rather than `Config` class
- Use `execFileSync` instead of `execSync` to prevent shell interpretation
- Keep the Config class focused on just providing the boolean flag

## Consequences

### Positive

- **Eliminates injection risk** - No user-controlled input in command construction
- **Simple and secure** - Only two possible paths, both hardcoded
- **Clear intent** - Boolean flag clearly indicates local vs system Claude
- **Separation of concerns** - Config provides settings, ModelClient handles implementation
- **Future flexibility** - ModelClient can handle OS-specific paths internally

### Negative

- **Less flexible** - Users cannot specify custom installation paths
- **Requires code changes** - Adding new paths requires updating the code
- **Platform-specific paths** - May need adjustment for different operating systems

### Neutral

- Migration from `CLAUDE_BINARY_PATH` to `USE_LOCAL_CLAUDE` for existing users
- Documentation needs to be updated to reflect the new configuration approach



================================================
FILE: docs/adr/003-remove-configurable-data-directory.md
================================================
# ADR-003: Remove Configurable Data Directory

## Status

Accepted

## Context

A security review identified a potential path traversal vulnerability in TDD Guard where the data directory path is taken from an environment variable (`TDD_DATA_DIR`) and used directly for file system operations without validation.

The vulnerability occurs because:

- Environment variables can be manipulated by attackers
- Path traversal sequences (`../`) in the path could escape the intended directory
- For example, setting `TDD_DATA_DIR="../../../../etc"` would write files to system directories
- The application writes files like `test.txt`, `todo.json`, and `modifications.json` to this directory

We considered several approaches:

1. **Validate and sanitize the path** - Check for `../` sequences and resolve to absolute paths
2. **Restrict to project subdirectories** - Ensure the path stays within the project root
3. **Use a whitelist of allowed paths** - Only allow specific predefined directories
4. **Remove the configuration entirely** - Hardcode the data directory path

## Decision

We will remove the `TDD_DATA_DIR` environment variable and hardcode the data directory path to `.claude/tdd-guard/data` in the Config class.

The implementation will:

- Remove `TDD_DATA_DIR` from environment variable processing
- Hardcode `dataDir` to `.claude/tdd-guard/data` in the Config constructor
- Keep the existing Config class interface unchanged for dependent code
- Remove documentation about `TDD_DATA_DIR` from `.env.example`, README, and CLAUDE.md

## Consequences

### Positive

- **Eliminates path traversal risk** - No user-controlled input for file paths
- **Simpler implementation** - No validation or sanitization code needed
- **Consistent data location** - All TDD Guard data in a predictable location
- **Better security posture** - Follows principle of least privilege
- **No breaking changes for code** - Config class interface remains the same

### Negative

- **Less flexible** - Users cannot customize where TDD Guard stores its data
- **Potential disk space issues** - Users cannot redirect to different drives/partitions
- **Testing limitations** - Integration tests cannot use isolated data directories

### Neutral

- The data stored (test results, todos, modifications) is operational/temporary
- Most users likely never customized this path anyway
- Follows the same security-first approach as ADR-002



================================================
FILE: docs/adr/004-monorepo-architecture.md
================================================
# ADR-004: Monorepo Architecture for Multi-Language Support

## Status

Accepted

## Context

TDD Guard originally published a single package to both npm and PyPI, with all test framework reporters mixed together in the src directory. This created several problems:

- **Language mixing** - JavaScript and Python code in the same package
- **Publishing complexity** - Single codebase published to multiple package registries
- **Package bloat** - Users installed code for all languages even if using only one
- **Contribution barriers** - Adding new reporters required navigating the entire codebase

We considered several approaches:

1. **Keep monolithic structure** - Continue with mixed languages in one package
2. **Separate repositories** - Create individual repos for each reporter
3. **Monorepo with workspaces** - Keep one repo but separate packages

## Decision

We will restructure TDD Guard as a monorepo using npm workspaces, with each reporter as a separate package.

The new structure:

```
tdd-guard/                  # Main CLI package (npm)
├── src/                    # Core functionality and shared code
└── package.json

reporters/
├── vitest/                 # tdd-guard-vitest package (npm)
│   └── package.json
└── pytest/                 # tdd-guard-pytest package (PyPI)
    └── pyproject.toml
```

Implementation details:

- Main package exports shared functionality (Storage, Config, contracts)
- Each reporter is a standalone package with its own version
- Vitest reporter imports shared code from 'tdd-guard' package
- Python reporter is self-contained (no JavaScript dependencies)

## Consequences

### Positive

- **Clean separation** - Each language has its own package and tooling
- **Smaller packages** - Users only install what they need
- **Independent releases** - Can update reporters without touching others
- **Easier contributions** - Clear boundaries for adding new reporters

### Negative

- **Multiple packages to maintain** - More release overhead
- **Build complexity** - Must ensure correct build order during development

### Neutral

- Users now install two packages (CLI + reporter) instead of one
- Each package has its own documentation and version number



================================================
FILE: docs/adr/005-claude-project-dir-support.md
================================================
# ADR-005: Support CLAUDE_PROJECT_DIR for Consistent Data Storage

## Status

Accepted

## Context

TDD Guard stores data in `.claude/tdd-guard/data` relative to the current working directory. This creates issues when:

- Users run commands from subdirectories (e.g., `cd src && npm test`)
- Claude Code executes commands from different locations within a project
- Multiple `.claude` directories are created at different levels

Previously, users had to configure `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` in Claude Code to ensure commands always run from the project root. This required additional configuration and restricted how developers could use Claude Code.

Claude Code provides the `CLAUDE_PROJECT_DIR` environment variable that always points to the project root, regardless of where commands are executed. This is part of Claude Code's [security best practices](https://docs.anthropic.com/en/docs/claude-code/hooks#security-best-practices).

## Decision

We will use `CLAUDE_PROJECT_DIR` when available to determine the base path for TDD Guard's data directory.

The implementation:

- Check if `CLAUDE_PROJECT_DIR` is set and valid
- Use it as the base path for `.claude/tdd-guard/data` if available
- Fall back to current working directory if not set
- Apply security validations to prevent path traversal attacks
- Reporter-provided `projectRoot` takes precedence over `CLAUDE_PROJECT_DIR`

Security validations include:

- Validate `CLAUDE_PROJECT_DIR` is an absolute path
- Prevent path traversal by checking for `..` sequences
- Ensure current working directory is within `CLAUDE_PROJECT_DIR`

When validation fails, TDD Guard throws a descriptive error and the operation is blocked, preventing any file system access with invalid paths.

## Consequences

### Positive

- **Consistent data location** - Data is always stored at the project root
- **No user configuration needed** - Works automatically with Claude Code
- **Better developer experience** - Can run commands from any project subdirectory
- **Maintains security** - Path validation prevents directory traversal attacks

### Negative

- **Additional validation code** - Security checks add complexity, but this is centralized in the Config class

### Neutral

- Falls back gracefully when environment variable is not present
- Replaces the need for `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` configuration



================================================
FILE: docs/adr/006-phpunit-separate-repository.md
================================================
# ADR-006: Separate Repository for PHPUnit Reporter

## Status

Accepted

## Context

We received a contribution for a PHPUnit reporter that allows PHP developers to use TDD Guard with their PHPUnit test suites. However, when attempting to publish this package to Packagist (the PHP package registry), we encountered a fundamental limitation: Packagist requires the `composer.json` file to be at the root of the repository.

TDD Guard is organized as a monorepo containing:

- The main CLI tool (TypeScript/npm)
- Vitest reporter (TypeScript/npm)
- Pytest reporter (Python/PyPI)
- PHPUnit reporter (PHP/Packagist)

This structure works well for npm (which supports workspaces) and PyPI (which can build from subdirectories), but Packagist does not support monorepos or packages in subdirectories.

### Options Considered

1. **Move composer.json to repository root**
   - Would make the entire TDD Guard project appear as a PHP package
   - Users would download all code (TypeScript, Python, etc.) just to get the PHPUnit reporter
   - Conflicts with the project's primary identity as a CLI tool

2. **Private Packagist subscription**
   - Supports monorepos but requires paid subscription
   - Adds ongoing cost for an open-source project
   - Creates barrier for community adoption

3. **Manual installation instructions**
   - Users would need to configure Composer to use VCS repository
   - Poor developer experience
   - Reduces discoverability and adoption

4. **Separate repository with automated synchronization**
   - Maintains single source of truth in main repository
   - Provides standard Packagist installation experience
   - Can be automated with GitHub Actions

## Decision

We will create a separate repository (`tdd-guard-phpunit`) that mirrors the `reporters/phpunit` directory from the main repository. This mirror will be automatically synchronized using GitHub Actions whenever changes are pushed to the PHPUnit reporter in the main repository.

### Implementation Plan

1. **Initial Setup**
   - Create `tdd-guard-phpunit` repository
   - Use `git subtree split` to extract PHPUnit reporter history
   - Push to new repository maintaining commit history
   - Submit to Packagist for PHP package distribution

2. **Automated Synchronization**
   - GitHub Action triggered on pushes to `reporters/phpunit/**`
   - Uses git subtree to maintain clean history
   - Force pushes to mirror repository to ensure consistency
   - Syncs relevant tags (e.g., `phpunit-v*`)

3. **Clear Communication**
   - Mirror repository README clearly states it's read-only
   - Directs issues and PRs to main repository
   - Explains the monorepo structure and rationale

## Consequences

### Positive

- **Standard installation**: `composer require --dev tdd-guard/phpunit`
- **Packagist compatibility**: Full integration with PHP ecosystem
- **Automated updates**: No manual synchronization needed
- **Clean history**: Git subtree preserves relevant commit history
- **Single source of truth**: All development happens in main repository

### Negative

- **Additional complexity**: Must maintain synchronization workflow
- **Delayed updates**: Packagist updates depend on GitHub Action execution
- **Repository proliferation**: Additional repository to manage
- **Potential confusion**: Contributors might submit PRs to wrong repository

### Security Considerations

- Uses GitHub Personal Access Token (PAT) with minimal required permissions
- Token stored as repository secret, only accessible to repository admins
- Automated workflow reduces human error in synchronization
- Mirror repository can be made explicitly read-only if needed

## Future Considerations

If Packagist adds monorepo support in the future, we could deprecate the mirror repository and publish directly from the main repository. Until then, this approach provides the best balance of maintainability and user experience.

The same pattern could be applied if we need to publish other language-specific packages that don't support monorepos (e.g., RubyGems, CPAN).



================================================
FILE: reporters/go/README.md
================================================
# TDD Guard Go Reporter

Go test reporter that captures test results for TDD Guard validation.

## Requirements

- Go 1.24+
- [TDD Guard](https://github.com/nizos/tdd-guard) installed globally

## Installation

```bash
go install github.com/nizos/tdd-guard/reporters/go/cmd/tdd-guard-go@latest
```

## Configuration

### Basic Usage

Pipe `go test -json` output to the reporter:

```bash
go test -json ./... 2>&1 | tdd-guard-go
```

### Project Root Configuration

For projects where tests run in subdirectories, specify the project root:

```bash
go test -json ./... 2>&1 | tdd-guard-go -project-root /absolute/path/to/project/root
```

### Configuration Rules

- Path must be absolute when using `-project-root` flag
- Current directory must be within the configured project root
- Falls back to current directory if not specified

### Makefile Integration

Add to your `Makefile`:

```makefile
test:
	go test -json ./... 2>&1 | tdd-guard-go -project-root /absolute/path/to/project/root
```

## How It Works

The reporter acts as a filter that:

1. Reads `go test -json` output from stdin
2. Passes the output through to stdout unchanged
3. Parses test results and transforms them to TDD Guard format
4. Saves results to `.claude/tdd-guard/data/test.json`

This design allows it to be inserted into existing test pipelines without disrupting output.

## More Information

- Test results are saved to `.claude/tdd-guard/data/test.json`
- See [TDD Guard documentation](https://github.com/nizos/tdd-guard) for complete setup

## License

MIT



================================================
FILE: reporters/jest/README.md
================================================
# TDD Guard Jest Reporter

Jest reporter that captures test results for TDD Guard validation.

## Requirements

- Node.js 18+
- Jest 30.0.5+
- [TDD Guard](https://github.com/nizos/tdd-guard) installed globally

## Installation

```bash
npm install --save-dev tdd-guard-jest
```

## Configuration

### Jest Configuration

Add the reporter to your `jest.config.js`:

```javascript
module.exports = {
  reporters: [
    'default',
    [
      'tdd-guard-jest',
      {
        projectRoot: __dirname,
      },
    ],
  ],
}
```

Or in `jest.config.ts`:

```typescript
import type { Config } from 'jest'
import path from 'path'

const config: Config = {
  reporters: [
    'default',
    [
      'tdd-guard-jest',
      {
        projectRoot: path.resolve(__dirname),
      },
    ],
  ],
}

export default config
```

### Workspace/Monorepo Configuration

For workspaces or monorepos, pass the project root path to the reporter:

```javascript
// jest.config.js in project root
const path = require('path')

module.exports = {
  reporters: [
    'default',
    [
      'tdd-guard-jest',
      {
        projectRoot: path.resolve(__dirname),
      },
    ],
  ],
}
```

If your jest config is in a workspace subdirectory, pass the absolute path to your project root:

```javascript
module.exports = {
  reporters: [
    'default',
    [
      'tdd-guard-jest',
      {
        projectRoot: '/Users/username/projects/my-app',
      },
    ],
  ],
}
```

## More Information

- Test results are saved to `.claude/tdd-guard/data/test.json`
- See [TDD Guard documentation](https://github.com/nizos/tdd-guard) for complete setup

## License

MIT



================================================
FILE: reporters/phpunit/README.md
================================================
# TDD Guard PHPUnit Reporter

PHPUnit reporter that captures test results for TDD Guard validation.

## Requirements

- PHP 8.1+
- PHPUnit 9.0+ or 10.0+ or 11.0+
- [TDD Guard](https://github.com/nizos/tdd-guard) installed globally

## Installation

```bash
composer require --dev tdd-guard/phpunit
```

## Configuration

### PHPUnit 10+ Configuration

Add the extension to your `phpunit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php">
    <testsuites>
        <testsuite name="Application Test Suite">
            <directory>tests</directory>
        </testsuite>
    </testsuites>
    
    <extensions>
        <bootstrap class="TddGuard\PHPUnit\TddGuardExtension">
            <parameter name="projectRoot" value="/absolute/path/to/project/root"/>
        </bootstrap>
    </extensions>
</phpunit>
```

### PHPUnit 9.x Configuration

Add the listener to your `phpunit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="vendor/autoload.php">
    <testsuites>
        <testsuite name="Application Test Suite">
            <directory>tests</directory>
        </testsuite>
    </testsuites>
    
    <listeners>
        <listener class="TddGuard\PHPUnit\TddGuardListener">
            <arguments>
                <string>/absolute/path/to/project/root</string>
            </arguments>
        </listener>
    </listeners>
</phpunit>
```

### Project Root Configuration

Set the project root using any ONE of these methods:

**Option 1: PHPUnit Configuration (Recommended)**

Use the `projectRoot` parameter in your `phpunit.xml` (see examples above).

**Option 2: Environment Variable**

```bash
export TDD_GUARD_PROJECT_ROOT=/absolute/path/to/project/root
```

**Option 3: Automatic Detection**

If not configured, the reporter will:
- Use the directory containing `phpunit.xml`
- Fall back to current working directory

### Configuration Rules

- Path must be absolute
- Falls back to current directory if configuration is invalid

## More Information

- Test results are saved to `.claude/tdd-guard/data/test.json`
- See [TDD Guard documentation](https://github.com/nizos/tdd-guard) for complete setup

## License

MIT


================================================
FILE: reporters/phpunit/SYNC_README.md
================================================
# TDD Guard PHPUnit Reporter

This repository is automatically synchronized from the main [TDD Guard monorepo](https://github.com/nizos/tdd-guard).

## Important Notice

**This is a read-only mirror.** Please do not submit pull requests here.

- **Source code**: https://github.com/nizos/tdd-guard/tree/main/reporters/phpunit
- **Issues**: https://github.com/nizos/tdd-guard/issues
- **Pull requests**: https://github.com/nizos/tdd-guard/pulls

## Installation

```bash
composer require --dev tdd-guard/phpunit
```

## Why a Separate Repository?

Packagist requires composer.json to be at the root of the repository. Since TDD Guard is a monorepo containing multiple packages (npm, Python, PHP), we maintain this synchronized copy specifically for Packagist distribution.

## Synchronization

This repository is automatically updated whenever changes are pushed to the `reporters/phpunit` directory in the main repository.

## License

MIT - See the main repository for details.


================================================
FILE: reporters/pytest/README.md
================================================
# TDD Guard Pytest Reporter

Pytest plugin that captures test results for TDD Guard validation.

## Requirements

- Python 3.8+
- pytest 6.0+
- [TDD Guard](https://github.com/nizos/tdd-guard) installed globally

## Installation

```bash
pip install tdd-guard-pytest
```

The plugin activates automatically when installed.

## Configuration

### Project Root Configuration

Set `tdd_guard_project_root` to your project root using any ONE of these methods:

**Option 1: pyproject.toml**

```toml
[tool.pytest.ini_options]
tdd_guard_project_root = "/absolute/path/to/project/root"
```

**Option 2: pytest.ini**

```ini
[pytest]
tdd_guard_project_root = /absolute/path/to/project/root
```

**Option 3: setup.cfg**

```ini
[tool:pytest]
tdd_guard_project_root = /absolute/path/to/project/root
```

### Configuration Rules

- Path must be absolute
- Current directory must be within the configured project root
- Falls back to current directory if configuration is invalid

## Development

When developing the pytest reporter, you need to configure the project root to ensure test results are saved to the correct location:

1. Copy the example configuration:

   ```bash
   cp pytest.ini.example pytest.ini
   ```

2. Edit `pytest.ini` and set the absolute path to your TDD Guard project root:
   ```ini
   [pytest]
   tdd_guard_project_root = /absolute/path/to/tdd-guard
   ```

**Note:** `pytest.ini` is gitignored to avoid committing machine-specific paths.

## More Information

- Test results are saved to `.claude/tdd-guard/data/test.json`
- See [TDD Guard documentation](https://github.com/nizos/tdd-guard) for complete setup

## License

MIT



================================================
FILE: reporters/vitest/README.md
================================================
# TDD Guard Vitest Reporter

Vitest reporter that captures test results for TDD Guard validation.

## Requirements

- Node.js 18+
- Vitest 3.2.0+
- [TDD Guard](https://github.com/nizos/tdd-guard) installed globally

## Installation

```bash
npm install --save-dev tdd-guard-vitest
```

## Configuration

### Vitest Configuration

Add the reporter to your `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import { VitestReporter } from 'tdd-guard-vitest'

export default defineConfig({
  test: {
    reporters: ['default', new VitestReporter()],
  },
})
```

### Workspace/Monorepo Configuration

For workspaces or monorepos, pass the project root path to the reporter:

```typescript
// vitest.config.ts in project root
import { defineConfig } from 'vitest/config'
import { VitestReporter } from 'tdd-guard-vitest'
import path from 'path'

export default defineConfig({
  test: {
    reporters: ['default', new VitestReporter(path.resolve(__dirname))],
  },
})
```

If your vitest config is in a workspace subdirectory, pass the absolute path to your project root:

```typescript
new VitestReporter('/Users/username/projects/my-app')
```

## More Information

- Test results are saved to `.claude/tdd-guard/data/test.json`
- See [TDD Guard documentation](https://github.com/nizos/tdd-guard) for complete setup

## License

MIT



================================================
FILE: .devcontainer/README.md
================================================
# TDD Guard Development Container

A consistent, isolated environment for developing TDD Guard.

## Features

- Network isolation for security
- Automated development environment setup
- Pre-configured development tools
- Persistent command history

## What's Inside

| Component          | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| Node.js 20         | Main CLI & Vitest/Jest reporters                |
| Python 3.11 + pipx | Pytest reporter                                 |
| PHP 8.2 + Composer | PHPUnit reporter                                |
| Go 1.23            | Go reporter                                     |
| Claude Code        | AI assistance                                   |
| Dev tools          | Git, zsh, fzf, Docker, gh, vim, nano, git-delta |

**Key files:**

- `Dockerfile` - Container definition
- `devcontainer.json` - IDE configuration
- `scripts/` - Setup and configuration scripts
  - `init-firewall.sh` - Network security
  - `setup-dev-environment.sh` - Main setup orchestrator

## Prerequisites

Choose one of:

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (macOS/Windows/Linux)
- **[Colima](https://github.com/abiosoft/colima)** (macOS)

## Quick Start

### VS Code

1. Install [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open project → Click green button (bottom-left) → "Reopen in Container"
3. Wait for build → Start coding

[Learn more about VS Code Dev Containers →](https://code.visualstudio.com/docs/devcontainers/containers)

### IntelliJ IDEA

1. File → Remote Development → Dev Containers → New Dev Container → From Local Project
2. Select Docker/Colima connection
3. Browse to `<project>/.devcontainer/devcontainer.json`
4. Build Container and Continue

**Resources:**

- [Official documentation →](https://www.jetbrains.com/help/idea/start-dev-container-from-welcome-screen.html)
- [Dev Containers tutorial →](https://blog.jetbrains.com/idea/2024/07/using-dev-containers-in-jetbrains-ides-part-1/)

## Tips & Troubleshooting

### Colima Setup

IntelliJ requires more resources than the default:

```bash
# Basic setup
colima start --cpu 2 --memory 4

# With performance optimization
colima start --cpu 4 --memory 8 --vm-type vz --mount-type virtiofs
```

### macOS Performance

For better file performance:

- **Docker Desktop**: Enable VirtioFS in Settings → General → Choose file sharing implementation
- **Colima**: Use ` --vm-type vz --mount-type virtiofs` flag when starting (see above)

### Common Commands

```bash
npm test               # Run all tests
npm run test:unit      # Run unit tests only
npm run test:reporters # Run reporter tests
npm run checks         # Run all quality checks (typecheck, lint, format, test)
```

### Additional Notes

- **Command history** is preserved between container sessions in a persistent volume
- **Network isolation** restricts outbound connections for security (see `scripts/init-firewall.sh` for allowed services)
- **Environment variables** like `NODE_OPTIONS` and `USE_SYSTEM_CLAUDE` are pre-configured
- **Timezone** defaults to Europe/Stockholm but can be changed via `TZ` build arg
