/** Normalize trainer contact to Meta WhatsApp format (digits only, with country code). */
export function normalizeWhatsAppPhone(trainer) {
  const raw = trainer?.contactNormalized || trainer?.contact || ''
  let digits = String(raw).replace(/\D/g, '')
  if (!digits) return null

  // India: 10-digit mobile → 91 prefix
  if (digits.length === 10) digits = `91${digits}`
  // Leading 0 on 11-digit local number
  if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`
  // Already has country code (11–15 digits typical)
  if (digits.length < 10 || digits.length > 15) return null

  return digits
}

export function formatPhoneDisplay(digits) {
  if (!digits) return ''
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return `+${digits}`
}
