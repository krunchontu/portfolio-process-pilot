/**
 * Swagger/OpenAPI Configuration
 *
 * Comprehensive API documentation configuration for ProcessPilot
 */

const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const config = require('./index')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ProcessPilot API',
      version: '1.0.0',
      description: `
# ProcessPilot Workflow & Approval Engine API

A comprehensive REST API for managing workflow requests, approvals, and user management with enterprise-grade security and monitoring.

## Features

- 🔐 **JWT Authentication** with role-based access control
- 📝 **Request Management** with multi-step approval workflows
- 👥 **User Management** with hierarchical roles (Employee → Manager → Admin)
- 📊 **Analytics** and reporting endpoints
- 🔄 **Workflow Configuration** for customizable approval processes
- 🛡️ **Security** with CSRF protection, rate limiting, and input sanitization
- 💾 **Multi-Database Support** (PostgreSQL, Supabase, PlanetScale, Neon, Railway)

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in requests using:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Or use httpOnly cookies (automatically handled by browsers):
- \`access_token\`: Main authentication token (15min expiry)
- \`refresh_token\`: Token refresh capability (7 days expiry)

## Rate Limiting

API endpoints are rate limited:
- Authentication endpoints: 5 requests per 15 minutes
- General endpoints: 100 requests per 15 minutes (per user/IP)
- Rate limit headers included in responses

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "validation_errors": [...]
  },
  "meta": {
    "timestamp": "2023-12-07T10:00:00.000Z"
  }
}
\`\`\`

## Success Responses

All successful responses follow this format:

\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "meta": {
    "timestamp": "2023-12-07T10:00:00.000Z",
    "pagination": {...}
  }
}
\`\`\`
      `,
      contact: {
        name: 'ProcessPilot Support',
        email: 'support@processpilot.com',
        url: 'https://github.com/your-username/portfolio-process-pilot'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      },
      {
        url: 'https://api.processpilot.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token'
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'JWT token in httpOnly cookie'
        }
      },
      schemas: {
        // Standard response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                pagination: { $ref: '#/components/schemas/Pagination' },
                filters: { type: 'object' }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'An error occurred' },
            code: { type: 'string', example: 'ERROR_CODE' },
            details: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            details: {
              type: 'object',
              properties: {
                validation_errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            current_page: { type: 'integer', example: 1 },
            per_page: { type: 'integer', example: 20 },
            total_items: { type: 'integer', example: 100 },
            total_pages: { type: 'integer', example: 5 },
            has_next: { type: 'boolean', example: true },
            has_previous: { type: 'boolean', example: false },
            next_page: { type: 'integer', nullable: true, example: 2 },
            previous_page: { type: 'integer', nullable: true, example: null }
          }
        },
        // Entity schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            first_name: { type: 'string', example: 'John' },
            last_name: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['employee', 'manager', 'admin'], example: 'employee' },
            department: { type: 'string', example: 'Engineering' },
            manager_id: { type: 'string', format: 'uuid', nullable: true },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            last_login: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        Request: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['leave', 'expense', 'equipment', 'general'] },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
            workflow_id: { type: 'string', format: 'uuid' },
            created_by: { type: 'string', format: 'uuid' },
            current_step_index: { type: 'integer' },
            payload: { type: 'object' },
            steps: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkflowStep' }
            },
            sla_deadline: { type: 'string', format: 'date-time', nullable: true },
            completed_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            creator: { $ref: '#/components/schemas/User' },
            current_step: { $ref: '#/components/schemas/WorkflowStep' }
          }
        },
        WorkflowStep: {
          type: 'object',
          properties: {
            stepId: { type: 'integer', example: 1 },
            role: { type: 'string', enum: ['employee', 'manager', 'admin'] },
            sla_hours: { type: 'integer', example: 24 },
            actions: {
              type: 'array',
              items: { type: 'string', enum: ['approve', 'reject', 'escalate'] }
            },
            required: { type: 'boolean', example: true },
            escalation_hours: { type: 'integer', nullable: true },
            escalation_role: { type: 'string', enum: ['manager', 'admin'], nullable: true }
          }
        },
        Workflow: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Leave Approval Process' },
            description: { type: 'string', example: 'Standard leave request approval workflow' },
            flow_id: { type: 'string', enum: ['leave', 'expense', 'equipment', 'general'] },
            is_active: { type: 'boolean', example: true },
            steps: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkflowStep' }
            },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        RequestHistory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            request_id: { type: 'string', format: 'uuid' },
            actor_id: { type: 'string', format: 'uuid' },
            action: { type: 'string', enum: ['SUBMIT', 'APPROVE', 'REJECT', 'CANCEL', 'ESCALATE'] },
            step_id: { type: 'integer', nullable: true },
            comment: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            actor_email: { type: 'string', format: 'email' },
            actor_role: { type: 'string', enum: ['employee', 'manager', 'admin'] }
          }
        },
        // Request payload schemas for different types
        LeaveRequestPayload: {
          type: 'object',
          properties: {
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            leave_type: { type: 'string', enum: ['annual', 'sick', 'personal', 'maternity', 'paternity'] },
            reason: { type: 'string' },
            days_requested: { type: 'number' }
          }
        },
        ExpenseRequestPayload: {
          type: 'object',
          properties: {
            amount: { type: 'number', example: 150.50 },
            currency: { type: 'string', example: 'USD' },
            category: { type: 'string', enum: ['travel', 'meals', 'office_supplies', 'software', 'other'] },
            description: { type: 'string' },
            receipt_urls: {
              type: 'array',
              items: { type: 'string', format: 'uri' }
            },
            date_incurred: { type: 'string', format: 'date' }
          }
        },
        EquipmentRequestPayload: {
          type: 'object',
          properties: {
            equipment_type: { type: 'string', enum: ['laptop', 'monitor', 'phone', 'accessories', 'other'] },
            specifications: { type: 'string' },
            urgency: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            justification: { type: 'string' },
            estimated_cost: { type: 'number', nullable: true }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Authentication required',
                code: 'UNAUTHORIZED',
                meta: { timestamp: '2023-12-07T10:00:00.000Z' }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Access denied',
                code: 'FORBIDDEN',
                meta: { timestamp: '2023-12-07T10:00:00.000Z' }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Resource not found',
                code: 'RESOURCE_NOT_FOUND',
                meta: { timestamp: '2023-12-07T10:00:00.000Z' }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                meta: { timestamp: '2023-12-07T10:00:00.000Z' }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                meta: { timestamp: '2023-12-07T10:00:00.000Z' }
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field',
          required: false,
          schema: { type: 'string' }
        },
        OrderParam: {
          name: 'order',
          in: 'query',
          description: 'Sort order',
          required: false,
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    },
    security: [
      { BearerAuth: [] },
      { CookieAuth: [] }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Requests',
        description: 'Request management and approval workflows'
      },
      {
        name: 'Users',
        description: 'User management (admin and manager access)'
      },
      {
        name: 'Workflows',
        description: 'Workflow configuration and management'
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints'
      },
      {
        name: 'Health',
        description: 'Health checks and monitoring'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './src/middleware/*.js'
  ]
}

const specs = swaggerJsdoc(options)

const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    operationsSorter: 'alpha',
    tagsSorter: 'alpha'
  }
}

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
}
