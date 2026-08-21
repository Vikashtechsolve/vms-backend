import { Worker } from 'bullmq'
import { getRedisConnection } from '../config/redis.js'
import { listChannels } from '../services/messaging/channelRegistry.js'
import { handleStartCampaign, handleSendBatch } from './handlers.js'

let workers = []

export function startDispatchWorker() {
  const worker = new Worker(
    'campaign-dispatch',
    async (job) => handleStartCampaign(job),
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  )
  worker.on('failed', (job, err) => {
    console.error('Dispatch job failed:', job?.id, err.message)
  })
  workers.push(worker)
  return worker
}

export function startBatchWorkersForAllChannels() {
  for (const channel of listChannels()) {
    const worker = new Worker(
      channel.queueName,
      async (job) => handleSendBatch(job),
      {
        connection: getRedisConnection(),
        concurrency: 2,
        limiter: channel.rateLimit,
      }
    )
    worker.on('failed', (job, err) => {
      console.error(`Batch job failed (${channel.id}):`, job?.id, err.message)
    })
    workers.push(worker)
  }
}

export async function closeAllWorkers() {
  await Promise.all(workers.map((w) => w.close()))
  workers = []
}
