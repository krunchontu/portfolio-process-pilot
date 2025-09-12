const csrf = require('../../src/middleware/csrf')

describe('CSRF Middleware (stateless double-submit)', () => {
  const makeReqRes = (overrides = {}) => {
    const req = {
      method: 'POST',
      path: '/api/any',
      headers: {},
      get: function (key) { return this.headers[key] },
      cookies: {},
      body: {},
      ip: '127.0.0.1',
      ...overrides
    }
    const res = {
      statusCode: 200,
      headers: {},
      locals: {},
      cookieCalls: [],
      status(code) { this.statusCode = code; return this },
      json(payload) { this.payload = payload; return this },
      cookie(name, value, opts) { this.cookieCalls.push({ name, value, opts }); return this }
    }
    const next = jest.fn()
    return { req, res, next }
  }

  it('skips validation for safe methods (GET)', () => {
    const { req, res, next } = makeReqRes({ method: 'GET' })
    csrf.validateToken(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('skips validation for auth login/register', () => {
    const { req, res, next } = makeReqRes({ path: '/api/auth/login' })
    csrf.validateToken(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('rejects when tokens are missing', () => {
    const { req, res, next } = makeReqRes()
    csrf.validateToken(req, res, next)
    expect(res.statusCode).toBe(403)
    expect(res.payload?.code).toBe('CSRF_TOKEN_MISSING')
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects when header and cookie tokens mismatch', () => {
    const { req, res, next } = makeReqRes()
    // Place bogus tokens
    req.headers['X-CSRF-Token'] = 'a.b'
    req.cookies['XSRF-TOKEN'] = 'c.d'
    csrf.validateToken(req, res, next)
    expect(res.statusCode).toBe(403)
    expect(res.payload?.code).toBe('CSRF_TOKEN_INVALID')
    expect(next).not.toHaveBeenCalled()
  })

  it('accepts valid token when header and cookie match and signature is valid', () => {
    const { req, res, next } = makeReqRes({ method: 'POST' })
    // First generate a token via GET generator (sets cookie and res.locals)
    const gen = makeReqRes({ method: 'GET', path: '/' })
    csrf.generateToken(gen.req, gen.res, () => {})
    const token = gen.res.cookieCalls.find(c => c.name === 'XSRF-TOKEN')?.value
    expect(token).toBeDefined()
    // Use token in both header and cookie
    req.headers['X-CSRF-Token'] = token
    req.cookies['XSRF-TOKEN'] = token
    csrf.validateToken(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

