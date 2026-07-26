import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { init } from './config/db.js'
import { createCorsOptions } from './config/cors.js'
import authRoutes from './routes/auth.js'
import vendorsRoutes from './routes/vendors.js'
import trainersRoutes from './routes/trainers.js'
import jobsRoutes from './routes/jobs.js'
import importantLinksRoutes from './routes/importantLinks.js'
import dashboardRoutes from './routes/dashboard.js'
import activitiesRoutes from './routes/activities.js'
import contactRoutes from './routes/contact.js'
import locationsRoutes from './routes/locations.js'
import { backfillTrainers } from './helpers/backfillTrainers.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors(createCorsOptions()))
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/vendors', vendorsRoutes)
app.use('/api/trainers', trainersRoutes)
app.use('/api/jobs', jobsRoutes)
app.use('/api/important-links', importantLinksRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/activities', activitiesRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/locations', locationsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Trainer Adda Backend running' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

async function start() {
  await init()
  // Older trainer records predate the derived filter fields; this is a no-op once done.
  await backfillTrainers().catch((err) => console.error('Trainer backfill skipped:', err.message))
  app.listen(PORT, () => {
    console.log(`Trainer Adda Backend running at http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
