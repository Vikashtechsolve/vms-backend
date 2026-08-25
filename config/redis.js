import IORedis from 'ioredis'

let connection = null

/** Shared Redis connection for BullMQ Queue and Worker instances. */
export function createRedisConnection() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    retryStrategy(times) {
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    },
  })
}

export function getRedisConnection() {
  if (!connection) connection = createRedisConnection()
  return connection
}

export async function pingRedis() {
  try {
    const conn = getRedisConnection()
    const result = await conn.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}
