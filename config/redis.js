import IORedis from 'ioredis'

let connection = null

function resolveRedisUrl() {
  return (
    process.env.REDIS_PRIVATE_URL ||
    process.env.REDIS_URL ||
    'redis://localhost:6379'
  )
}

/** Build ioredis options compatible with Railway private networking (IPv6). */
export function buildRedisOptions(urlString = resolveRedisUrl()) {
  const url = new URL(urlString)
  const isRailwayInternal =
    url.hostname.endsWith('.railway.internal') || url.hostname === 'redis'

  const options = {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    // Required on Railway private network (IPv6). Safe for local/public too.
    family: 0,
    retryStrategy(times) {
      if (times > 5) return null
      return Math.min(times * 200, 2000)
    },
  }

  // Public Railway/proxy URLs use rediss://; internal private URLs do not use TLS.
  if (url.protocol === 'rediss:' && !isRailwayInternal) {
    options.tls = { rejectUnauthorized: false }
  }

  return options
}

/** Shared Redis connection for BullMQ Queue and Worker instances. */
export function createRedisConnection() {
  return new IORedis(buildRedisOptions())
}

export function getRedisConnection() {
  if (!connection) connection = createRedisConnection()
  return connection
}

export async function pingRedis() {
  try {
    const conn = createRedisConnection()
    const result = await conn.ping()
    await conn.quit()
    return result === 'PONG'
  } catch (err) {
    console.error('Redis ping failed:', err.message)
    return false
  }
}
