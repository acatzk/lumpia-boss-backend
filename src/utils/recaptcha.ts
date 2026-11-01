export type RecaptchaVerificationResult = {
  success: boolean
  score?: number
  error?: string
  errorCodes?: string[]
}

type VerifyRecaptchaOptions = {
  token: string
  secretKey?: string
  remoteIp?: string
  bypassDev?: boolean
}

const GOOGLE_RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
const MOCK_DEV_TOKEN = 'mock-recaptcha-token-for-dev-and-testing'

export const verifyRecaptcha = async ({
  token,
  secretKey,
  remoteIp,
  bypassDev = false
}: VerifyRecaptchaOptions): Promise<RecaptchaVerificationResult> => {
  if (!token || token.trim() === '') {
    return {
      success: false,
      error: 'reCAPTCHA token is required'
    }
  }

  // Allow test token or development bypass if configured
  if (token === MOCK_DEV_TOKEN || (bypassDev && !secretKey)) {
    return {
      success: true,
      score: 1.0
    }
  }

  if (!secretKey) {
    if (bypassDev) {
      return {
        success: true,
        score: 1.0
      }
    }
    return {
      success: false,
      error: 'reCAPTCHA secret key is not configured on the server'
    }
  }

  try {
    const params = new URLSearchParams()
    params.append('secret', secretKey)
    params.append('response', token)
    if (remoteIp) {
      params.append('remoteip', remoteIp)
    }

    const response = await fetch(GOOGLE_RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      return {
        success: false,
        error: `reCAPTCHA verification service returned status ${response.status}`
      }
    }

    const data = (await response.json()) as {
      success: boolean
      score?: number
      action?: string
      'error-codes'?: string[]
    }

    if (!data.success) {
      return {
        success: false,
        error: 'reCAPTCHA verification failed. Bot activity suspected.',
        errorCodes: data['error-codes']
      }
    }

    // If score is returned (reCAPTCHA v3 / Enterprise), verify threshold
    if (typeof data.score === 'number' && data.score < 0.5) {
      return {
        success: false,
        score: data.score,
        error: 'reCAPTCHA score too low. Automated traffic detected.'
      }
    }

    return {
      success: true,
      score: data.score
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown network error'
    return {
      success: false,
      error: `Failed to verify reCAPTCHA: ${message}`
    }
  }
}
