/** Title and body of the Shabbat-entry alert shown to the user. */
function buildAlertMessage({ parasha, city, minutesBefore }) {
  const title = parasha ? `🕯️ כניסת שבת – פרשת ${parasha}` : '🕯️ כניסת שבת מתקרבת';
  const when = `בעוד ${minutesBefore} דקות`;
  const place = typeof city === 'string' ? city.trim() : '';
  return { title, body: place ? `${place} • ${when}` : when };
}

module.exports = { buildAlertMessage };
