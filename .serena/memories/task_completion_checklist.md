# Task Completion Checklist

## Before Completing Tasks

### Type Checking
- Run `tsc --noEmit` to ensure all TypeScript code passes type checking
- Fix any type errors or warnings

### Database Operations
- Ensure database operations use transactions where appropriate
- Verify foreign key relationships and constraints
- Test database methods with sample data

### Testing
- Test both web application and Electron desktop modes
- Verify CSV import functionality works correctly
- Check dashboard visualizations render properly
- Test API endpoints with proper error handling

### Native Modules
- Run `npm run rebuild:node` for web development
- Ensure `postinstall` script handles Electron native module rebuilding
- Verify better-sqlite3 works in both deployment modes

### Error Handling
- Implement proper try-catch blocks in async operations
- Provide meaningful error messages to users
- Log errors appropriately for debugging

### Documentation
- Update CLAUDE.md if new commands or patterns are introduced
- Add inline comments for complex logic
- Document API endpoint changes

### Environment Testing
- Test in both development and production builds
- Verify environment variable handling
- Ensure database paths work correctly in both modes