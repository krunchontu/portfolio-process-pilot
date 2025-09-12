const jwt = require('jsonwebtoken')
jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
  mapToApiResponse: (u) => ({ id: u.id, email: u.email, role: u.role, is_active: u.is_active })
}))

const User = require('../../src/models/User')
const { authenticateToken, requireRole } = require('../../src/middleware/auth')

describe('Auth Middleware', () => {
  const makeReqRes = (overrides = {}) => {
    const req = {
      headers: {},
      get: function (key) { return this.headers[key] },
      cookies: {},
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/api/test',
      ...overrides
    }
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this },
      json(payload) { this.payload = payload; return this }
    }
    const next = jest.fn()
    return { req, res, next }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when token is missing', async () => {
    const { req, res, next } = makeReqRes()
    await authenticateToken(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(res.payload?.code).toBe('MISSING_TOKEN')
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', async () => {
    const { req, res, next } = makeReqRes({ headers: { authorization: 'Bearer invalid' } })
    await authenticateToken(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(res.payload?.code).toBe('INVALID_TOKEN')
  })

  it('returns 401 when user not found', async () => {
    const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET)
    User.findById.mockResolvedValue(null)
    const { req, res, next } = makeReqRes({ headers: { authorization: `Bearer ${token}` } })
    await authenticateToken(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(res.payload?.code).toBe('USER_NOT_FOUND')
  })

  it('attaches user and calls next when valid', async () => {
    const user = { id: 1, email: 'a@b.com', role: 'employee', is_active: true }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET)
    User.findById.mockResolvedValue(user)
    const { req, res, next } = makeReqRes({ headers: { authorization: `Bearer ${token}` } })
    await authenticateToken(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toMatchObject({ id: 1, email: 'a@b.com', role: 'employee' })
  })

  it('requireRole denies insufficient roles', () => {
    const { req, res, next } = makeReqRes({ user: { role: 'employee' } })
    requireRole('admin', 'manager')(req, res, next)
    expect(res.statusCode).toBe(403)
    expect(res.payload?.code).toBe('INSUFFICIENT_PERMISSIONS')
  })
})

