import Activity from '../models/Activity.js'

const COLORS = ['red', 'pink', 'yellow', 'blue', 'teal']

export async function logActivity(text, timeAgo = 'Just now') {
  const dateKey = new Date().toISOString().slice(0, 10)
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  await Activity.create({ color, text, time_ago: timeAgo, date_key: dateKey })
}
