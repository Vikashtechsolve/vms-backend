import { Queue } from 'bullmq'
import { getRedisConnection } from '../config/redis.js'
import { listChannels } from '../services/messaging/channelRegistry.js'

const DISPATCH_QUEUE = 'campaign-dispatch'

let dispatchQueue = null
const batchQueues = new Map()

export function getDispatchQueue() {
  if (!dispatchQueue) {
    dispatchQueue = new Queue(DISPATCH_QUEUE, { connection: getRedisConnection() })
  }
  return dispatchQueue
}

export function getBatchQueue(queueName) {
  if (!batchQueues.has(queueName)) {
    batchQueues.set(
      queueName,
      new Queue(queueName, { connection: getRedisConnection() })
    )
  }
  return batchQueues.get(queueName)
}

export async function enqueueStartCampaign(campaignId) {
  const queue = getDispatchQueue()
  return queue.add(
    'start-campaign',
    { campaignId },
    {
      jobId: `campaign-dispatch-${campaignId}`,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  )
}

export async function enqueueBatchJob(channel, payload) {
  const queue = getBatchQueue(channel.queueName)
  const jobId = `campaign-${payload.campaignId}-${channel.id}-batch-${payload.batchIndex}`
  return queue.add('send-batch', payload, {
    jobId,
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}

async function removeJobsFromQueue(queue, campaignId) {
  const states = ['waiting', 'delayed', 'active', 'paused']
  const jobs = await queue.getJobs(states)
  for (const job of jobs) {
    if (job.data?.campaignId === campaignId) {
      try {
        await job.remove()
      } catch {
        // job may have finished between getJobs and remove
      }
    }
  }
}

export async function removeCampaignJobs(campaignId) {
  await removeJobsFromQueue(getDispatchQueue(), campaignId)

  for (const channel of listChannels()) {
    const queue = getBatchQueue(channel.queueName)
    await removeJobsFromQueue(queue, campaignId)
  }
}
