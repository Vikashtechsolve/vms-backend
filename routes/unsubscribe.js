import { Router } from 'express'
import Trainer from '../models/Trainer.js'

const router = Router()

router.get('/:token', async (req, res) => {
  try {
    const trainer = await Trainer.findOne({ unsubscribeToken: req.params.token })
    if (!trainer) {
      return res.status(404).send('<h2>Invalid unsubscribe link</h2>')
    }

    trainer.emailOptIn = false
    trainer.unsubscribedAt = new Date()
    await trainer.save()

    res.send(`
      <html><body style="font-family:Arial,sans-serif;padding:40px;text-align:center;">
        <h2>You have been unsubscribed</h2>
        <p>You will no longer receive campaign emails from TrainerAdda.</p>
      </body></html>
    `)
  } catch (err) {
    console.error(err)
    res.status(500).send('<h2>Server error</h2>')
  }
})

export default router
