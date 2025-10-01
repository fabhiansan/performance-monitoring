import type { Config } from 'tailwindcss';
import { colors as designColors, semantic } from './constants/designTokens';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  boxShadow, 
  zIndex, 
  breakpoints,
  duration,
  easing 
} from './design-system/tokens/primitives';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx,js,jsx}',
    './contexts/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js,jsx}',
    './utils/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
    './hooks/**/*.{ts,tsx,js,jsx}',
    // Include design system components
    './design-system/components/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    // Override default theme with design tokens
    colors: {
      // Design system primitive colors (base layer)
      ...colors,
      // Enhanced semantic colors from designTokens (override layer)
      ...designColors,
      // Semantic aliases for easier usage
      surface: semantic.surface,
      text: semantic.text,
      border: semantic.border,
      background: semantic.background,
    },
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    lineHeight: typography.lineHeight,
    letterSpacing: typography.letterSpacing,
    spacing: spacing,
    borderRadius: borderRadius,
    boxShadow: boxShadow,
    zIndex: zIndex,
    screens: breakpoints,
    transitionDuration: duration,
    transitionTimingFunction: easing,
    
    extend: {
      // Add any additional customizations here
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'scale-out': 'scaleOut 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
