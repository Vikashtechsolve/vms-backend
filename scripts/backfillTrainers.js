import 'dotenv/config'
import mongoose from 'mongoose'
import { init } from '../config/db.js'
import { backfillTrainers } from '../helpers/backfillTrainers.js'

// Usage: npm run backfill:trainers [-- --force]
const force = process.argv.includes('--force')

async function run() {
  await init()
  const result = await backfillTrainers({ force })
  console.log('Done:', result)
  await mongoose.connection.close()
}

run().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
