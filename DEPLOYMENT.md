# 🚀 TrackX Deployment Guide - Render

This guide will help you deploy TrackX to Render with MongoDB Atlas and Redis.

---

## 📋 Prerequisites

1. **GitHub Account** - Push your code to GitHub
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **MongoDB Atlas Account** - Free tier at [mongodb.com/atlas](https://mongodb.com/atlas)
4. **Upstash Account** (Optional) - Free Redis at [upstash.com](https://upstash.com) or use Render Redis

---

## 🗂️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   TrackX Web    │     │   TrackX API    │     │  MongoDB Atlas  │
│  (Static Site)  │────▶│  (Web Service)  │────▶│   (Database)    │
│   Render Free   │     │  Render Starter │     │   Free Tier     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Upstash Redis  │
                        │   (Caching)     │
                        │   Free Tier     │
                        └─────────────────┘
```

---

## 🔧 Step 1: Set Up MongoDB Atlas

### 1.1 Create a Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **"Build a Database"**
3. Choose **M0 Free Tier**
4. Select **AWS** and region closest to your users (Mumbai for India)
5. Name your cluster: `trackx-cluster`

### 1.2 Create Database User
1. Go to **Database Access** → **Add New Database User**
2. Authentication: **Password**
3. Username: `trackx_admin`
4. Create a strong password (save it!)
5. Role: **Atlas Admin**

### 1.3 Configure Network Access
1. Go to **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Required for Render's dynamic IPs

### 1.4 Get Connection String
1. Go to **Database** → **Connect** → **Drivers**
2. Copy the connection string:
   ```
   mongodb+srv://trackx_admin:<password>@trackx-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your password
4. Add database name before `?`:
   ```
   mongodb+srv://trackx_admin:yourpassword@trackx-cluster.xxxxx.mongodb.net/trackx?retryWrites=true&w=majority
   ```

---

## 🔧 Step 2: Set Up Upstash Redis (Recommended)

### 2.1 Create Redis Database
1. Go to [Upstash Console](https://console.upstash.com)
2. Click **"Create Database"**
3. Name: `trackx-cache`
4. Region: Select closest to Render (US West if using Oregon)
5. Enable **TLS/SSL**

### 2.2 Get Connection URL
1. Copy the **Redis URL** from dashboard:
   ```
   rediss://default:xxxxx@xxxxx.upstash.io:6379
   ```

---

## 🚀 Step 3: Deploy to Render

### Option A: Blueprint Deployment (Recommended)

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New"** → **"Blueprint"**
4. Connect your GitHub repo
5. Render will detect `render.yaml` and set up both services
6. Configure environment variables (see Step 4)

### Option B: Manual Deployment

#### Deploy Backend (Web Service)

1. Go to Render Dashboard → **"New"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `trackx-api`
   - **Region**: Oregon (or Singapore)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/mo) or Free (with limitations)

4. Add Environment Variables (see Step 4)
5. Click **"Create Web Service"**

#### Deploy Frontend (Static Site)

1. Go to Render Dashboard → **"New"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `trackx-client`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Add Environment Variables:
   ```
   VITE_API_URL=https://trackx-api.onrender.com
   VITE_SOCKET_URL=https://trackx-api.onrender.com
   ```

5. Add Rewrite Rules (Settings → Redirects/Rewrites):
   ```
   Source: /*
   Destination: /index.html
   Action: Rewrite
   ```

---

## 🔐 Step 4: Environment Variables

### Backend (trackx-api)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3001` | Server port |
| `DATABASE_URL` | `mongodb+srv://...` | MongoDB Atlas URL |
| `REDIS_URL` | `rediss://...` | Upstash Redis URL |
| `JWT_ACCESS_SECRET` | (generate) | 32+ char random string |
| `JWT_REFRESH_SECRET` | (generate) | 32+ char random string |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry |
| `CORS_ORIGIN` | `https://trackx-client.onrender.com` | Frontend URL |

#### Generate Secrets
Use this command to generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (trackx-client)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://trackx-api.onrender.com` |
| `VITE_SOCKET_URL` | `https://trackx-api.onrender.com` |

---

## 📁 Step 5: Configure Uploads (Persistent Storage)

Render's file system is ephemeral. For driver photos and uploads:

### Option A: Render Disk (Paid)
Add a disk in your web service settings:
- **Mount Path**: `/opt/render/project/src/uploads`
- **Size**: 1 GB

### Option B: Cloud Storage (Recommended for Production)
Use Cloudinary, AWS S3, or similar:
1. Sign up for [Cloudinary](https://cloudinary.com) (free tier)
2. Update your upload logic to save to cloud storage
3. Add Cloudinary credentials to environment variables

---

## ✅ Step 6: Verify Deployment

### 1. Check Backend Health
```bash
curl https://trackx-api.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-10T12:00:00.000Z",
  "environment": "production"
}
```

### 2. Check Frontend
Visit `https://trackx-client.onrender.com`

### 3. Test Login
Try logging in with your admin/driver credentials

---

## 🔄 Step 7: Initialize Database

Run the seed script to create initial admin:

1. In Render dashboard, go to your API service
2. Click **"Shell"** tab
3. Run:
   ```bash
   npm run seed
   ```

Or locally with production DATABASE_URL:
```bash
cd server
DATABASE_URL="your-mongodb-atlas-url" npm run seed
```

---

## ⚠️ Important Notes

### Free Tier Limitations
- **Render Free Web Services** spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- For production, use Starter plan ($7/month)

### Socket.IO on Render
- Works out of the box with Render Web Services
- Long polling fallback is automatic

### Cold Starts
- Add a health check service or use uptime monitoring (UptimeRobot, Pingdom)
- This keeps your service warm

---

## 🐛 Troubleshooting

### Build Fails
1. Check Render build logs
2. Ensure `prisma generate` runs in build command
3. Verify Node version matches `engines` in package.json

### Database Connection Issues
1. Verify MongoDB Atlas allows `0.0.0.0/0`
2. Check connection string format
3. Ensure database name is in the URL

### CORS Errors
1. Verify `CORS_ORIGIN` matches your frontend URL exactly
2. No trailing slash in the URL
3. Include `https://` prefix

### Socket.IO Not Working
1. Check browser console for connection errors
2. Verify `VITE_SOCKET_URL` is correct
3. Check Render logs for socket errors

---

## 📊 Monitoring

### Render Dashboard
- View logs, metrics, and deployment history
- Set up alerts for errors/downtime

### Recommended Tools
- **UptimeRobot** - Free uptime monitoring
- **LogDNA/Papertrail** - Log aggregation
- **Sentry** - Error tracking

---

## 💰 Cost Estimate (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Render API | Starter | $7 |
| Render Static | Free | $0 |
| MongoDB Atlas | M0 | $0 |
| Upstash Redis | Free | $0 |
| **Total** | | **$7/month** |

For production at scale, consider upgrading MongoDB and Redis.

---

## 🔗 Quick Links

- [Render Dashboard](https://dashboard.render.com)
- [MongoDB Atlas](https://cloud.mongodb.com)
- [Upstash Console](https://console.upstash.com)
- [Render Documentation](https://render.com/docs)
