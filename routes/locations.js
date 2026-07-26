import { Router } from 'express'
import { getLocationOptions } from '../helpers/locationFields.js'

const router = Router()

/** Shared city list for the admin panel and the public trainer form (no auth). */
router.get('/', (req, res) => {
  res.json({ states: getLocationOptions() })
})

export default router
