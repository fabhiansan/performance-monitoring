/**
 * Design Tokens Index
 * 
 * Central export point for all design tokens.
 * Provides unified access to primitives, semantic tokens, and component tokens.
 */

// Export all primitive tokens
export * from './primitives';

// Export semantic tokens
export * from './semantic';

// Import for type safety
import { 
  semanticColors, 
  darkSemanticColors, 
  componentTokens, 
  animationTokens,
  type SemanticColors,
  type DarkSemanticColors,
  type ComponentTokens,
  type AnimationTokens
} from './semantic';

// Re-export for convenience
export { colors as primitiveColors } from './primitives';

// Token utility functions
export const getTokenValue = (path: string, tokens: Record<string, unknown>): string => {
  return path.split('.').reduce((obj: unknown, key: string) => {
    if (obj && typeof obj === 'object' && key in obj) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, tokens) as string || '';
};

// CSS Custom Properties Generator
export const generateCSSCustomProperties = (tokens: Record<string, unknown>, prefix = '--ds'): Record<string, string> => {
  const result: Record<string, string> = {};
  
  const traverse = (obj: Record<string, unknown>, path: string[] = []) => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value as Record<string, unknown>, currentPath);
      } else {
        const cssVar = `${prefix}-${currentPath.join('-')}`;
        result[cssVar] = String(value);
      }
    }
  };
  
  traverse(tokens);
  return result;
};

// Theme configuration type
export interface ThemeConfig {
  colors: SemanticColors | DarkSemanticColors;
  components: ComponentTokens;
  animations: AnimationTokens;
}

// Default theme configuration
export const defaultTheme: ThemeConfig = {
  colors: semanticColors,
  components: componentTokens,
  animations: animationTokens,
};

// Dark theme configuration
export const darkTheme: ThemeConfig = {
  colors: darkSemanticColors,
  components: componentTokens,
  animations: animationTokens,
};

// Token validation utility
export const validateTokenPath = (path: string, tokens: Record<string, unknown>): boolean => {
  const value = getTokenValue(path, tokens);
  return value !== undefined && value !== '';
};

// Responsive token utilities
export const createResponsiveToken = (values: Record<string, string>) => {
  return Object.entries(values)
    .map(([breakpoint, value]) => `${breakpoint}:${value}`)
    .join(' ');
};

// Token naming conventions
export const TOKEN_NAMING_CONVENTIONS = {
  // Use kebab-case for CSS custom properties
  cssCustomProperty: (path: string[]) => `--ds-${path.join('-')}`,
  
  // Use camelCase for JavaScript object access
  jsProperty: (path: string[]) => path.map((segment, index) => 
    index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1)
  ).join(''),
  
  // Use dot notation for token references
  tokenReference: (path: string[]) => path.join('.'),
} as const;

export type TokenNamingConvention = keyof typeof TOKEN_NAMING_CONVENTIONS;