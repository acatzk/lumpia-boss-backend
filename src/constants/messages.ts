export const ERROR_MESSAGES = {
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  INTERNAL_SERVER_ERROR: 'Internal server error occurred',
  INVALID_REQUEST: 'Invalid request parameters or payload',
  DATABASE_CONNECTION: 'Database connection failed',
  TOO_MANY_REQUESTS: 'Too many requests. Please slow down and try again later.'
} as const

export const SUCCESS_MESSAGES = {
  OPERATION_SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  HEALTH_OK: 'Lumpia Boss Backend is operational'
} as const
