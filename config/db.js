import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/vms'

export async function connectDB() {
  await mongoose.connect(MONGODB_URI)
  console.log('MongoDB connected')
}

export async function init() {
  await connectDB()
  const count = await User.countDocuments()
  if (count === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    const name = process.env.ADMIN_NAME || 'Admin User'
    const password_hash = bcrypt.hashSync(password, 10)
    await User.create({ username, password_hash, name })
    console.log('Default admin user created. Username:', username)
  }
}

export { mongoose }
