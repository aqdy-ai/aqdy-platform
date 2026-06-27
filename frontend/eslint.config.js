import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier: prettierPlugin,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: [
          './tsconfig.app.json',
          './tsconfig.node.json',
          './tsconfig.vitest.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // Async data-fetching patterns legitimately call setState inside effects
      // via async callbacks. Disabling to avoid false positives on this project.
      'react-hooks/set-state-in-effect': 'off',
      // Ref-during-render is an established pattern for derived state.
      'react-hooks/refs': 'off',
      ...jsxA11y.flatConfigs.recommended.rules,
      // specific overrides
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/anchor-is-valid': ['error', { aspects: ['invalidHref'] }],
      'jsx-a11y/no-static-element-interactions': [
        'warn',
        { handlers: ['onClick', 'onMouseDown', 'onMouseUp'] },
      ],
      'jsx-a11y/tabindex-no-positive': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn'
    },
  },
  eslintConfigPrettier
)
