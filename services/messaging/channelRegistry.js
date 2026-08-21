/** @type {Map<string, import('./types.js').MessagingChannel>} */
const channels = new Map()

export function registerChannel(channel) {
  channels.set(channel.id, channel)
}

export function getChannel(id) {
  const ch = channels.get(id)
  if (!ch) throw new Error(`Messaging channel not registered: ${id}`)
  return ch
}

export function listChannels() {
  return [...channels.values()]
}

export function listActiveChannelIds() {
  return [...channels.keys()]
}

export function hasChannel(id) {
  return channels.has(id)
}
