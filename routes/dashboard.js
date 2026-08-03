import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Trainer from '../models/Trainer.js'
import Vendor from '../models/Vendor.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import Contact from '../models/Contact.js'
import ImportantLink from '../models/ImportantLink.js'

const router = Router()

router.use(authMiddleware)

const adminSourceFilter = {
  $or: [
    { source: 'admin' },
    { source: { $exists: false } },
    { source: null },
  ],
}

const websiteSourceFilter = { source: 'website' }

function mapDoc(doc) {
  const json = doc.toJSON ? doc.toJSON() : doc
  return json
}

async function getStats() {
  const [
    trainerRecords,
    trainerRegistrations,
    trainersAvailable,
    trainersNotAvailable,
    activeTrainers,
    vendorRecords,
    vendorRegistrations,
    totalJobs,
    publicJobs,
    privateJobs,
    jobApplications,
    totalContacts,
    unreadContacts,
    importantLinks,
  ] = await Promise.all([
    Trainer.countDocuments(adminSourceFilter),
    Trainer.countDocuments(websiteSourceFilter),
    Trainer.countDocuments({ ...adminSourceFilter, status: 'available' }),
    Trainer.countDocuments({ ...adminSourceFilter, status: 'not_available' }),
    Trainer.countDocuments({
      ...adminSourceFilter,
      workLookingFor: { $exists: true, $ne: '' },
    }),
    Vendor.countDocuments(adminSourceFilter),
    Vendor.countDocuments(websiteSourceFilter),
    Job.countDocuments(),
    Job.countDocuments({ visibility: 'Public' }),
    Job.countDocuments({ visibility: { $ne: 'Public' } }),
    JobApplication.countDocuments(),
    Contact.countDocuments(),
    Contact.countDocuments({ read: false }),
    ImportantLink.countDocuments(),
  ])

  return {
    numberOfTrainers: trainerRecords,
    numberOfVendors: vendorRecords,
    activeTrainers,
    trainers: {
      records: trainerRecords,
      registrations: trainerRegistrations,
      available: trainersAvailable,
      notAvailable: trainersNotAvailable,
      active: activeTrainers,
    },
    vendors: {
      records: vendorRecords,
      registrations: vendorRegistrations,
    },
    jobs: {
      total: totalJobs,
      public: publicJobs,
      private: privateJobs,
    },
    jobApplications,
    contacts: {
      total: totalContacts,
      unread: unreadContacts,
    },
    importantLinks,
  }
}

router.get('/stats', async (req, res) => {
  try {
    res.json(await getStats())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/overview', async (req, res) => {
  try {
    const sortNewest = { createdAt: -1 }

    const [
      stats,
      trainerRecords,
      trainerRegistrations,
      vendorRecords,
      vendorRegistrations,
      jobs,
      contacts,
      jobApplications,
      importantLinks,
    ] = await Promise.all([
      getStats(),
      Trainer.find(adminSourceFilter).sort(sortNewest),
      Trainer.find(websiteSourceFilter).sort(sortNewest),
      Vendor.find(adminSourceFilter).sort(sortNewest),
      Vendor.find(websiteSourceFilter).sort(sortNewest),
      Job.find().sort(sortNewest),
      Contact.find().sort(sortNewest),
      JobApplication.find().sort(sortNewest),
      ImportantLink.find().sort({ createdAt: -1 }),
    ])

    res.json({
      stats,
      lists: {
        trainerRecords: trainerRecords.map(mapDoc),
        trainerRegistrations: trainerRegistrations.map(mapDoc),
        vendorRecords: vendorRecords.map(mapDoc),
        vendorRegistrations: vendorRegistrations.map(mapDoc),
        jobs: jobs.map(mapDoc),
        contacts: contacts.map(mapDoc),
        jobApplications: jobApplications.map(mapDoc),
        importantLinks: importantLinks.map(mapDoc),
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
