import { skillTag, qualificationTag } from './trainerFacets.js'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  rating_desc: { rating: -1, createdAt: -1 },
  rating_asc: { rating: 1, createdAt: -1 },
  experience_desc: { experienceYears: -1, createdAt: -1 },
  experience_asc: { experienceYears: 1, createdAt: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Accepts repeated params (?skills=a&skills=b) and comma separated lists alike. */
function toList(value) {
  if (value == null) return []
  const raw = Array.isArray(value) ? value : String(value).split(',')
  return raw.map((v) => String(v).trim()).filter(Boolean)
}

function toNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Builds the Mongo filter for the trainer list.
 * Values inside one filter are OR'd; separate filters are AND'd, which is what
 * users expect from faceted search. Skills can opt into AND with skillsMatch=all.
 */
export function buildTrainerQuery(query = {}) {
  const filter = {}
  const and = []

  const q = String(query.q || '').trim()
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    and.push({
      $or: [
        { name: rx }, { email: rx }, { contact: rx }, { location: rx },
        { city: rx }, { state: rx }, { subject: rx }, { qualification: rx },
      ],
    })
  }

  const cities = toList(query.city)
  if (cities.length) filter.city = { $in: cities }

  const states = toList(query.state)
  if (states.length) filter.state = { $in: states }

  const skills = toList(query.skills).map(skillTag).filter(Boolean)
  if (skills.length) {
    filter.skillTags = query.skillsMatch === 'all' ? { $all: skills } : { $in: skills }
  }

  const qualifications = toList(query.qualifications).map(qualificationTag).filter(Boolean)
  if (qualifications.length) filter.qualificationTag = { $in: qualifications }

  const workTypes = toList(query.workTypes)
  if (workTypes.length) filter.workTypes = { $in: workTypes }

  const modes = toList(query.modes)
  if (modes.length) filter.modes = { $in: modes }

  const statuses = toList(query.status)
  if (statuses.length) {
    const values = statuses.filter((s) => s !== 'unset')
    // Records created before availability existed have no `status` field at all,
    // and `$in: [null]` is what matches a missing field alongside the empty string.
    if (statuses.includes('unset')) values.push('', null)
    filter.status = { $in: values }
  }

  const minRating = toNumber(query.minRating)
  const maxRating = toNumber(query.maxRating)
  if (minRating != null || maxRating != null) {
    filter.rating = {}
    if (minRating != null) filter.rating.$gte = minRating
    if (maxRating != null) filter.rating.$lte = maxRating
  }

  const minExperience = toNumber(query.minExperience)
  const maxExperience = toNumber(query.maxExperience)
  if (minExperience != null || maxExperience != null) {
    filter.experienceYears = {}
    if (minExperience != null) filter.experienceYears.$gte = minExperience
    if (maxExperience != null) filter.experienceYears.$lte = maxExperience
  }

  if (query.hasResume === 'true') filter.resume = { $gt: '' }
  if (query.hasLinkedin === 'true') filter.linkedinUrl = { $gt: '' }

  // Legacy docs without `source` are treated as admin records.
  const source = String(query.source || '').trim()
  if (source === 'website') {
    filter.source = 'website'
  } else if (source === 'admin') {
    and.push({
      $or: [
        { source: 'admin' },
        { source: { $exists: false } },
        { source: null },
      ],
    })
  }

  if (and.length) filter.$and = and
  return filter
}

export function buildTrainerSort(sort) {
  return SORTS[sort] || SORTS.newest
}

export function buildTrainerPagination({ page, limit }) {
  const safeLimit = Math.min(Math.max(toNumber(limit) ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const safePage = Math.max(toNumber(page) ?? 1, 1)
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit }
}

/**
 * Case-insensitive dedupe of display values (React / react / REACT collapse into
 * one option, labelled with the spelling used most often).
 */
function mergeByTag(rows, tagFn) {
  const merged = new Map()
  for (const { _id: label, count } of rows) {
    const tag = tagFn(label)
    if (!tag) continue
    const current = merged.get(tag)
    if (!current) {
      merged.set(tag, { value: tag, label, count, labelCount: count })
      continue
    }
    current.count += count
    if (count > current.labelCount || (count === current.labelCount && label < current.label)) {
      current.label = label
      current.labelCount = count
    }
  }
  return [...merged.values()]
    .map(({ labelCount, ...option }) => option)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function sourceMatch(query = {}) {
  const source = String(query.source || '').trim()
  if (source === 'website') return { source: 'website' }
  if (source === 'admin') {
    return {
      $or: [
        { source: 'admin' },
        { source: { $exists: false } },
        { source: null },
      ],
    }
  }
  return {}
}

/** Facet lists for the filter panel, built from the trainers that actually exist. */
export async function getTrainerFilterOptions(Trainer, query = {}) {
  const match = sourceMatch(query)
  const [skillRows, qualificationRows, locationRows, stats] = await Promise.all([
    Trainer.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
    ]),
    Trainer.aggregate([
      { $match: { ...match, qualification: { $gt: '' } } },
      { $group: { _id: '$qualification', count: { $sum: 1 } } },
    ]),
    Trainer.aggregate([
      { $match: { ...match, city: { $gt: '' } } },
      { $group: { _id: { city: '$city', state: '$state' }, count: { $sum: 1 } } },
      { $sort: { '_id.state': 1, '_id.city': 1 } },
    ]),
    Trainer.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          maxExperience: { $max: '$experienceYears' },
          unlistedLocation: {
            $sum: { $cond: [{ $and: [{ $eq: ['$city', ''] }, { $gt: ['$location', ''] }] }, 1, 0] },
          },
        },
      },
    ]),
  ])

  return {
    skills: mergeByTag(skillRows, skillTag),
    qualifications: mergeByTag(qualificationRows, qualificationTag),
    cities: locationRows.map((r) => ({
      value: r._id.city,
      label: r._id.city,
      state: r._id.state || 'Other',
      count: r.count,
    })),
    total: stats[0]?.total || 0,
    maxExperience: stats[0]?.maxExperience || 0,
    unlistedLocation: stats[0]?.unlistedLocation || 0,
  }
}
