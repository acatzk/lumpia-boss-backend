import type { ValidationTargets } from 'hono'
import { validator } from 'hono-openapi/zod'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'

/**
 * A wrapper around the `hono-openapi` Zod validator
 * that standardizes error handling with structured JSON responses.
 * @param target The relevant Hono validation target, e.g., "json" or "query"
 * @param schema A Zod schema used to validate the selected target
 */
export const zodValidator = <Target extends keyof ValidationTargets, Schema extends z.AnyZodObject>(
  target: Target,
  schema: Schema
) => {
  return validator(target, schema, (result, c) => {
    if (!result.success) {
      const errorResponse = c.json(
        {
          error: 'Invalid Request',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten()
        },
        400
      )
      throw new HTTPException(400, { res: errorResponse })
    }
  })
}
