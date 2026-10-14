process.env.TZ = 'Asia/Jerusalem';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCalendarDate, getFridayOfWeek, getNextFriday,
  toYYYYMMDDLocal, isSameLocalDay } = require('../dateUtils');

test('accepts calendar dates, rejects impossible dates and untrusted input', () => {
  assert.equal(toYYYYMMDDLocal(parseCalendarDate('2026-09-24')), '2026-09-24');
  assert.equal(parseCalendarDate('2026-02-30'), null);
  assert.equal(parseCalendarDate('bad-date'), null);
});

test('chosen Saturday uses preceding Friday; other weekdays use next Friday', () => {
  assert.equal(toYYYYMMDDLocal(getFridayOfWeek(parseCalendarDate('2026-09-26'))), '2026-09-25');
  assert.equal(toYYYYMMDDLocal(getFridayOfWeek(parseCalendarDate('2026-09-24'))), '2026-09-25');
});

test('next Friday skips Saturday and duplicate-day detection works', () => {
  assert.equal(toYYYYMMDDLocal(getNextFriday(parseCalendarDate('2026-09-26'))), '2026-10-02');
  assert.equal(isSameLocalDay(new Date('2026-09-25T10:00:00+03:00'),
    parseCalendarDate('2026-09-25')), true);
});
