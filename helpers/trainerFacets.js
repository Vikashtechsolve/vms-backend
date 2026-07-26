/**
 * Trainer records store most attributes as free text ("8 Years", "Java, React").
 * Filtering on that directly is slow and unreliable, so on every save we derive
 * indexable companion fields that the list query can hit directly.
 */

export function splitSkills(subject) {
  return String(subject || '')
    .split(/[,;|/\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function skillTag(skill) {
  return String(skill || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** First number in strings like "8 Years", "8+ yrs", "5-7 years", "10". */
export function parseYears(value) {
  const match = String(value ?? '').match(/\d+(\.\d+)?/)
  if (!match) return null
  const n = Number(match[0])
  return Number.isFinite(n) ? n : null
}

/**
 * Total experience is what recruiters filter on. When a trainer only filled in
 * the teaching/development fields we fall back to the larger of the two.
 */
export function resolveExperienceYears({ totalExperience, teachingExperience, developmentExperience }) {
  const total = parseYears(totalExperience)
  if (total != null) return total

  const parts = [parseYears(teachingExperience), parseYears(developmentExperience)].filter((n) => n != null)
  return parts.length ? Math.max(...parts) : null
}

export function resolveWorkTypes(workLookingFor) {
  const raw = String(workLookingFor || '').toLowerCase()
  const types = []
  if (raw.includes('full')) types.push('full_time')
  if (raw.includes('part')) types.push('part_time')
  return types
}

export function resolveModes(mode) {
  const raw = String(mode || '').toLowerCase()
  const modes = []
  if (raw.includes('online')) modes.push('online')
  if (raw.includes('offline')) modes.push('offline')
  return modes
}

export function qualificationTag(qualification) {
  return String(qualification || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Companion fields kept in sync with the free-text values on every write. */
export function deriveTrainerFacets(source = {}) {
  const skills = splitSkills(source.subject)
  return {
    skills,
    skillTags: [...new Set(skills.map(skillTag))].filter(Boolean),
    experienceYears: resolveExperienceYears(source),
    workTypes: resolveWorkTypes(source.workLookingFor),
    modes: resolveModes(source.mode),
    qualificationTag: qualificationTag(source.qualification),
  }
}
