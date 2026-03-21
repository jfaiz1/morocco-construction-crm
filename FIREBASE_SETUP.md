# Firebase Firestore Setup Guide

## 🚀 Why Firestore?

- ✅ **1GB free storage** (50,000+ invoices)
- ✅ **Real-time database**
- ✅ **No monthly server cost**
- ✅ **Google reliability**
- ✅ **Automatic backups**
- ✅ **Scale for free** until you hit limits

---

## 📋 Setup Steps (5 minutes)

### Step 1: Create Firebase Project

1. Go to **[Firebase Console](https://console.firebase.google.com)**
2. Click **"Add Project"**
3. Project name: `invoice-crm-morocco`
4. Accept terms
5. Click **"Create Project"**
6. Wait for creation (1-2 min)

### Step 2: Create Firestore Database

1. In Firebase Console, click **"Build"** → **"Firestore Database"**
2. Click **"Create Database"**
3. Choose **"Start in production mode"**
4. Select region: **"europe-west1"** (closest to Morocco) or **"us-central1"**
5. Click **"Create"**
6. Wait for Firestore to initialize

### Step 3: Create Service Account Key

1. Go to **Project Settings** (⚙️ gear icon, top right)
2. Click **"Service Accounts"** tab
3. Click **"Generate New Private Key"**
4. A JSON file downloads automatically
5. **Save this file** as `firebase-service-account.json` in `backend/` folder

```
backend/
├── server.js
├── whatsapp-bot.js
├── firestore-db.js
├── firebase-service-account.json  ← SAVE HERE
├── package.json
└── .env
```

### Step 4: Update .env File

Add to `backend/.env`:

```
# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Other config (existing)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
CLAUDE_API_KEY=...
DEEPGRAM_API_KEY=...
```

### Step 5: Create Firestore Collections

Run this in Firebase Console:

**Collection 1: `invoices`**
```
Click "Start Collection" → Name: "invoices"
Add first document (optional)
```

**Collection 2: `conversations`**
```
Click "Start Collection" → Name: "conversations"
Add first document (optional)
```

---

## ✅ Test the Connection

1. Install dependencies:
```bash
cd backend
npm install
```

2. Start server:
```bash
npm start
```

3. Check logs:
```
✅ Firestore connected
💾 Using Firestore database
🚀 WhatsApp CRM running on port 3001
```

4. Test API:
```bash
curl http://localhost:3001/api/health
```

Response should show:
```json
{
  "status": "ok",
  "database": "Firestore"
}
```

---

## 📊 Firestore Data Structure

### `invoices` Collection

```json
{
  "id": "INV-1711018400000",
  "phoneNumber": "+212612345678",
  "vendor": "ABC Construction",
  "amount": 25000,
  "dueDate": "2026-05-30T00:00:00.000Z",
  "status": "pending",
  "description": "Invoice from WhatsApp photo",
  "createdAt": "2026-03-21T14:07:00.000Z",
  "updatedAt": "2026-03-21T14:07:00.000Z"
}
```

### `conversations` Collection

```json
{
  "phoneNumber": "+212612345678",
  "language": "fr",
  "lastAction": "upload_invoice",
  "invoices": ["INV-1711018400000", "INV-1711018400001"],
  "updatedAt": "2026-03-21T14:07:00.000Z",
  "messages": [  // Subcollection
    {
      "type": "image",
      "content": "[Invoice photo]",
      "response": "✅ Facture créée",
      "timestamp": "2026-03-21T14:07:00.000Z"
    }
  ]
}
```

---

## 🔐 Security Rules

By default, Firestore is in **production mode** (secure). If you need to test without authentication, use these rules:

**⚠️ WARNING: Only for development!**

Go to **Firestore Rules** tab and replace with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For production, use proper authentication.

---

## 💰 Costs (with 1GB free)

| Operation | Free Limit | Price After |
|-----------|-----------|------------|
| Read | 50K/day | $0.06 per 100K |
| Write | 20K/day | $0.18 per 100K |
| Delete | 20K/day | $0.02 per 100K |
| Storage | 1GB | $0.18/GB |

**Example:** 1000 invoices created/month = **FREE** ✅

---

## 🚀 Deploying with Firestore

### Option 1: Render (Recommended)

1. Push code to GitHub (including `firebase-service-account.json`)
2. Connect Render to GitHub
3. Set environment variable: `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json`
4. Deploy
5. Firestore works automatically!

### Option 2: Railway

1. Push code to GitHub
2. Connect Railway to GitHub
3. Add environment variables
4. Deploy

### Option 3: Vercel (Node.js only)

1. Vercel doesn't support Node.js well for this
2. Stick with Render or Railway

---

## 🐛 Troubleshooting

### "Cannot find firebase-service-account.json"
- Download it again from Firebase Console → Project Settings → Service Accounts
- Place it in `backend/` folder (same location as `server.js`)

### "Firestore permission denied"
- Check Security Rules (should be in production mode by default)
- Make sure service account has Firestore permissions

### "No invoices showing up"
- Check Firestore Console → Collections → `invoices`
- Make sure data is being written
- Try creating an invoice manually via API

### "Connection timeout"
- Check internet connection
- Verify project ID is correct in service account JSON
- Check Firebase project is active (not paused)

---

## 📱 How Contractors See It

Nothing changes! From their perspective:
- Send invoice photo to WhatsApp
- Bot responds "✅ Facture créée"
- Data is stored in Firestore (they don't know this!)

---

## 🎉 You're Done!

Your WhatsApp CRM now:
- ✅ Stores data in **Firestore** (free, reliable)
- ✅ Works with **1GB free storage**
- ✅ Scales automatically
- ✅ Has automatic backups
- ✅ Can be accessed anywhere

**Contractors can start using it immediately!**

---

## 📞 Next Steps

1. ✅ Get Firebase project running
2. ✅ Download service account JSON
3. ✅ Place in `backend/` folder
4. ✅ Run `npm start`
5. ✅ Test WhatsApp messages
6. ✅ Deploy to production

Questions? Check Firebase docs: https://firebase.google.com/docs/firestore
