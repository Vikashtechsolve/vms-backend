const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function isValidEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email))
}

/** Digits only for duplicate comparison — any length, no formatting rules. */
export function normalizeContact(contact) {
  return String(contact || '').replace(/\D/g, '')
}

export function trimContact(contact) {
  return String(contact || '').trim()
}

export function contactsMatch(stored, input) {
  const storedTrimmed = trimContact(stored)
  const inputTrimmed = trimContact(input)
  if (!storedTrimmed || !inputTrimmed) return false

  const storedDigits = normalizeContact(stored)
  const inputDigits = normalizeContact(input)
  if (storedDigits && inputDigits) return storedDigits === inputDigits

  return storedTrimmed === inputTrimmed
}

function fieldAvailability(checkable, taken, message) {
  return {
    checkable,
    available: checkable ? !taken : true,
    message: checkable && taken ? message : null,
  }
}

/** One DB query — checks email and/or mobile in a single round trip. */
export async function checkTrainerAvailability(Trainer, { email, contact, excludeId }) {
  const normalizedEmail = normalizeEmail(email)
  const trimmedContact = trimContact(contact)
  const normalizedContact = normalizeContact(contact)
  const checkEmail = normalizedEmail && isValidEmail(normalizedEmail)
  const checkContact = trimmedContact.length > 0

  const result = {
    email: fieldAvailability(checkEmail, false, null),
    contact: fieldAvailability(checkContact, false, null),
  }

  if (!checkEmail && !checkContact) return result

  const conditions = []
  if (checkEmail) conditions.push({ email: normalizedEmail })
  if (checkContact) {
    if (normalizedContact) {
      conditions.push({ contactNormalized: normalizedContact })
      conditions.push({ contact: normalizedContact })
    }
    conditions.push({ contact: trimmedContact })
  }

  const query = { $or: conditions }
  if (excludeId) query._id = { $ne: excludeId }

  const existing = await Trainer.findOne(query).select('email contact contactNormalized')

  result.email = fieldAvailability(
    checkEmail,
    !!(checkEmail && existing?.email === normalizedEmail),
    'A trainer with this email already exists.'
  )
  result.contact = fieldAvailability(
    checkContact,
    !!(checkContact && existing && contactsMatch(existing.contactNormalized || existing.contact, contact)),
    'A trainer with this mobile number already exists.'
  )

  return result
}

export function validateTrainerInput({ name, email, contact }, { requireEmail = false } = {}) {
  const errors = []
  const trimmedName = String(name || '').trim()
  const normalizedEmail = normalizeEmail(email)
  const trimmedContact = trimContact(contact)
  const normalizedContact = normalizeContact(contact)

  if (!trimmedName) errors.push('Full name is required.')

  if (requireEmail) {
    if (!normalizedEmail) errors.push('Email is required.')
    else if (!EMAIL_RE.test(normalizedEmail)) errors.push('Enter a valid email address.')
  } else if (normalizedEmail && !EMAIL_RE.test(normalizedEmail)) {
    errors.push('Enter a valid email address.')
  }

  if (!trimmedContact) errors.push('Contact number is required.')

  return {
    errors,
    name: trimmedName,
    email: normalizedEmail,
    contact: trimmedContact,
    contactNormalized: normalizedContact,
  }
}

export async function findTrainerConflict(Trainer, { email, contact, excludeId }) {
  const availability = await checkTrainerAvailability(Trainer, { email, contact, excludeId })
  if (!availability.email.available) return availability.email.message
  if (!availability.contact.available) return availability.contact.message
  return null
}

export function trainerDuplicateMessage(err) {
  if (err?.code !== 11000) return null
  const field = Object.keys(err.keyPattern || {})[0]
  if (field === 'email') return 'A trainer with this email already exists.'
  if (field === 'contactNormalized' || field === 'contact') {
    return 'A trainer with this mobile number already exists.'
  }
  return 'A trainer with these details already exists.'
}

export function buildTrainerData(b, validated) {
  return {
    name: validated.name,
    email: validated.email,
    contact: validated.contact,
    contactNormalized: validated.contactNormalized,
    location: b.location ?? '',
    qualification: b.qualification ?? '',
    passingYear: b.passingYear ?? '',
    subject: b.subject ?? '',
    teachingExperience: b.teachingExperience ?? '',
    developmentExperience: b.developmentExperience ?? '',
    totalExperience: b.totalExperience ?? '',
    workLookingFor: b.workLookingFor ?? 'Full-Time Trainer',
    mode: b.mode ?? 'Offline Mode',
    payoutExpectations: b.payoutExpectations ?? '',
  }
}
