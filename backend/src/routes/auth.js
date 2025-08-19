const express = require('express')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const config = require('../config')
const { generateToken, generateRefreshToken, authenticateToken, setTokenCookies, clearTokenCookies } = require('../middleware/auth')
const { validateRequest } = require('../middleware/validation')
const { loginSchema, registerSchema, refreshTokenSchema } = require('../schemas/auth')

const router = express.Router()

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
})

// Login endpoint
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      })
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      })
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

    // Remove sensitive data
    delete user.password_hash

    res.json({
      success: true,
      message: 'Login successful',
      user,
      // Still provide tokens for API clients that need them
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: config.jwt.expiresIn
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    })
  }
})

// Register endpoint (admin only or open based on config)
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'employee', department } = req.body

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'EMAIL_ALREADY_EXISTS'
      })
    }

    // Create new user
    const newUser = await User.create({
      email,
      password,
      first_name,
      last_name,
      role,
      department
    })

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    })
  }
})

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    // Try to get refresh token from cookie first, then from body
    let refreshToken = req.cookies?.refresh_token
    
    if (!refreshToken && req.body.refresh_token) {
      refreshToken = req.body.refresh_token
    }
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      })
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret)

    // Get fresh user data
    const user = await User.findById(decoded.userId)
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      })
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

    res.json({
      success: true,
      access_token: accessToken,
      expires_in: config.jwt.expiresIn
    })
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      })
    }

    console.error('Token refresh error:', error)
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    })
  }
})

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    user: req.user
  })
})

// Logout (clear httpOnly cookies)
router.post('/logout', authenticateToken, async (req, res) => {
  // Clear httpOnly cookies
  clearTokenCookies(res)
  
  // Log the logout event
  console.log(`User ${req.user.email} logged out at ${new Date().toISOString()}`)

  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

// Password change endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      })
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      })
    }

    // Get user with password hash
    const userWithPassword = await User.findByEmail(req.user.email)

    // Verify current password
    const isCurrentPasswordValid = await User.validatePassword(current_password, userWithPassword.password_hash)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      })
    }

    // Update password
    await User.update(req.user.id, { password: new_password })

    res.json({
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({
      error: 'Password change failed',
      code: 'PASSWORD_CHANGE_ERROR'
    })
  }
})

module.exports = router
