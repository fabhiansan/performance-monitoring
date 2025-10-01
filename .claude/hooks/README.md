# Claude Code Quality Hooks

This directory contains quality check hooks for the Employee Performance Analyzer project.

## Setup

The hooks are automatically configured and will run whenever you edit files using Claude Code.

## Configuration

### Hook Type: Modern Hybrid App
This project uses a custom hybrid hook that combines:
- **React 19 frontend** (components/, hooks/, design-system/, App.tsx, etc.) - uses `tsconfig.json`
- **Electron main process** (main.ts, electron-config.ts) - uses `tsconfig.node.json`
- **Node.js backend** (server/, services/, scripts/, middleware/) - uses `tsconfig.node.json`
- **Playwright tests** (test/) - uses `tsconfig.playwright.json`
- **Modern tooling** (Vite, Vitest, TanStack Query, Zustand, Fastify, Pino)

### Current Settings

**TypeScript**: ✅ Enabled
- Uses appropriate config based on file location
- Filters out dependency errors
- Shows only errors for the edited file
- **Performance Optimizations**: ✅ Enabled
  - Intelligent caching (30s timeout)
  - Incremental compilation support
  - File filtering (skips config/build files)
  - Timeout protection (10s max)
  - Performance monitoring with debug logs

**ESLint**: ✅ Enabled
- Max line length: 500 characters
- Cognitive complexity: 20 (SonarJS)
- Auto-fix enabled
- React, TypeScript, and SonarJS rules
- Ignores `.claude/` directory and build files

**Prettier**: ❌ Disabled
- Not configured in this project

**Console Usage Rules**:
- ✅ Allowed in: components/, contexts/, hooks/, design-system/, utils/, server/, services/, scripts/, middleware/, test/, src/__tests__/
- ⚠️ Warning level for other locations

**Vitest Support**: ✅ Enabled
- Test file patterns: **/*.test.ts, **/*.test.tsx, **/*.spec.ts, **/*.spec.tsx, test/**, src/__tests__/**
- Test pattern validation for describe, it, test, expect

**Other Rules**:
- `as any` usage: Warning
- TODO/FIXME comments: Info
- Duplicate strings: Warning (SonarJS)
- Unused variables: Warning
- Unused imports: Warning
- React Hooks: Error (dependency validation)
- Cognitive complexity: Error if > 20 (SonarJS)
- Test patterns: Warning if test file lacks test patterns

## Files

- `hybrid-app/quality-check.cjs` - Main hook script
- `hybrid-app/hook-config.json` - Configuration file
- `settings.local.json` - Claude Code settings

## Testing

You can test the hook manually:

```bash
# Test with a frontend file
echo '{"tool_name":"Edit","tool_input":{"file_path":"components/EmployeeCard.tsx"}}' | node .claude/hooks/hybrid-app/quality-check.cjs

# Test with a hook file
echo '{"tool_name":"Edit","tool_input":{"file_path":"hooks/useAppState.ts"}}' | node .claude/hooks/hybrid-app/quality-check.cjs

# Test with a test file
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/__tests__/EmployeeCard.test.tsx"}}' | node .claude/hooks/hybrid-app/quality-check.cjs

# Test with debug output
export CLAUDE_HOOKS_DEBUG=true
echo '{"tool_name":"Edit","tool_input":{"file_path":"App.tsx"}}' | node .claude/hooks/hybrid-app/quality-check.cjs
```

## Exit Codes

- **Exit 0**: All checks passed ✅
- **Exit 2**: Issues found ❌ (TypeScript errors, etc.)

## Customization

Edit `.claude/hooks/hybrid-app/hook-config.json` to modify:
- Enable/disable checks
- Change console usage rules
- Adjust severity levels
- Add new file patterns
- **Performance settings**:
  - `typescript.performance.enabled`: Enable/disable performance optimizations
  - `typescript.performance.cacheTimeout`: Cache duration in milliseconds (default: 30000)
  - `typescript.performance.skipConfigFiles`: Skip TypeScript checking for config files
  - `typescript.performance.skipBuildFiles`: Skip TypeScript checking for build output files
  - `typescript.performance.useIncremental`: Use incremental compilation when available
  - `typescript.performance.timeout`: Maximum time for TypeScript check in milliseconds (default: 10000)

## Troubleshooting

**Hook not running?**
- Check if `.claude/settings.local.json` exists
- Verify the command path is correct
- Make sure the hook script is executable

**TypeScript errors not showing?**
- Check if the file matches the expected patterns
- Verify `tsconfig.json` and `tsconfig.node.json` exist
- Run with debug mode to see config selection

**Cache issues?**
- Delete `.claude/hooks/hybrid-app/tsconfig-cache.json`
- The cache will rebuild automatically
