module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { es2020: true, node: true },
  overrides: [
    {
      files: ['packages/media-core/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['react', 'react-native', 'react-dom'] }]
      }
    },
    {
      files: ['packages/media-ui-react/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['*media-core*', '*media-react*'] }]
      }
    },
    {
      files: ['packages/media-react/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['*media-ui-react*'] }]
      }
    }
  ]
};
