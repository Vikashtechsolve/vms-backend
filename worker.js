import 'dotenv/config'
import { init } from './config/db.js'
import { registerAllChannels } from './services/messaging/index.js'
import { startDispatchWorker, startBatchWorkersForAllChannels, closeAllWorkers } from './queues/workers.js'
import { seedEmailLayout } from './config/seedEmailLayout.js'

async function main() {
  await init()
  await seedEmailLayout()
  registerAllChannels()

  startDispatchWorker()
  startBatchWorkersForAllChannels()

  console.log('Campaign worker running (BullMQ)')

  const shutdown = async () => {
    console.log('Shutting down workers...')
    await closeAllWorkers()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})
