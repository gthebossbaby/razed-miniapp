# Lumina Casino Telegram Mini App — Deployment Guide

## What's in this project
- `server.js` — Node.js backend (Express + SQLite)
- `public/index.html` — The full Lumina-style frontend
- `package.json` — Dependencies
- `railway.toml` — Railway deployment config

---

## STEP 1 — Create a GitHub repo

1. Go to https://github.com and sign in
2. Click the **+** button → **New repository**
3. Name it `lumina-miniapp`
4. Set it to **Private**
5. Click **Create repository**

Then upload these files:
- Drag and drop all files from this folder into the GitHub repo
- OR use GitHub Desktop if you prefer

---

## STEP 2 — Deploy on Railway

1. Go to https://railway.app
2. Sign in with your GitHub account
3. Click **New Project** → **Deploy from GitHub repo**
4. Select your `lumina-miniapp` repo
5. Railway will auto-detect Node.js and start deploying

6. Once deployed, click on your service → **Settings** → **Environment**
7. Add these environment variables:
   ```
   BOT_TOKEN = your_telegram_bot_token_here
   BOT_USERNAME = your_actual_bot_username_without_@
   ```
8. Railway will redeploy automatically

9. Go to **Settings** → **Networking** → **Generate Domain**
10. Copy your URL — it looks like `https://lumina-miniapp-production.up.railway.app`

---

## STEP 3 — Set up your Telegram Bot as a Mini App

1. Open Telegram and message **@BotFather**
2. Type `/mybots` and select your bot
3. Click **Bot Settings** → **Menu Button** → **Configure menu button**
4. Paste your Railway URL
5. Then go back and click **Bot Settings** → **Configure Mini App**  
   (or type `/newapp` and follow the prompts)
6. Paste your Railway URL again
7. Done!

---

## STEP 4 — Update your bot username in the code

In `public/index.html`, find these two lines (around line 290 and 310):
```js
const botUsername = 'LuminaCasinoBot';
```
Replace `LuminaCasinoBot` with your actual bot's username (without the @).

Then push the change to GitHub — Railway auto-redeploys.

---

## STEP 5 — Test it

1. Open Telegram
2. Find your bot
3. Tap **Start** or the menu button
4. The mini app should open with your Telegram name auto-loaded

### To test referrals:
1. Open the app, go to Referrals, copy your link
2. Send it to another Telegram account (or open it yourself in a different account)
3. When they open the app via your link, they show up in your referral list
4. At 5 referrals the 300% bonus unlocks

---

## How the referral system works

- Every user gets a unique referral link: `https://t.me/YourBot?startapp=ref_TELEGRAMID`
- When someone opens the app via that link, Telegram passes `ref_TELEGRAMID` as the `start_param`
- The backend records the relationship in SQLite: referrer → referee
- The referral counter updates in real time from the database
- At 5 referrals, `bonusUnlocked = true` is returned and the bonus claim button appears

---

## Files structure
```
lumina-miniapp/
├── server.js          ← Backend API + static file serving
├── package.json       ← Node dependencies  
├── railway.toml       ← Railway deployment config
├── .gitignore
├── lumina.db          ← Auto-created SQLite database (NOT committed)
└── public/
    └── index.html     ← Full frontend app
```


## Railway environment variables

Set these in Railway for the mini app to work correctly:

- `BOT_TOKEN`
- `BOT_USERNAME`
- `TON_WALLET`
- `ETH_WALLET`
- `BTC_WALLET`
