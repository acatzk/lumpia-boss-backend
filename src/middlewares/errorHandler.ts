import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  const cause = 'cause' in err ? (err as { cause?: unknown }).cause : undefined
  console.error('Unhandled Server Error:', {
    message: err.message,
    name: err.name,
    cause,
    stack: err.stack,
    path: c.req.path
  })
  return c.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, 500)
}
