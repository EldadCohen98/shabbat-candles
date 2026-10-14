const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildAlertMessage } = require('../alertMessage');
const { extractParasha, getShabbatInfoForDate } = require('../shabbatService');
const { parseCalendarDate } = require('../dateUtils');

test('alert with parasha and city', () => {
  assert.deepEqual(buildAlertMessage({ parasha: 'נח', city: 'ירושלים', minutesBefore: 25 }), {
    title: '🕯️ כניסת שבת – פרשת נח',
    body: 'ירושלים • בעוד 25 דקות',
  });
});

test('alert falls back when parasha or city is missing', () => {
  assert.deepEqual(buildAlertMessage({ parasha: null, city: '  ', minutesBefore: 20 }), {
    title: '🕯️ כניסת שבת מתקרבת',
    body: 'בעוד 20 דקות',
  });
  assert.equal(buildAlertMessage({ parasha: 'נח', city: null, minutesBefore: 15 }).body, 'בעוד 15 דקות');
});

test('extractParasha uses the clean Hebrew field and strips the prefix', () => {
  const items = [
    { category: 'candles', date: '2026-10-23T17:38:00+03:00' },
    { category: 'parashat', title: 'פָּרָשַׁת לֶךְ־לְךָ', hebrew: 'פרשת לך־לך' },
  ];
  assert.equal(extractParasha(items), 'לך־לך');
});

test('extractParasha strips niqqud when only title exists, and returns null without a parashat item', () => {
  assert.equal(extractParasha([{ category: 'parashat', title: 'פָּרָשַׁת נֹחַ' }]), 'נח');
  assert.equal(extractParasha([{ category: 'candles' }]), null);
  assert.equal(extractParasha(undefined), null);
});

test('one Hebcal response yields both candle time and parasha', async () => {
  const previous = global.fetch;
  let calls = 0;
  try {
    global.fetch = async () => {
      calls += 1;
      return { ok: true, json: async () => ({ items: [
        { category: 'candles', date: '2026-10-23T17:38:00+03:00' },
        { category: 'parashat', hebrew: 'פרשת לך־לך' },
      ] }) };
    };
    const info = await getShabbatInfoForDate({
      latitude: 31.77, longitude: 35.2, dateObj: parseCalendarDate('2026-10-23'),
    });
    assert.equal(info.candleTime.toISOString(), '2026-10-23T14:38:00.000Z');
    assert.equal(info.parasha, 'לך־לך');
    assert.equal(calls, 1);
  } finally { global.fetch = previous; }
});
