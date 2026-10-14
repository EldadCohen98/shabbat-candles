require('dotenv').config();
process.env.TZ ||= 'Asia/Jerusalem';

// A JWT signing secret must be configured before the server starts.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET === 'REPLACE_WITH_A_LONG_RANDOM_SECRET') {
  throw new Error('Configure a strong JWT_SECRET (at least 32 characters) in server/.env');
}


const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('./db');
const shabbatRoutes = require("./shabbatRoutes");


const app = express();
const port = process.env.PORT || 3000;

app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : {}));
app.use(express.json());

// ✅ חיבור הראוטים של שבת
app.use("/api", shabbatRoutes);

// --- Middleware: אימות משתמש ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Access denied. Token required." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          code: "TOKEN_EXPIRED",
          message: "Session expired. Please log in again.",
        });
      }
      return res.status(403).json({ code: "INVALID_TOKEN", message: "Invalid token." });
    }
    req.user = user;
    next();
  });
};


// --- Alerts Settings: GET current user's settings ---
app.get("/api/alerts/settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Atomic insert prevents a conflict when multiple tabs open at once.
    await pool.query(
      `INSERT INTO user_alert_settings (user_id)
       VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    const result = await pool.query(
      "SELECT minutes_before, enabled, last_sent_at FROM user_alert_settings WHERE user_id = $1",
      [userId]
    );

    // 3) Return existing settings
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/alerts/settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// --- Alerts Settings: UPDATE current user's settings ---
app.put("/api/alerts/settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { minutes_before, enabled } = req.body;

    // Basic validation
    if (minutes_before !== undefined) {
      const m = Number(minutes_before);
      if (!Number.isInteger(m) || m < 0 || m > 240) {
        return res.status(400).json({ error: "minutes_before must be an integer between 0 and 240" });
      }
    }
    if (enabled !== undefined && typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled must be boolean" });
    }

    // Upsert: create row if missing, else update
    const upsert = await pool.query(
      `
      INSERT INTO user_alert_settings (user_id, minutes_before, enabled)
      VALUES ($1, COALESCE($2, 20), COALESCE($3, TRUE))
      ON CONFLICT (user_id)
      DO UPDATE SET
        minutes_before = COALESCE($2, user_alert_settings.minutes_before),
        enabled = COALESCE($3, user_alert_settings.enabled)
      RETURNING minutes_before, enabled, last_sent_at
      `,
      [userId, minutes_before, enabled]
    );

    return res.json(upsert.rows[0]);
  } catch (err) {
    console.error("PUT /api/alerts/settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET unread alerts for current user
app.get("/api/alerts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, title, body, created_at
       FROM user_alerts
       WHERE user_id = $1 AND read_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ alerts: result.rows });
  } catch (err) {
    console.error("GET /api/alerts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// MARK alert as read (only once)
app.patch("/api/alerts/:id/read", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const alertId = Number(req.params.id);
    if (!Number.isSafeInteger(alertId) || alertId < 1) {
      return res.status(400).json({ message: "Invalid alert ID" });
    }

    const result = await pool.query(
      `UPDATE user_alerts
       SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING id, read_at`,
      [alertId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Alert not found / already read" });
    }

    res.json({ ok: true, alert: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/alerts/:id/read error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// -------------------------
// User Location API
// -------------------------

// GET current user's location
app.get("/api/user/location", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT city, latitude, longitude FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]); // { city, latitude, longitude }
  } catch (err) {
    console.error("GET /api/user/location error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// PUT update current user's location by city name
app.put("/api/user/location", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { city } = req.body;

    if (typeof city !== "string" || city.trim().length < 2 || city.trim().length > 100) {
      return res.status(400).json({ error: "נדרשת עיר מגורים" });
    }

    // Geocoding (המרה מעיר לקואורדינטות)
    // משתמשים ב-Nominatim כמו ב-shabbatRoutes
    const query = encodeURIComponent(city.trim() + ", Israel");
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

    // חשוב: Nominatim אוהב User-Agent
    const geoRes = await fetch(url, {
      headers: {
        "User-Agent": "shabbat-candles-app/1.0 (local dev)",
        "Accept-Language": "he",
      },
    });

    if (!geoRes.ok) {
      return res.status(502).json({ error: "Location service is unavailable" });
    }
    const geoData = await geoRes.json();

    if (!Array.isArray(geoData) || geoData.length === 0) {
      return res.status(400).json({ error: "City not found" });
    }

    const latitude = Number(geoData[0].lat);
    const longitude = Number(geoData[0].lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(500).json({ error: "Invalid geocoding result" });
    }

    const cityName = city.trim();

    await pool.query(
      "UPDATE users SET city = $1, latitude = $2, longitude = $3 WHERE id = $4",
      [cityName, latitude, longitude, userId]
    );

    return res.json({ city: cityName, latitude, longitude });
  } catch (err) {
    console.error("PUT /api/user/location error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



// --- נתיב בדיקה ---
app.get('/', (req, res) => {
  res.send('Shabbat Candles Server is running with Auth & Location!');
});


// --- הרשמה ---
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        normalizedEmail.length > 254 || typeof password !== 'string' ||
        password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: "Enter a valid email and password (6–72 UTF-8 bytes)." });
    }
    // Display name only (not a login identifier, not unique).
    const trimmedName = typeof fullName === 'string' ? fullName.trim() : '';
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ message: "נא להזין שם (2 עד 100 תווים)." });
    }

    const userCheck = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
      [normalizedEmail, hashedPassword, trimmedName]
    );

    res.status(201).json({ message: 'User registered successfully!', user: newUser.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'User already exists' });
    console.error('Registration failed:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// --- התחברות ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email.trim().toLowerCase()]);
    const user = userResult.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // full_name comes from SELECT * above; NULL for users registered before the column existed.
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email },
      fullName: user.full_name || '',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// --- שינוי סיסמה ---
app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const userId = req.user.id;
  if (typeof oldPassword !== 'string' || !oldPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'נא להזין סיסמה קיימת וחדשה.' });
  }
  if (newPassword.length < 6 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ message: "הסיסמה החדשה חייבת להכיל לפחות 6 תווים ולא יותר מ-72 בתים.🔡" });
  }

  try {
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא.' });
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "סיסמה ישנה שגויה.😶" });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHashedPassword, userId]);

    res.status(200).json({ message: "הסיסמה עודכנה בהצלחה!🥳" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating password' });
  }
});


app.listen(port, () => {
  require('./alertScheduler');
  console.log(`Server is running on http://localhost:${port}`);
});
