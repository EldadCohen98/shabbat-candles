const { toYYYYMMDDLocal } = require('./dateUtils');

/** Parasha name (without the "פרשת" prefix) from a Hebcal /shabbat items list, or null. */
function extractParasha(items) {
  const item = items?.find((entry) => entry.category === 'parashat');
  // `hebrew` has no niqqud; `title` (lg=he) does, so strip it if we must fall back.
  const raw = item?.hebrew || item?.title?.replace(/[֑-ׇ]/g, '');
  const name = raw?.replace(/^פרשת\s+/, '').trim();
  return name || null;
}

/** Return { candleTime: Date, parasha: string|null } for the requested Friday and location, or null. */
async function getShabbatInfoForDate({ latitude, longitude, dateObj }) {
  const fridayStr = toYYYYMMDDLocal(dateObj);
  const url =
    `https://www.hebcal.com/shabbat?cfg=json&latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}&tzid=Asia%2FJerusalem&date=${fridayStr}&lg=he`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'ShabbatCandlesApp/1.0 (personal project)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const item = data.items?.find((entry) => entry.category === 'candles');
  if (!item?.date) return null;
  const time = new Date(item.date);
  if (Number.isNaN(time.getTime())) return null;
  return { candleTime: time, parasha: extractParasha(data.items) };
}

/** Return a Date for candle lighting on the requested Friday and location. */
async function getCandleLightingForDate(args) {
  const info = await getShabbatInfoForDate(args);
  return info ? info.candleTime : null;
}

module.exports = { getCandleLightingForDate, getShabbatInfoForDate, extractParasha };
