export const MERGE_TAGS = [
  'trainerName',
  'firstName',
  'email',
  'city',
  'state',
  'skills',
  'unsubscribeUrl',
  'logoUrl',
  'siteUrl',
]

export function applyMergeTags(text, trainer, extra = {}) {
  const skills =
    trainer?.subject?.trim() ||
    (Array.isArray(trainer?.skills) ? trainer.skills.join(', ') : '')

  const map = {
    trainerName: trainer?.name || '',
    firstName: (trainer?.name || '').split(/\s+/)[0] || '',
    email: trainer?.email || '',
    city: trainer?.city || '',
    state: trainer?.state || '',
    skills,
    ...extra,
  }

  return String(text ?? '').replace(/\{\{(\w+)\}\}/g, (_, key) => map[key] ?? '')
}

export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
