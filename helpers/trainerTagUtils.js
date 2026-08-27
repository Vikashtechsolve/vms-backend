/** Normalized slug for storage and filtering (e.g. "MERN Stack" → "mern-stack"). */
export function tagSlug(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Loose key for duplicate detection ("Mern stack" ≈ "MERN"). */
export function tagAliasKey(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\bstack\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildAliasKeys(name, aliases = []) {
  const keys = new Set()
  const add = (value) => {
    const key = tagAliasKey(value)
    if (key) keys.add(key)
  }
  add(name)
  for (const alias of aliases) add(alias)
  return [...keys]
}

export function toSlugList(value) {
  if (value == null) return []
  const raw = Array.isArray(value) ? value : String(value).split(',')
  return [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))]
}
