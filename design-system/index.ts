/**
 * Design System Index
 * 
 * Main entry point for the design system.
 * Exports tokens, components, utilities, and foundations.
 */

// Design Tokens
export * from './tokens';

// Foundations (CSS files should be imported directly)
// Import './foundations/index.css' in your app

// Utilities
export * from './utils';

// Components
export * from './components';

// Theme configurations for easy access
export { defaultTheme, darkTheme } from './tokens';