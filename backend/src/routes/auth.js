/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           example: SecurePass123!
 *
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - first_name
 *         - last_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: newuser@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: SecurePass123!
 *         first_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: John
 *         last_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: Doe
 *         role:
 *           type: string
 *           enum: [employee, manager, admin]
 *           default: employee
 *         department:
 *           type: string
 *           maxLength: 100
 *           example: Engineering
 *
 *     AuthTokens:
 *       type: object
 *       properties:
 *         access_token:
 *           type: string
 *           description: JWT access token
 *         refresh_token:
 *           type: string
 *           description: JWT refresh token
 *         expires_in:
 *           type: string
 *           description: Token expiration time
 *           example: 15m
 *
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - current_password
 *         - new_password
 *       properties:
 *         current_password:
 *           type: string
 *           format: password
 *           description: User's current password
 *         new_password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: New password (min 8 characters)
 */

const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const config = require('../config')
const { generateToken, generateRefreshToken, authenticateToken, setTokenCookies, clearTokenCookies } = require('../middleware/auth')
const { validateRequest } = require('../middleware/validation')
const { loginSchema, registerSchema, changePasswordSchema } = require('../schemas/auth')
const { authLimiter } = require('../middleware/rateLimiting')
const { loggers } = require('../utils/logger')

const router = express.Router()

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get tokens
 *     description: Login with email and password to receive JWT tokens. Tokens are set as httpOnly cookies and also returned in response.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly cookies with access and refresh tokens
 *             schema:
 *               type: string
 *               example: access_token=eyJ...; HttpOnly; Secure; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         tokens:
 *                           $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
// Login endpoint
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findByEmail(email)
    if (!user) {
      return res.unauthorized('Invalid email or password')
    }

    // Check if user is active
    if (!user.is_active) {
      return res.unauthorized('Account is deactivated')
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password_hash)
    if (!isValidPassword) {
      return res.unauthorized('Invalid email or password')
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    }

    const accessToken = generateToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    // Update last login
    await User.updateLastLogin(user.id)

    // Set tokens in httpOnly cookies
    setTokenCookies(res, accessToken, refreshToken)

    // Get user data for API response (camelCase format)
    const apiUser = User.mapToApiResponse(user)

    return res.success(200, 'Login successful', {
      user: apiUser
      // Tokens are now sent via httpOnly cookies only for security
    })
  } catch (error) {
    return res.internalError('Login failed', error)
  }
})

// Register endpoint (admin only or open based on config)
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'employee', department } = req.body

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.conflict('User with this email already exists', { email })
    }

    // Create new user
    const newUser = await User.create({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role,
      department
    })

    return res.created('User registered successfully', { user: newUser })
  } catch (error) {
    return res.internalError('Registration failed', error)
  }
})

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from httpOnly cookie only
    const refreshToken = req.cookies?.refresh_token

    if (!refreshToken) {
      return res.unauthorized('Refresh token required')
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret)

    // Get fresh user data
    const user = await User.findById(decoded.userId)
    if (!user || !user.is_active) {
      return res.unauthorized('Invalid refresh token')
    }

    // Generate new access token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    }

    const accessToken = generateToken(tokenPayload)

    // Set new access token in cookie
    setTokenCookies(res, accessToken, refreshToken)

    return res.success(200, 'Token refreshed successfully')
    // Tokens are sent via httpOnly cookies only for security
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.unauthorized('Invalid or expired refresh token')
    }

    return res.internalError('Token refresh failed', error)
  }
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  return res.success(200, 'Profile retrieved successfully', { user: req.user })
})

// Logout (clear httpOnly cookies)
router.post('/logout', authenticateToken, async (req, res) => {
  // Clear httpOnly cookies
  clearTokenCookies(res)

  // Log the logout event
  loggers.auth.info('User logged out', {
    userId: req.user.id,
    email: req.user.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  return res.success(200, 'Logged out successfully')
})

// Password change endpoint
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Get user with password hash
    const userWithPassword = await User.findByEmail(req.user.email)

    // Verify current password
    const isCurrentPasswordValid = await User.validatePassword(currentPassword, userWithPassword.password_hash)
    if (!isCurrentPasswordValid) {
      return res.unauthorized('Current password is incorrect')
    }

    // Update password
    await User.update(req.user.id, { password: newPassword })

    return res.success(200, 'Password changed successfully')
  } catch (error) {
    return res.internalError('Password change failed', error)
  }
})

module.exports = router
