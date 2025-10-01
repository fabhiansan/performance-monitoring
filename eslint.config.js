import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Ignore patterns
  {
    ignores: [
      '.claude/**/*',
      'node_modules/**/*',
      'dist/**/*',
      'build/**/*',
      'release/**/*',
      '*.d.ts',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'build-scripts.cjs',
      'electron-config.js',
      'server/server-wrapper.cjs',
      'docs/migration/archived-scripts/**/*'
    ]
  },
  
  // Global settings
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        // DOM globals for browser environment
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortSignal: 'readonly',
        AbortController: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLFormElement: 'readonly',
        Event: 'readonly',
        performance: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        HTMLDivElement: 'readonly',
        ResizeObserver: 'readonly',
        NodeJS: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      sonarjs,
    },
    rules: {
      // React rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/prop-types': 'off', // Disable prop-types in favor of TypeScript
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      
      // General rules
      'no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      'no-console': 'off', // Allow console in this project
      
      // Line length - set to 500 as requested
      'max-len': ['error', { 
        code: 500, 
        ignoreUrls: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true
      }],
      
      // SonarJS rules
      'sonarjs/cognitive-complexity': ['error', 20],
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-redundant-boolean': 'warn',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',
      'no-control-regex': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  
  // TypeScript specific configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      sonarjs,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      
      // Line length for TypeScript files
      'max-len': ['error', { 
        code: 500, 
        ignoreUrls: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true
      }],
      
      // SonarJS rules for TypeScript
      'sonarjs/cognitive-complexity': ['error', 20],
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-redundant-boolean': 'warn',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',
    },
  },
  
  // Server-side files (Node.js/Electron)
  {
    files: ['server/**/*', 'scripts/**/*', 'middleware/**/*', 'main.ts', 'electron-config.ts', 'start-server.ts', 'server-entry.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console in server files
      'max-len': ['error', { 
        code: 500, 
        ignoreUrls: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true
      }],
      'sonarjs/cognitive-complexity': ['error', 20],
      'no-control-regex': 'warn',
    },
  },
  
  // Test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'test/**/*'],
    rules: {
      'no-console': 'off', // Allow console in tests
      'max-len': ['warn', { 
        code: 500, 
        ignoreUrls: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true
      }],
      'sonarjs/cognitive-complexity': ['error', 25], // Slightly higher for tests
    },
  },
];
