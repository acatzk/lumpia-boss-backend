import { env } from 'cloudflare:test'
import { testClient } from 'hono/testing'
import { describe, expect, it } from 'vitest'

import app from '../src'

const client = testClient(app, env)

describe('Root & System Endpoints', () => {
  it('Returns landing text at GET /', async () => {
    const response = await client.index.$get()
    expect(response.status).toBe(200)

    const data = await response.text()
    expect(data).toBe('Honc from above! ☁️🪿')
  })

  it('Returns pong at GET /ping', async () => {
    const response = await client.ping.$get()
    expect(response.status).toBe(200)

    const data = (await response.json()) as { message: string; service: string }
    expect(data.message).toBe('pong')
    expect(data.service).toBe('lumpia-boss-backend')
  })

  it('Returns robots.txt at GET /robots.txt', async () => {
    const response = await client['robots.txt'].$get()
    expect(response.status).toBe(200)

    const data = await response.text()
    expect(data).toContain('User-agent: *')
    expect(data).toContain('Disallow: /')
  })
})
