import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import jestPlugin from 'eslint-plugin-jest';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'jest-html-reporters-attach/', '**/generated', 'coverage/']
  },
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: './tsconfig.eslint.json'
      }
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'unused-imports': unusedImportsPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin
    },
    rules: {
      'prettier/prettier': [
        'warn',
        {
          printWidth: 120,
          tabWidth: 2,
          tabs: false,
          semi: true,
          singleQuote: true,
          quoteProps: 'as-needed',
          trailingComma: 'none',
          bracketSpacing: true,
          arrowParens: 'avoid'
        }
      ],

      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      'unused-imports/no-unused-imports': 'error'
      // 'no-return-await': 'error', // Deprecated in ESLint, but strict-type-checked might handle it differently.
    }
  },
  {
    files: ['test/**', '**/*.test.ts', '**/*.spec.ts'],
    ...jestPlugin.configs['flat/recommended'],
    rules: {
      ...jestPlugin.configs['flat/recommended'].rules,
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      '@typescript-eslint/no-var-requires': 'off'
    }
  },
  eslintConfigPrettier
);
