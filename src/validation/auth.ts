import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid corporate email address (e.g. name@lumpiaboss.ph)'),
  password: z.string().min(1, 'Password is required'),
  recaptchaToken: z
    .string()
    .min(1, 'reCAPTCHA token is required to protect against brute-force attacks'),
  rememberMe: z.boolean().optional().default(false)
})

export type LoginInput = z.infer<typeof loginSchema>

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional()
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>

export const logoutSchema = z.object({
  refreshToken: z.string().optional()
})

export type LogoutInput = z.infer<typeof logoutSchema>

export const seedAdminSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  name: z.string().optional(),
  secretKey: z.string().optional()
})

export type SeedAdminInput = z.infer<typeof seedAdminSchema>
