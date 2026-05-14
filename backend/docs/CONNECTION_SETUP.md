# Database Connection Setup

## Step 1: MongoDB Atlas Setup
1. Go to https://cloud.mongodb.com
2. Create a new project named `aqdy`
3. Create a free cluster (M0) — AWS, Europe (Frankfurt)
4. Under **Database Access**: create user `aqdy_user` with Atlas Admin role
5. Under **Network Access**: add `0.0.0.0/0`

---

## Step 2: Get Connection String
1. Click **Connect → Drivers**
2. Copy the connection string:

## Step 3: Environment Variables
Create `.env` in the `backend` folder:
```env
MONGODB_URI=mongodb+srv://aqdy_user:<password>@aqdy-cluster.xxxxx.mongodb.net/aqdy_db
NODE_ENV=development
PORT=5000
```
> ⚠️ Never commit `.env` to Git

---

## Step 4: Verify Connection
```bash
npm run dev
```
You should see: MongoDB connected successfully
===========================================================

---

## Collections Created Automatically
Mongoose creates these collections on first use:
- `contracts`
- `riskanalyses`
- `auditlogs`

---

## Testing
Integration tests use a separate test database:



## aqdy_test


This database is dropped after every test run.