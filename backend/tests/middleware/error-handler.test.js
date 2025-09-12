const { notFound, globalErrorHandler, AppError } = require('../../src/middleware/errorHandler')

describe('Error Handling Middleware', () => {
  const makeRes = () => {
    return {
      statusCode: 200,
      status(code) { this.statusCode = code; return this },
      json(payload) { this.payload = payload; return this }
    }
  }

  it('notFound returns standardized 404 for API routes', () => {
    const req = { path: '/api/does-not-exist', originalUrl: '/api/does-not-exist', method: 'GET' }
    const res = makeRes()
    const next = jest.fn()
    notFound(req, res, next)
    expect(res.statusCode).toBe(404)
    expect(res.payload?.code).toBe('ROUTE_NOT_FOUND')
  })

  it('globalErrorHandler returns sanitized error in production-like mode', () => {
    const err = new AppError('Custom error', 418, 'I_AM_A_TEAPOT')
    const req = {}
    const res = makeRes()
    const next = jest.fn()
    // Temporarily spoof NODE_ENV
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    globalErrorHandler(err, req, res, next)
    process.env.NODE_ENV = prev
    expect(res.statusCode).toBe(418)
    expect(res.payload?.code).toBe('I_AM_A_TEAPOT')
  })
})

