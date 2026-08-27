import Trainer from '../models/Trainer.js'
import TrainerTag, { findTagByLabel } from '../models/TrainerTag.js'
import { tagAliasKey, tagSlug, toSlugList } from './trainerTagUtils.js'

export async function listTrainerTags() {
  return TrainerTag.find().sort({ name: 1 }).lean()
}

export async function searchTrainerTags(query = '', limit = 12) {
  const q = String(query || '').trim()
  if (!q) {
    return TrainerTag.find().sort({ name: 1 }).limit(limit).lean()
  }
  const slug = tagSlug(q)
  const aliasKey = tagAliasKey(q)
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return TrainerTag.find({
    $or: [
      { name: rx },
      { slug: new RegExp(`^${slug}`, 'i') },
      { aliases: rx },
      { aliasKeys: aliasKey },
    ],
  })
    .sort({ trainerCount: -1, name: 1 })
    .limit(limit)
    .lean()
}

export async function createTrainerTag(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) throw new Error('Tag name is required')

  const existing = await findTagByLabel(TrainerTag, trimmed)
  if (existing) {
    const err = new Error(`Tag already exists as "${existing.name}"`)
    err.code = 'TAG_EXISTS'
    err.existing = existing
    throw err
  }

  return TrainerTag.create({ name: trimmed })
}

export async function resolveTrainerTagSlugs(input) {
  const slugs = toSlugList(input)
  if (!slugs.length) return { tags: [], tagSlugs: [] }

  const docs = await TrainerTag.find({ slug: { $in: slugs } }).lean()
  const bySlug = new Map(docs.map((d) => [d.slug, d.name]))
  const tagSlugs = slugs.filter((s) => bySlug.has(s))
  const tags = tagSlugs.map((s) => bySlug.get(s))
  return { tags, tagSlugs }
}

export async function applyTrainerTags(trainer, tagSlugsInput) {
  if (tagSlugsInput === undefined) return trainer
  const { tags, tagSlugs } = await resolveTrainerTagSlugs(tagSlugsInput)
  trainer.tags = tags
  trainer.tagSlugs = tagSlugs
  return trainer
}

export async function syncTrainerTagCounts(slugs = []) {
  const unique = [...new Set(slugs.filter(Boolean))]
  if (!unique.length) return
  await Promise.all(
    unique.map(async (slug) => {
      const count = await Trainer.countDocuments({ tagSlugs: slug })
      await TrainerTag.updateOne({ slug }, { trainerCount: count })
    })
  )
}

const DEFAULT_TAGS = [
  { name: 'AIML', aliases: ['AI ML', 'Artificial Intelligence'] },
  { name: 'MERN Stack', aliases: ['MERN', 'Mern'] },
  { name: 'Java Backend', aliases: ['Java', 'JAVA Backend'] },
  { name: 'DSA', aliases: ['Data Structures', 'Data Structures and Algorithms'] },
]

export async function seedTrainerTags() {
  for (const item of DEFAULT_TAGS) {
    const slug = tagSlug(item.name)
    const exists = await TrainerTag.findOne({ slug })
    if (exists) continue
    const duplicate = await findTagByLabel(TrainerTag, item.name)
    if (duplicate) continue
    await TrainerTag.create({ name: item.name, aliases: item.aliases || [] })
  }
}
