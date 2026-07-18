# Trainer Adda Backend

Express backend for the Trainer Adda Admin panel and website. Handles authentication, vendors, trainers (with Cloudinary photo/resume upload), jobs, important links, dashboard stats, activities, and contact messages.

## Setup

1. Copy `.env.example` to `.env` and fill in values.
2. `npm install`
3. `npm start` (or `npm run dev`)

## Environment

- `MONGODB_URI` – MongoDB connection string
- `JWT_SECRET` – secret for admin auth
- `CORS_ORIGINS` – comma-separated frontend origins; use `*` to allow all origins
- Cloudinary keys for trainer photo/resume uploads
