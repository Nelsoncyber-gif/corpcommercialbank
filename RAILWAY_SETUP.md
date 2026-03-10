# 🚀 Railway.app Deployment Guide

## ✅ Complete Setup Checklist

### 1. Get Railway Database URL

```
☐ Go to https://railway.app/
☐ Open your project
☐ Click PostgreSQL database
☐ Click "Connect" or "Variables" tab
☐ Copy DATABASE_URL (looks like: postgresql://postgres:xxxx@yyy.railway.app:5432/railway)
```

---

### 2. Update Local `.env` File

```
☐ Open `.env` file
☐ Replace DATABASE_URL with your Railway database URL
☐ Update JWT_SECRET with a random string
☐ Save the file
```

**Your DATABASE_URL should look like:**
```env
DATABASE_URL=postgresql://postgres:AbCdEfGhIjKlMnOp@junction.proxy.rlwy.net:5432/railway
```

---

### 3. Add Variables to Railway Dashboard

```
☐ Go to Railway Dashboard → Your Project → Backend Service
☐ Click "Variables" tab
☐ Add these variables:
```

| Variable | Value | Required? |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://postgres:xxx@yyy.railway.app:5432/railway` | ✅ YES |
| `JWT_SECRET` | `any-random-string-at-least-32-characters` | ✅ YES |
| `NODE_ENV` | `production` | ✅ YES |
| `PORT` | `5000` | Auto-set by Railway |
| `FRONTEND_URL` | `https://your-app.railway.app` | Optional |
| `CARD_ENCRYPTION_KEY` | `your-32-character-encryption-key` | ✅ YES |
| `EMAIL_SERVICE` | `gmail` or `sendgrid` | Optional |
| `EMAIL_USER` | `your-email@gmail.com` | Optional |
| `EMAIL_PASSWORD` | `your-app-password` | Optional |

---

### 4. Deploy to Railway

**Option A: Deploy via GitHub (Recommended)**

```
☐ Push your code to GitHub
☐ In Railway Dashboard, click "New" → "GitHub Repo"
☐ Select your repository
☐ Railway will auto-deploy
```

**Option B: Deploy via Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize your project
railway init

# Deploy
railway up
```

---

### 5. Run Database Migration

**Automatic:** The Procfile runs migration automatically on deploy.

**Manual (if needed):**
```bash
# In Railway Dashboard → Your Project → Settings
# Add "npm run migrate" to Deploy Command
```

Or via Railway CLI:
```bash
railway run npm run migrate
```

---

### 6. Verify Deployment

```
☐ Check Railway logs for errors
☐ Look for: "✅ Database connected successfully"
☐ Look for: "🚀 Server running on port 5000"
☐ Test your API: https://your-app.railway.app/api/accounts/test
```

---

### 7. Test PIN Function

```
☐ Open your deployed frontend
☐ Login/Register
☐ Go to Profile → Set Transaction PIN
☐ Enter password and 6-digit PIN
☐ Check Railway logs for success messages
```

---

## 🔧 Troubleshooting

### "Database connection error"

1. Check DATABASE_URL is correct (copy-paste from Railway)
2. Ensure no spaces in the URL
3. Verify PostgreSQL service is running in Railway

### "Migration failed"

Run manually in Railway:
```bash
railway run npm run migrate
```

### "PIN not working"

Check Railway logs for:
- `🔵 Set PIN endpoint called for user: X`
- `❌` error messages

---

## 📋 Quick Reference

### Railway Commands

```bash
# Login
railway login

# View logs
railway logs

# Run migration
railway run npm run migrate

# Deploy
railway up

# Open dashboard
railway open
```

### Environment Variables Summary

**Required:**
- `DATABASE_URL` - From Railway PostgreSQL
- `JWT_SECRET` - Any 32+ character string
- `CARD_ENCRYPTION_KEY` - Exactly 32 characters

**Optional:**
- `EMAIL_SERVICE` - `gmail` or `sendgrid`
- `EMAIL_USER` - Your email
- `EMAIL_PASSWORD` - App-specific password

---

## 🎯 What's Different for Railway?

| Local Development | Railway Production |
|-------------------|-------------------|
| `DATABASE_URL=postgresql://postgres:password@localhost:5432/db` | `DATABASE_URL=postgresql://postgres:xxx@yyy.railway.app:5432/railway` |
| `NODE_ENV=development` | `NODE_ENV=production` |
| `FRONTEND_URL=http://localhost:3000` | `FRONTEND_URL=https://your-app.railway.app` |

---

**Need Help?** Check Railway logs in the dashboard for real-time error messages.
