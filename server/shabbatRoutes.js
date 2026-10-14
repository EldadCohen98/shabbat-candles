const express = require('express');
const { parseCalendarDate, getFridayOfWeek, toYYYYMMDDLocal } = require('./dateUtils');
const router = express.Router();

// In-memory cache avoids repeatedly calling the public geocoding API for the same city.
const cityCache = new Map();

async function geocodeCityIL(city) {
  const key = city.trim().toLocaleLowerCase('he');
  if (cityCache.has(key)) return cityCache.get(key);

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=il&q=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ShabbatCandlesApp/1.0 (personal project)',
      'Accept-Language': 'he',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const loc = { lat: Number(data[0].lat), lon: Number(data[0].lon) };
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) return null;
  cityCache.set(key, loc);
  return loc;
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Hebcal failed: ${response.status}`);
  return response.json();
}

router.get('/shabbat-times', async (req, res) => {
  const { city, date } = req.query;
  if (typeof city !== 'string' || city.trim().length < 2 || city.length > 100) {
    return res.status(400).json({ message: 'יש להזין שם עיר תקין' });
  }
  const chosenDate = parseCalendarDate(date);
  if (!chosenDate) {
    return res.status(400).json({ message: 'יש להזין תאריך תקין בפורמט YYYY-MM-DD' });
  }

  try {
    const friday = getFridayOfWeek(chosenDate);
    const fridayStr = toYYYYMMDDLocal(friday);
    const loc = await geocodeCityIL(city);
    if (!loc) {
      return res.status(400).json({ message: `לא הצלחתי למצוא את העיר "${city}". נסה שם אחר.` });
    }

    const tzid = 'Asia%2FJerusalem';
    const location = `latitude=${loc.lat}&longitude=${loc.lon}&tzid=${tzid}`;
    const shabbatUrl = `https://www.hebcal.com/shabbat?cfg=json&${location}&date=${fridayStr}&lg=he`;
    const zmanimUrl = `https://www.hebcal.com/zmanim?cfg=json&${location}&date=${fridayStr}`;

    const saturday = new Date(friday);
    saturday.setDate(saturday.getDate() + 1);
    const saturdayStr = toYYYYMMDDLocal(saturday);
    const parashaUrl = `https://www.hebcal.com/hebcal?cfg=json&${location}` +
      `&start=${saturdayStr}&end=${saturdayStr}&s=on&lg=he`;

    const [shabbatData, zmanimData, parashaData] = await Promise.all([
      fetchJson(shabbatUrl), fetchJson(zmanimUrl), fetchJson(parashaUrl),
    ]);
    const shabbatItems = shabbatData.items || [];
    const hadlaka = shabbatItems.find((item) => item.category === 'candles')?.date || null;
    const havdala = shabbatItems.find((item) => item.category === 'havdalah')?.date || null;
    const parashaItems = parashaData.items || [];
    const parasha = parashaItems.find((item) => item.category === 'parashat')?.title || null;
    const shkia = zmanimData.times?.sunset || zmanimData.times?.Sunset ||
      zmanimData.items?.find((item) => item.category === 'sunset')?.date || null;

    res.json({ city: city.trim(), date, fridayStr, shabbatDate: fridayStr,
      hadlaka, shkia, havdala, parasha });
  } catch (error) {
    console.error('Shabbat API lookup failed:', error.message);
    res.status(502).json({ message: 'שירות הזמנים אינו זמין כרגע. נסה שוב מאוחר יותר.' });
  }
});

module.exports = router;
