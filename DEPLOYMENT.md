# ChopNow Deployment Guide

This guide covers deploying ChopNow with:

- **Frontend**: Vercel (free tier)
- **Backend**: Railway (free tier)

---

## Prerequisites

- GitHub account (code already pushed)
- Vercel account: https://vercel.com/signup
- Railway account: https://railway.app/login
- Your `.env` file with all credentials

---

## Step 1: Deploy Backend on Railway

### 1.1 Create Railway Account & Project

1. Go to https://railway.app
2. Sign up with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your repository: `Chop-Now/ChopNow`
6. Select the `Backend` folder as root directory

### 1.2 Configure Environment Variables

In Railway dashboard → Your Project → **Variables** tab, add all variables from your local `Backend/.env` file:

| Variable                | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `MONGO_URI`             | Your MongoDB connection string                                     |
| `JWT_SECRET`            | Your JWT secret key (generate strong 32+ char string)              |
| `JWT_EXPIRE`            | `30d`                                                              |
| `PORT`                  | `5000`                                                             |
| `NODE_ENV`              | `production`                                                       |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name                                         |
| `CLOUDINARY_API_KEY`    | Your Cloudinary API key                                            |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret                                         |
| `BREVO_API_KEY`         | Your Brevo API key (used for transaction emails / OTPs)            |
| `FROM_EMAIL`            | Your verified sender email address                                 |
| `FROM_NAME`             | `ChopNow`                                                          |
| `GOOGLE_CLIENT_ID`      | Your Google OAuth client ID                                        |
| `GOOGLE_CLIENT_SECRET`  | Your Google OAuth client secret                                    |
| `FRONTEND_URL`          | (Add after frontend deploy, e.g., https://your-app.vercel.app)     |
| `ALLOWED_ORIGINS`       | (Add after frontend deploy, e.g., https://your-app.vercel.app)     |
| `FIREBASE_PROJECT_ID`   | Your Firebase project ID (for push notifications)                  |
| `FIREBASE_CLIENT_EMAIL` | Your Firebase Admin service account client email                   |
| `FIREBASE_PRIVATE_KEY`  | Your Firebase Admin private key (escape newlines as `\n` or `\\n`) |

> **TIP**: Copy values directly from your local `Backend/.env` file. Do NOT upload `firebase-service-account.json` directly to git; instead, populate the `FIREBASE_*` inline variables listed above in the Railway panel.

### 1.3 Deploy

1. Railway will auto-deploy from your GitHub repo
2. Wait for build to complete (2-3 minutes)
3. Click **"Generate Domain"** to get your backend URL
4. Copy the URL (e.g., `https://chopnow-backend.up.railway.app`)

### 1.4 Verify Backend

Visit: `https://your-railway-url/health`

You should see: `{"status":"ok"}`

---

## Step 2: Deploy Frontend on Vercel

### 2.1 Create Vercel Project

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click **"Add New Project"**
4. Import your repository: `Chop-Now/ChopNow`
5. Configure:
   - **Root Directory**: `Frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.2 Configure Environment Variables

In Vercel dashboard → Project Settings → **Environment Variables**, add:

| Variable                | Value                                                                     |
| ----------------------- | ------------------------------------------------------------------------- |
| `VITE_API_URL`          | Your Railway backend URL (e.g., `https://chopnow-backend.up.railway.app`) |
| `VITE_GOOGLE_CLIENT_ID` | Same Google Client ID from your `.env`                                    |

### 2.3 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (1-2 minutes)
3. Your frontend URL will be: `https://your-project.vercel.app`

---

## Step 3: Update Backend CORS Settings

Go back to Railway and add/update these environment variables:

| Variable          | Value                    |
| ----------------- | ------------------------ |
| `FRONTEND_URL`    | Your Vercel frontend URL |
| `ALLOWED_ORIGINS` | Your Vercel frontend URL |

Redeploy the backend for changes to take effect.

---

## Step 4: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Add to **Authorized JavaScript origins**:
   - `https://your-frontend.vercel.app`
4. Add to **Authorized redirect URIs**:
   - `https://your-frontend.vercel.app`
   - `https://your-frontend.vercel.app/login`

---

## Deployment Checklist

- [ ] Backend deployed on Railway
- [ ] Backend environment variables set (copy from local `.env`)
- [ ] Backend health check works (`/health`)
- [ ] Frontend deployed on Vercel
- [ ] Frontend environment variables set
- [ ] CORS origins updated on backend
- [ ] Google OAuth URLs updated
- [ ] Test login/registration
- [ ] Test business creation
- [ ] Test order flow

---

## Troubleshooting

### CORS Errors

- Ensure `ALLOWED_ORIGINS` on backend matches your Vercel URL exactly
- No trailing slash in the URL

### Google Login Fails

- Verify redirect URIs in Google Cloud Console
- Check `VITE_GOOGLE_CLIENT_ID` matches backend's `GOOGLE_CLIENT_ID`

### API Connection Failed

- Verify `VITE_API_URL` points to correct Railway URL
- Check backend logs in Railway dashboard

### Build Failures

- Check build logs in Vercel/Railway dashboards
- Ensure all dependencies are in `package.json`

---

## Custom Domain (Optional)

### Vercel (Frontend)

1. Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Railway (Backend)

1. Project Settings → Domains
2. Add custom domain
3. Update DNS records

Remember to update:

- `ALLOWED_ORIGINS` on backend
- `VITE_API_URL` on frontend
- Google OAuth redirect URIs

---

## Security Reminder

**NEVER commit your `.env` files or share credentials in:**

- Git commits
- Public documentation
- Chat messages
- Screenshots

Always use the platform's secure environment variable settings.

---

## Support

For deployment issues:

- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
