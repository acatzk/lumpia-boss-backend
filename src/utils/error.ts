import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const handleError = (c: Context, err: unknown, status = 400) => {
  if (err instanceof Error) {
    return c.json({ error: err.message }, status as ContentfulStatusCode)
  }
  return c.json({ error: 'Unexpected error' }, 500)
}
