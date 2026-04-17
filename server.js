const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// ─── DATABASE SETUP ───────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'razed.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    referred_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id TEXT NOT NULL,
    referee_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(referrer_id, referee_id)
  );
`);

// Prepared statements
const upsertUser = db.prepare(`
  INSERT INTO users (telegram_id, first_name, last_name, username, referred_by)
  VALUES (@telegram_id, @first_name, @last_name, @username, @referred_by)
  ON CONFLICT(telegram_id) DO UPDATE SET
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    username   = excluded.username
`);

const insertReferral = db.prepare(`
  INSERT OR IGNORE INTO referrals (referrer_id, referee_id)
  VALUES (@referrer_id, @referee_id)
`);

const getReferralCount = db.prepare(`
  SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?
`);

const getReferrals = db.prepare(`
  SELECT u.first_name, u.last_name, u.username, r.created_at
  FROM referrals r
  JOIN users u ON u.telegram_id = r.referee_id
  WHERE r.referrer_id = ?
  ORDER BY r.created_at DESC
`);

const getUser = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);

// ─── TELEGRAM initData VERIFICATION ──────────────────────────────
function verifyTelegramInitData(initData) {
  // During local dev/testing without real Telegram, skip verification
  if (!initData || initData === 'dev_mode') return true;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    params.delete('hash');

    // Build data-check-string: sorted key=value pairs joined by \n
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // secret_key = HMAC_SHA256(bot_token, "WebAppData")
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return computedHash === hash;
  } catch (e) {
    console.error('Verification error:', e);
    return false;
  }
}

function parseUserFromInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (userStr) return JSON.parse(userStr);
  } catch (e) {}
  return null;
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API: AUTH + REGISTER USER ───────────────────────────────────
// Called when user opens the mini app
app.post('/api/auth', (req, res) => {
  const { initData, referredBy } = req.body;

  // Verify the data actually came from Telegram
  if (!verifyTelegramInitData(initData)) {
    return res.status(401).json({ error: 'Invalid Telegram data' });
  }

  // Parse user from initData
  const tgUser = parseUserFromInitData(initData);
  if (!tgUser && initData !== 'dev_mode') {
    return res.status(400).json({ error: 'No user data found' });
  }

  const userId = String(tgUser?.id || 'dev_' + Date.now());
  const firstName = tgUser?.first_name || 'Player';
  const lastName = tgUser?.last_name || '';
  const username = tgUser?.username || '';

  // Save/update user
  upsertUser.run({
    telegram_id: userId,
    first_name: firstName,
    last_name: lastName,
    username: username,
    referred_by: referredBy || null
  });

  // Record referral if they came via referral link
  if (referredBy && referredBy !== userId) {
    insertReferral.run({
      referrer_id: referredBy,
      referee_id: userId
    });
  }

  // Get their referral stats
  const { count: referralCount } = getReferralCount.get(userId);
  const bonusUnlocked = referralCount >= 5;

  res.json({
    success: true,
    user: { id: userId, firstName, lastName, username },
    referralCode: userId,
    referralCount,
    bonusUnlocked
  });
});

// ─── API: GET REFERRAL STATS ─────────────────────────────────────
app.get('/api/referrals/:userId', (req, res) => {
  const { userId } = req.params;

  const { count: referralCount } = getReferralCount.get(userId);
  const referrals = getReferrals.all(userId);
  const bonusUnlocked = referralCount >= 5;

  res.json({ referralCount, referrals, bonusUnlocked });
});

// ─── CATCH-ALL: serve index.html ─────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Razed Mini App running on port ${PORT}`);
});
