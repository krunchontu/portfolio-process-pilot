/**
 * Custom ESLint rule to prevent localStorage usage for authentication tokens
 * This prevents regression to localStorage-based token storage
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow localStorage usage for authentication tokens',
      category: 'Security',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      noLocalStorageTokens: 'Using localStorage for authentication tokens is prohibited for security reasons. Use httpOnly cookies instead.',
      noLocalStorageAccess: 'Accessing localStorage for token-related keys is prohibited. Use httpOnly cookies for authentication.'
    }
  },

  create(context) {
    const tokenKeys = [
      'access_token',
      'refresh_token',
      'token',
      'authToken',
      'auth_token',
      'accessToken',
      'refreshToken',
      'jwt',
      'JWT',
      'bearer',
      'Bearer'
    ]

    const isTokenRelated = (value) => {
      if (typeof value !== 'string') return false
      const lowerValue = value.toLowerCase()
      return tokenKeys.some(key =>
        lowerValue.includes(key.toLowerCase()) ||
        lowerValue === key.toLowerCase()
      )
    }

    const checkMemberExpression = (node) => {
      // Check for localStorage.setItem, localStorage.getItem, etc.
      if (
        node.object &&
        node.object.name === 'localStorage' &&
        node.property &&
        ['setItem', 'getItem', 'removeItem'].includes(node.property.name)
      ) {
        return true
      }
      return false
    }

    const checkCallExpression = (node) => {
      // Check localStorage.setItem('token', ...) or localStorage.getItem('token')
      if (
        node.callee &&
        node.callee.type === 'MemberExpression' &&
        checkMemberExpression(node.callee)
      ) {
        // Check if first argument is token-related
        if (node.arguments.length > 0) {
          const firstArg = node.arguments[0]
          if (firstArg.type === 'Literal' && isTokenRelated(firstArg.value)) {
            return true
          }
          if (firstArg.type === 'Identifier' && isTokenRelated(firstArg.name)) {
            return true
          }
        }
      }
      return false
    }

    return {
      CallExpression(node) {
        if (checkCallExpression(node)) {
          context.report({
            node,
            messageId: 'noLocalStorageTokens'
          })
        }
      },

      MemberExpression(node) {
        // Check for localStorage access in general token context
        if (
          node.object &&
          node.object.name === 'localStorage' &&
          node.property &&
          isTokenRelated(node.property.name)
        ) {
          context.report({
            node,
            messageId: 'noLocalStorageAccess'
          })
        }
      },

      // Check variable assignments that might store tokens in localStorage
      AssignmentExpression(node) {
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object &&
          node.left.object.name === 'localStorage' &&
          node.left.property &&
          isTokenRelated(node.left.property.name)
        ) {
          context.report({
            node,
            messageId: 'noLocalStorageTokens'
          })
        }
      }
    }
  }
}
