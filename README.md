# CelestialPeopleMeet

The worldwide Celestial Church of Christ community platform — parish discovery, prayer wall, choir, service teams, events, messaging, and more.

**Domain:** [celestialpeoplemeet.com](https://celestialpeoplemeet.com)  
**GitHub:** https://github.com/clockpals1/CPM-new-web

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Tailwind CSS + shadcn/ui + React Router v7 |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas (free M0 cluster) |
| Storage | Cloudflare R2 |
| Email | Resend |
| Push | VAPID / Web Push |
| Frontend hosting | Cloudflare Pages |
| Backend hosting | Render (free web service) |

---

## Local Development

### Backend
```bash
cd backend
cp .env.example .env        # fill in your values
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
cp .env.example .env        # set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

---

## Deployment

### 1. MongoDB Atlas (Database)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create a free **M0** cluster
2. Create a database user with a strong password
3. Allow all IPs (`0.0.0.0/0`) in Network Access (Render uses dynamic IPs)
4. Copy the connection string → use as `MONGO_URL`

### 2. Backend → Render
1. Go to [render.com](https://render.com) → New → **Blueprint**
2. Connect your GitHub repo (`clockpals1/CPM-new-web`)
3. Render will detect `render.yaml` and create the `cpm-backend` service automatically
4. In the Render dashboard, set the secret environment variables:
   - `MONGO_URL` — your MongoDB Atlas connection string
   - `ADMIN_EMAIL` — your super admin email
   - `ADMIN_PASSWORD` — your super admin password
5. Deploy. Your backend URL will be: `https://cpm-backend.onrender.com`

> **Note:** Free Render services spin down after 15 min of inactivity (cold start ~30s). Upgrade to a paid plan to keep it always-on.

### 3. Frontend → Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → Create a project
2. Connect to GitHub → select `clockpals1/CPM-new-web`
3. Set build configuration:
   - **Framework preset:** Create React App
   - **Build command:** `yarn build`
   - **Build output directory:** `build`
   - **Root directory:** `frontend`
4. Add environment variable:
   - `REACT_APP_BACKEND_URL` = `https://cpm-backend.onrender.com`
5. Deploy.

### 4. Custom Domain → celestialpeoplemeet.com
1. In Cloudflare Pages → your project → **Custom domains** → Add `celestialpeoplemeet.com`
2. Since the domain is already on Cloudflare DNS, it will configure automatically.
3. Update `CORS_ORIGINS` on Render to include your final domain if needed.

---

## Environment Variables Reference

### Backend (Render)
| Variable | Description |
|---|---|
| `MONGO_URL` | MongoDB Atlas connection string |
| `DB_NAME` | Database name (default: `celestialpeoplemeet`) |
| `JWT_SECRET` | Long random string for JWT signing |
| `ADMIN_EMAIL` | Super admin login email |
| `ADMIN_PASSWORD` | Super admin login password |
| `ADMIN_NAME` | Super admin display name |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |

### Frontend (Cloudflare Pages)
| Variable | Description |
|---|---|
| `REACT_APP_BACKEND_URL` | Full URL of the Render backend (no trailing slash) |
