import Trainer from '../models/Trainer.js'
import { deriveTrainerFacets } from './trainerFacets.js'
import { resolveTrainerLocation } from './locationFields.js'

/**
 * Fills in the derived filter fields (and canonical city/state) for records saved
 * before those fields existed. Safe to run repeatedly: by default it only touches
 * documents that are missing the derived data.
 */
export async function backfillTrainers({ force = false, log = console.log } = {}) {
  const filter = force ? {} : { $or: [{ skillTags: { $exists: false } }, { workTypes: { $exists: false } }] }
  const docs = await Trainer.find(filter).select(
    'subject qualification totalExperience teachingExperience developmentExperience workLookingFor mode location city state'
  )

  if (!docs.length) return { scanned: 0, updated: 0 }

  let updated = 0
  for (const doc of docs) {
    const facets = deriveTrainerFacets(doc)
    const place = resolveTrainerLocation({ city: doc.city, state: doc.state, location: doc.location })

    const update = { ...facets }
    if (!place.errors.length && place.city && place.city !== doc.city) {
      update.city = place.city
      update.state = place.state
      update.location = place.location
    }

    await Trainer.updateOne({ _id: doc._id }, { $set: update })
    updated += 1
  }

  log(`Trainer backfill: ${updated} of ${docs.length} record(s) updated.`)
  return { scanned: docs.length, updated }
}
