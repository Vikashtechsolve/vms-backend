import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Contact from '../models/Contact.js'
import { logActivity } from '../helpers/activities.js'

const router = Router()

/** Public: submit contact form */
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone, role, message } = req.body || {}
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }
    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      role: (role || '').trim(),
      message: (message || '').trim(),
    })
    await logActivity(`New contact message from ${name} (${role || 'Unknown'})`, 'Just now')
    res.status(201).json({ ok: true, id: contact.toJSON().id })
  } catch (err) {
    console.error('Contact submit error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.use(authMiddleware)

/** Admin: get all contact messages */
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).lean()
    res.json(contacts.map((doc) => ({ ...doc, id: doc._id.toString(), _id: undefined, __v: undefined })))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

/** Admin: mark a message as read */
router.patch('/:id/read', async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, { read: true }, { new: true })
    if (!contact) return res.status(404).json({ error: 'Not found' })
    res.json(contact.toJSON())
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

/** Admin: delete a message */
router.delete('/:id', async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id)
    if (!contact) return res.status(404).json({ error: 'Not found' })
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
