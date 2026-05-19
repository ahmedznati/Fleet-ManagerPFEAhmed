# Render Deployment Guide for Fleet Manager Backend

## Database Setup (Already Done ✅)
Your PostgreSQL database is ready on Render:
- **Database Name**: fleet_db_cw9z
- **Username**: fleet_db_cw9z_user
- **Host**: dpg-d5qnaqvgi27c73fggkr0-a.oregon-postgres.render.com
- **Port**: 5432

## Step 1: Push Database Schema

First, push your database schema to Render PostgreSQL. Run this locally:

```bash
cd backend
set DATABASE_URL=postgresql://fleet_db_cw9z_user:oy7OZJncHDq5dirgwm5jmOgOIWhTPHcT@dpg-d5qnaqvgi27c73fggkr0-a.oregon-postgres.render.com/fleet_db_cw9z
npm run db:push
```

## Step 2: Deploy Backend to Render

### Option A: Using Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `fleet-manager-backend`
   - **Region**: Oregon (US West)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

5. Add Environment Variables in Render Dashboard:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `DATABASE_URL` | `postgresql://fleet_db_cw9z_user:oy7OZJncHDq5dirgwm5jmOgOIWhTPHcT@dpg-d5qnaqvgi27c73fggkr0-a/fleet_db_cw9z` |
   | `JWT_SECRET` | (generate a random 32+ character string) |
   | `SESSION_SECRET` | (generate a random 32+ character string) |
   | `FRONTEND_URL` | (your frontend URL, e.g., https://your-frontend.vercel.app) |

   **Note**: Use the **Internal Database URL** (without `.oregon-postgres.render.com`) since both services are on Render.

6. Click **"Create Web Service"**

### Option B: Using render.yaml (Blueprint)

1. Push your code to GitHub (make sure render.yaml is in the backend folder)
2. In Render Dashboard, click **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will auto-detect render.yaml and configure the service

## Step 3: Verify Deployment

Once deployed, your backend will be available at:
```
https://fleet-manager-backend.onrender.com
```

Test the health endpoint:
```
https://fleet-manager-backend.onrender.com/api/health
```

## Step 4: Update Frontend Configuration

After deployment, update your frontend to use the Render backend URL.

Create/update `.env.production` in your frontend:
```
VITE_API_URL=https://fleet-manager-backend.onrender.com
```

## Troubleshooting

### Cold Start Delays
Free tier services on Render spin down after 15 minutes of inactivity. First request may take 30-60 seconds.

### Database Connection Issues
- Use **Internal URL** if backend is on Render
- Use **External URL** if running locally or on another platform

### CORS Issues
The backend is configured to allow requests from:
- localhost:5173 (development)
- Any *.onrender.com domain
- Any *.vercel.app domain
- Any *.netlify.app domain

Add your specific frontend URL to `FRONTEND_URL` environment variable.

## Generate Secure Secrets

Use this command to generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online generator like https://randomkeygen.com/
