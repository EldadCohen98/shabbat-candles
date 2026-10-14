process.env.TZ = 'Asia/Jerusalem';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getCandleLightingForDate } = require('../shabbatService');
const { parseCalendarDate } = require('../dateUtils');

test('reads an actual candles-category event from mocked Hebcal response', async () => {
  const previous = global.fetch;
  try {
    global.fetch = async (url) => {
      assert.match(url, /date=2026-09-25/);
      return { ok: true, json: async () => ({ items: [
        { category: 'candles', date: '2026-09-25T18:03:00+03:00' },
      ] }) };
    };
    const result = await getCandleLightingForDate({
      latitude: 31.77, longitude: 35.2, dateObj: parseCalendarDate('2026-09-25'),
    });
    assert.equal(result.toISOString(), '2026-09-25T15:03:00.000Z');
  } finally { global.fetch = previous; }
});

test('missing candle-lighting event returns null', async () => {
  const previous = global.fetch;
  try {
    global.fetch = async () => ({ ok: true, json: async () => ({ items: [] }) });
    assert.equal(await getCandleLightingForDate({
      latitude: 31.77, longitude: 35.2, dateObj: parseCalendarDate('2026-09-25'),
    }), null);
  } finally { global.fetch = previous; }
});
