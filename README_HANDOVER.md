# Vaishali Snacks Billing System - Modernized (Cloud + Mobile)

This project has been migrated from a legacy Electron desktop app to a modern, cross-platform architecture.

## 🏗 New Architecture
1.  **Admin Web App (`Client/`):** React-based dashboard for managing items, users, and viewing reports. Hosted on Netlify/Vercel.
2.  **Android Billing App (`android-billing/`):** React + Capacitor mobile app for counter staff to generate bills.
3.  **Backend API (`server/`):** Node.js + Express REST API. 100% cloud-based, hosted on Railway/Render.
4.  **Database:** MongoDB Atlas (Live cloud database).

---

## 🚀 Deployment Guide

### 1. Database (MongoDB Atlas)
1.  Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Create a database user and whitelist `0.0.0.0/0` (or specific IPs).
3.  Copy the connection string (URI).

### 2. Backend API (`server/`) - Deploy to Railway/Render
1.  Connect your GitHub repo to **Railway.app** or **Render.com**.
2.  Set the Root Directory to `server/`.
3.  Configure Environment Variables:
    - `MONGODB_URI`: Your Atlas connection string.
    - `JWT_SECRET`: A long random string.
    - `ALLOWED_ORIGINS`: Comma-separated list (e.g., `https://your-admin.netlify.app,https://your-billing.netlify.app`).
4.  The server uses the `Procfile` and will automatically build and start.

### 3. Admin Web App (`Client/`) - Deploy to Netlify
1.  Connect to **Netlify.com**.
2.  Base Directory: `Client/`.
3.  Build Command: `npm run build`.
4.  Publish Directory: `Client/dist`.
5.  Environment Variables:
    - `VITE_API_URL`: Your deployed Backend URL + `/api` (e.g., `https://api.vercel.app/api`).

### 4. Android Billing App (`android-billing/`)
1.  In `android-billing/src/services/api.ts`, ensure `API_URL` points to your backend.
2.  Run `npm run build` to generate the `dist/` folder.
3.  Run `npx cap sync` to copy code to the Android project.
4.  Open in **Android Studio**: `npx cap open android`.
5.  Generate the **Signed APK/Bundle** from Android Studio.

---

## 💻 Local Development
- **Root:** `npm run dev` (Runs both client and server via concurrently).
- **Billing App:** `cd android-billing && npm run dev`.

---

## 🛠 Key Changes from Legacy Version
- **No Setup Page:** Configuration is now managed via `.env` files and Atlas.
- **BrowserRouter:** Switched from HashRouter for cleaner URLs and SEO.
- **Printing:** Uses system-native `window.print()` (Works on Android via Share/Print dialog).
- **Hardened API:** Added `helmet`, `CORS` whitelist, and `rate-limiting`.
- **Role-Based:** Admin dashboard and Billing terminal are now separate codebases for security and mobile optimization.
