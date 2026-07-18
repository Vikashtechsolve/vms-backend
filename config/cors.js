/**
 * CORS from CORS_ORIGINS (comma-separated).
 * Include * to allow any browser origin (required for credentialed / Authorization requests).
 */
export function createCorsOptions() {
  const raw = process.env.CORS_ORIGINS?.trim() ?? ''
  const origins = raw.split(',').map((origin) => origin.trim()).filter(Boolean)
  const allowAll = origins.includes('*')
  const allowed = new Set(origins.filter((origin) => origin !== '*'))

  return {
    credentials: true,
    origin(origin, callback) {
      // Server-to-server, curl, Postman, etc.
      if (!origin) return callback(null, true)
      if (allowAll || allowed.has(origin)) return callback(null, true)
      callback(new Error(`Not allowed by CORS: ${origin}`))
    },
  }
}
