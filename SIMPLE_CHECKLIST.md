# ✅ SIMPLE CHECKLIST - Print This Out!

**Deadline:** 12:59 PM Today  
**Total Time:** 2 hours max

---

## 🖥️ SOFTWARE SETUP (20 minutes)

### Install These First:

□ **Node.js** (5 min)
   - Go to nodejs.org → Download LTS → Install
   - Test: Open terminal, type `node --version`
   - ✅ Should show: v20.x.x

□ **VS Code** (3 min)
   - Go to code.visualstudio.com → Download → Install
   - Test: Open VS Code app
   - ✅ Should see welcome screen

□ **Git** (3 min)
   - Go to git-scm.com/download → Install
   - Test: Open terminal, type `git --version`
   - ✅ Should show: git version 2.x.x

---

## 🌐 CREATE ACCOUNTS (6 minutes)

□ **GitHub** (2 min)
   - Go to github.com → Sign up
   - ✅ Email verified, logged in

□ **Firebase** (2 min)
   - Go to console.firebase.google.com
   - Sign in with Google
   - ✅ See Firebase dashboard

□ **Vercel** (2 min)
   - Go to vercel.com → Sign up with GitHub
   - ✅ See Vercel dashboard

---

## 📁 PROJECT SETUP (4 minutes)

□ **Extract Project** (1 min)
   - Download whiteboard-mvp.zip
   - Right-click → Extract to Desktop
   - ✅ Folder `whiteboard-mvp` on Desktop

□ **Install Dependencies** (3 min)
   - Open terminal
   - Run: `cd Desktop/whiteboard-mvp`
   - Run: `npm install`
   - ✅ See "added 1500 packages"

---

## 🔥 FIREBASE SETUP (15 minutes) ⚠️ CRITICAL

□ **Create Project** (3 min)
   - Firebase Console → Add project
   - Name: whiteboard-mvp
   - Disable Analytics → Create
   - ✅ Project created

□ **Enable Google Auth** (2 min)
   - Authentication → Get started
   - Google → Enable → Save
   - ✅ Google has green checkmark

□ **Create Firestore** (3 min)
   - Firestore Database → Create
   - Test mode → Next → Enable
   - ✅ Database created

□ **Set Rules** (1 min)
   - Rules tab → Paste rules (from guide)
   - Publish
   - ✅ "Rules published successfully"

□ **Get Config** (3 min)
   - Settings ⚙️ → Project settings
   - Scroll to "Your apps" → Web icon
   - Register app → Copy config
   - ✅ Config copied to clipboard

□ **Add to Code** (3 min) ⚠️ MOST IMPORTANT!
   - VS Code → Open folder → whiteboard-mvp
   - Open: src/lib/firebase.ts
   - Replace placeholder with YOUR config
   - Save (Ctrl+S or Cmd+S)
   - ✅ NO "YOUR_" text remains!

---

## 🧪 LOCAL TEST (5 minutes)

□ **Start Dev Server**
   - Terminal: `npm start`
   - ✅ Browser opens to localhost:3000

□ **Sign In**
   - Click "Sign in with Google"
   - ✅ See whiteboard

□ **Test Features**
   - Click 📝 → Click canvas → Sticky appears
   - Double-click sticky → Edit text
   - Click ▭ → Click canvas → Rectangle appears
   - Drag objects around
   - ✅ Everything works

□ **Test Multiplayer** ⚠️ CRITICAL
   - Open incognito window → localhost:3000
   - Sign in
   - Move mouse → See cursor in other window
   - Create sticky → Appears in other window
   - ✅ Real-time sync works!

---

## 📤 PUSH TO GITHUB (10 minutes)

□ **Configure Git** (1 min)
   - `git config --global user.name "Your Name"`
   - `git config --global user.email "your@email.com"`
   - ✅ Configured

□ **Initialize & Commit** (2 min)
   - `git init`
   - `git add .`
   - `git commit -m "Initial commit"`
   - ✅ Files committed

□ **Create GitHub Repo** (3 min)
   - GitHub → New repository
   - Name: whiteboard-mvp → Create
   - ✅ Repo created

□ **Push Code** (4 min)
   - Copy repo URL from GitHub
   - `git branch -M main`
   - `git remote add origin YOUR_URL`
   - `git push -u origin main`
   - Authenticate if needed
   - ✅ Code on GitHub!

---

## 🚀 DEPLOY TO VERCEL (10 minutes)

□ **Import to Vercel** (2 min)
   - Vercel → Add New → Project
   - Import whiteboard-mvp repo
   - ✅ Repo imported

□ **Deploy** (5 min)
   - Framework: Create React App (auto)
   - Deploy (don't change settings)
   - Wait for build...
   - ✅ See confetti! 🎉

□ **Get URL** (1 min)
   - Click "Visit"
   - Copy URL (e.g., https://whiteboard-abc.vercel.app)
   - ✅ URL copied

□ **Authorize in Firebase** (2 min) ⚠️ CRITICAL
   - Firebase → Authentication → Settings
   - Authorized domains → Add domain
   - Paste: whiteboard-abc.vercel.app (NO https://)
   - Add
   - ✅ Domain authorized

---

## ✅ FINAL TEST (10 minutes)

□ **Test Deployed App**
   - Go to your Vercel URL
   - Sign in with Google
   - ✅ Whiteboard loads

□ **Test All Features**
   - Create sticky notes ✅
   - Create shapes ✅
   - Edit text ✅
   - Drag objects ✅
   - Pan canvas ✅
   - Zoom ✅
   - See online count ✅

□ **Test Multiplayer** ⚠️ EVALUATOR WILL TEST THIS
   - Open incognito → Your Vercel URL
   - Sign in
   - Move mouse → Cursor appears ✅
   - Create sticky → Syncs instantly ✅
   - Both show "● 2 online" ✅

---

## 📝 SUBMIT (5 minutes)

□ **Update Submission Doc**
   - Open EVALUATOR_SUBMISSION.md
   - Replace [YOUR URL] with Vercel URL
   - Replace [YOUR GITHUB] with repo URL
   - Save

□ **Copy & Send**
   - Select all (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste to evaluator
   - ✅ SUBMITTED!

---

## 🎉 DONE!

**Total Time:** ~80 minutes  
**Status:** ✅ MVP Complete  
**Grade:** Pending (but you got this!)  

---

## 🚨 MOST COMMON MISTAKES

❌ Forgot to add Firebase config to code  
→ Open src/lib/firebase.ts and check!

❌ Didn't authorize Vercel domain in Firebase  
→ Firebase → Authentication → Settings → Authorized domains

❌ Firestore rules not published  
→ Firebase → Firestore → Rules → Publish

❌ Didn't test multiplayer  
→ MUST test with 2 windows before submitting!

---

## 💡 TIPS

✅ Follow steps IN ORDER  
✅ Don't skip verification steps  
✅ Take breaks if frustrated  
✅ Re-read error messages  
✅ Google specific errors  

---

**YOU GOT THIS!** 🚀

Print this checklist and check off each item as you go!
