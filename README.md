# VMS Backend

Express backend for the VMS Admin panel and VMS frontend. Handles authentication, vendors, trainers (with Cloudinary photo upload), jobs, important links, dashboard stats, and activities.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `MONGODB_URI` – MongoDB connection string (e.g. `mongodb://localhost:27017/vms` or MongoDB Atlas URI)
   - `PORT` – server port (default 4000)
   - `CORS_ORIGINS` – comma-separated frontend origins (e.g. `http://localhost:5173`)
   - `JWT_SECRET` – strong random string for JWT signing
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` – default admin (created on first run if DB is empty)
   - **Cloudinary** (optional, for trainer profile photos):
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     If not set, trainer photo upload is skipped and only URL can be used.

3. **Run**
   ```bash
   npm run dev
   ```
   Or production: `npm start`

## API (base: `/api`)

All routes except auth require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with `{ username, password }` → `{ token, user }` |
| GET | `/vendors` | List vendors |
| GET | `/vendors/:id` | Get vendor |
| POST | `/vendors` | Create vendor |
| PUT | `/vendors/:id` | Update vendor |
| DELETE | `/vendors/:id` | Delete vendor |
| GET | `/trainers` | List trainers |
| GET | `/trainers/:id` | Get trainer |
| POST | `/trainers` | Create trainer (body JSON or `multipart/form-data` with optional `photo` file) |
| PUT | `/trainers/:id` | Update trainer (same as above) |
| DELETE | `/trainers/:id` | Delete trainer |
| GET | `/jobs` | List jobs |
| GET | `/jobs/:id` | Get job |
| POST | `/jobs` | Create job |
| PUT | `/jobs/:id` | Update job |
| DELETE | `/jobs/:id` | Delete job |
| GET | `/important-links` | List links |
| POST | `/important-links` | Create link `{ description, url }` |
| DELETE | `/important-links/:id` | Delete link |
| GET | `/dashboard/stats` | Dashboard counts: `numberOfTrainers`, `numberOfVendors`, `activeTrainers` |
| GET | `/activities?date=YYYY-MM-DD` | Activities for the given date |

## Data

- **MongoDB** – all data is stored in MongoDB. Set `MONGODB_URI` in `.env` (e.g. `mongodb://localhost:27017/vms` or a MongoDB Atlas connection string).
- Default admin user is created on first run if the `users` collection is empty (using `ADMIN_*` env vars).

## Trainer photo upload

- Use `multipart/form-data` with a file field named `photo` (image). The file is uploaded to Cloudinary (folder `vms/trainers`) and the returned URL is stored.
- If Cloudinary is not configured, the request still succeeds but the photo URL will be empty or the one sent in the form.
