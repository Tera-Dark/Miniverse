module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'import', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'import/order': [
      'warn',
      {
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        },
        'newlines-between': 'always',
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']]
      }
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_'
      }
    ],
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off'
  }
};
