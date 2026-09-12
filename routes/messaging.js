import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { listActiveChannelIds, getChannel } from '../services/messaging/channelRegistry.js'

const router = Router()

router.use(authMiddleware)

router.get('/channels', (_req, res) => {
  const channels = listActiveChannelIds().map((id) => {
    const ch = getChannel(id)
    return {
      id: ch.id,
      label: ch.label,
      configured: ch.isConfigured,
    }
  })
  res.json({ channels })
})

export default router
