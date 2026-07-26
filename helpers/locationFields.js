import { INDIA_LOCATIONS, LEGACY_CITY_ALIASES } from '../data/indiaLocations.js'

/** Lowercase alphanumeric key so "New Delhi", "new-delhi" and "newdelhi" compare equal. */
export function locationKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

const stateByKey = new Map()
const cityIndex = new Map() // cityKey -> [{ city, state }]

for (const entry of INDIA_LOCATIONS) {
  stateByKey.set(locationKey(entry.state), entry.state)
  for (const city of entry.cities) {
    const key = locationKey(city)
    const matches = cityIndex.get(key) || []
    matches.push({ city, state: entry.state })
    cityIndex.set(key, matches)
  }
}

const aliasIndex = new Map()
for (const [alias, canonicalCity] of Object.entries(LEGACY_CITY_ALIASES)) {
  const match = cityIndex.get(locationKey(canonicalCity))?.[0]
  if (match) aliasIndex.set(locationKey(alias), match)
}

export function getLocationOptions() {
  return INDIA_LOCATIONS.map(({ state, cities }) => ({ state, cities: [...cities] }))
}

/** Display string stored on the trainer, e.g. "Bengaluru, Karnataka". */
export function formatLocation(city, state) {
  if (!city) return ''
  if (!state || state === 'Other') return city
  return `${city}, ${state}`
}

function findCity(cityValue, stateValue) {
  const key = locationKey(cityValue)
  if (!key) return null

  const matches = cityIndex.get(key) || (aliasIndex.has(key) ? [aliasIndex.get(key)] : [])
  if (!matches.length) return null

  const stateKey = locationKey(stateValue)
  if (stateKey) {
    return matches.find((m) => locationKey(m.state) === stateKey) || null
  }
  return matches.length === 1 ? matches[0] : null
}

/**
 * Resolves a trainer location to the canonical city/state pair.
 *
 * Picker input (`city` + `state`) must match the shared list. Free-text `location`
 * from legacy records is upgraded when it can be matched, and otherwise kept as-is
 * so old profiles stay editable.
 */
export function resolveTrainerLocation({ city, state, location } = {}) {
  const errors = []
  const rawCity = String(city ?? '').trim()
  const rawState = String(state ?? '').trim()
  const rawLocation = String(location ?? '').trim()

  if (rawCity) {
    const match = findCity(rawCity, rawState)
    if (!match) {
      errors.push(
        rawState
          ? `"${rawCity}" is not a listed city for ${rawState}.`
          : `"${rawCity}" is not in the supported city list.`
      )
      return { errors, city: '', state: '', location: rawLocation }
    }
    return { errors, city: match.city, state: match.state, location: formatLocation(match.city, match.state) }
  }

  if (rawState && !stateByKey.has(locationKey(rawState))) {
    errors.push(`"${rawState}" is not a supported state.`)
    return { errors, city: '', state: '', location: rawLocation }
  }

  if (!rawLocation) {
    return { errors, city: '', state: rawState ? stateByKey.get(locationKey(rawState)) : '', location: '' }
  }

  // Legacy free text: "Bengaluru", "Banglore, Karnataka", "Bangalore - KA"
  const [firstPart, secondPart] = rawLocation.split(/[,\-/|]/).map((p) => p.trim())
  const match =
    findCity(rawLocation, rawState) ||
    findCity(firstPart, secondPart || rawState) ||
    findCity(firstPart)
  if (match) {
    return { errors, city: match.city, state: match.state, location: formatLocation(match.city, match.state) }
  }

  return { errors, city: '', state: rawState ? stateByKey.get(locationKey(rawState)) : '', location: rawLocation }
}
