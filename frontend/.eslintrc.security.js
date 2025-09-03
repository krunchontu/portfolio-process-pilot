module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true
  },

  plugins: [
    'security'
  ],

  extends: [
    'plugin:security/recommended'
  ],

  rules: {
    // Security-specific rules for authentication
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-pseudoRandomBytes': 'error',

    // Custom rules for localStorage token prevention
    'no-restricted-globals': [
      'error',
      {
        name: 'localStorage',
        message: 'Avoid direct localStorage access. For authentication, use httpOnly cookies instead.'
      }
    ],

    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="localStorage"][callee.property.name="setItem"] > Literal[value=/.*token.*/i]',
        message: 'Storing authentication tokens in localStorage is prohibited for security reasons. Use httpOnly cookies instead.'
      },
      {
        selector: 'CallExpression[callee.object.name="localStorage"][callee.property.name="getItem"] > Literal[value=/.*token.*/i]',
        message: 'Retrieving authentication tokens from localStorage is prohibited for security reasons. Use httpOnly cookies instead.'
      },
      {
        selector: 'CallExpression[callee.object.name="localStorage"][callee.property.name="removeItem"] > Literal[value=/.*token.*/i]',
        message: 'Managing authentication tokens in localStorage is prohibited for security reasons. Use httpOnly cookies instead.'
      },
      {
        selector: 'MemberExpression[object.name="localStorage"][property.name=/.*token.*/i]',
        message: 'Accessing token-related items in localStorage is prohibited for security reasons. Use httpOnly cookies instead.'
      }
    ],

    // Prevent hardcoded secrets
    'no-secrets/no-secrets': 'off', // Would need plugin installation

    // Custom rule for detecting JWT patterns
    'no-restricted-patterns': 'off' // Custom rule would go here
  },

  overrides: [
    {
      // Allow localStorage in test files for mocking
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx'],
      rules: {
        'no-restricted-globals': 'off',
        'no-restricted-syntax': 'off'
      }
    },
    {
      // More strict rules for authentication-related files
      files: ['**/auth/**', '**/services/api.js', '**/contexts/AuthContext.jsx'],
      rules: {
        'security/detect-object-injection': 'error',
        'no-restricted-globals': [
          'error',
          {
            name: 'localStorage',
            message: 'localStorage is STRICTLY PROHIBITED in authentication code. Use httpOnly cookies only.'
          },
          {
            name: 'sessionStorage',
            message: 'sessionStorage is STRICTLY PROHIBITED in authentication code. Use httpOnly cookies only.'
          }
        ]
      }
    }
  ],

  // Custom rule definitions would go here if we had them
  settings: {
    'security/detect-object-injection': {
      // Configuration for object injection detection
    }
  }
}
