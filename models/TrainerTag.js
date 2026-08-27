import mongoose from 'mongoose'
import { buildAliasKeys, tagAliasKey, tagSlug } from '../helpers/trainerTagUtils.js'

const trainerTagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    aliases: { type: [String], default: [] },
    aliasKeys: { type: [String], default: [], index: true },
    trainerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

trainerTagSchema.pre('validate', function normalizeTag(next) {
  this.name = String(this.name || '').trim()
  this.slug = tagSlug(this.slug || this.name)
  this.aliases = [...new Set((this.aliases || []).map((a) => String(a).trim()).filter(Boolean))]
  this.aliasKeys = buildAliasKeys(this.name, this.aliases)
  next()
})

trainerTagSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export async function findTagByLabel(TrainerTag, label) {
  const trimmed = String(label || '').trim()
  if (!trimmed) return null
  const slug = tagSlug(trimmed)
  const aliasKey = tagAliasKey(trimmed)
  return TrainerTag.findOne({
    $or: [
      { slug },
      { aliasKeys: aliasKey },
      { name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    ],
  })
}

export default mongoose.model('TrainerTag', trainerTagSchema)
