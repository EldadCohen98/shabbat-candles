const cron = require('node-cron');
const pool = require('./db');
const { getShabbatInfoForDate } = require('./shabbatService');
const { buildAlertMessage } = require('./alertMessage');
const { getNextFriday, isSameLocalDay } = require('./dateUtils');

async function checkAlerts() {
  try {
    const result = await pool.query(`
      SELECT u.id, u.city, u.latitude, u.longitude, s.minutes_before, s.last_sent_at
      FROM users u JOIN user_alert_settings s ON u.id = s.user_id
      WHERE s.enabled = TRUE
    `);

    const now = new Date();
    const friday = getNextFriday(now);
    for (const user of result.rows) {
      if (user.latitude == null || user.longitude == null ||
          isSameLocalDay(user.last_sent_at, friday)) continue;

      let shabbat;
      try {
        // One Hebcal call returns both the candle-lighting time and the parasha.
        shabbat = await getShabbatInfoForDate({
          latitude: user.latitude, longitude: user.longitude, dateObj: friday,
        });
      } catch (error) {
        console.error('Could not fetch candle-lighting time:', error.message);
        continue; // other users can still be checked
      }
      const candleTime = shabbat?.candleTime;
      if (!candleTime) continue;
      const alertAt = new Date(candleTime.getTime() - user.minutes_before * 60000);
      // Never create an outdated alert after candle lighting has already passed.
      if (now < alertAt || now >= candleTime) continue;

      const { title, body } = buildAlertMessage({
        parasha: shabbat.parasha, city: user.city, minutesBefore: user.minutes_before,
      });

      // Transactions must use ONE checked-out client, not pool.query().
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // The row lock also prevents two overlapping scheduler runs from duplicating an alert.
        const locked = await client.query(
          `SELECT enabled, last_sent_at FROM user_alert_settings
           WHERE user_id = $1 FOR UPDATE`, [user.id]
        );
        if (!locked.rows[0]?.enabled || isSameLocalDay(locked.rows[0].last_sent_at, friday)) {
          await client.query('ROLLBACK');
          continue;
        }
        await client.query(
          `INSERT INTO user_alerts (user_id, title, body)
           VALUES ($1, $2, $3)`,
          [user.id, title, body]
        );
        // The verified schema stores local Israel wall-clock timestamps (WITHOUT TIME ZONE).
        await client.query(
          `UPDATE user_alert_settings
           SET last_sent_at = NOW() AT TIME ZONE 'Asia/Jerusalem'
           WHERE user_id = $1`, [user.id]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Alert transaction failed:', error);
      } finally {
        client.release();
      }
    }
  } catch (error) {
    console.error('Alert scheduler failed:', error);
  }
}

cron.schedule('* * * * *', checkAlerts, { timezone: 'Asia/Jerusalem' });
console.log('Alert scheduler started');
