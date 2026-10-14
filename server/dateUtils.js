// Dates in this app are calculated in the Israel timezone.
// Set TZ=Asia/Jerusalem in the server's environment (server.js sets a local default).
function toYYYYMMDDLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseCalendarDate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (toYYYYMMDDLocal(date) !== text) return null; // catches impossible dates
  return date;
}

function getFridayOfWeek(date) {
  const friday = new Date(date);
  const day = friday.getDay();
  const daysToFriday = day === 6 ? -1 : (5 - day + 7) % 7;
  friday.setDate(friday.getDate() + daysToFriday);
  friday.setHours(12, 0, 0, 0);
  return friday;
}

function getNextFriday(date) {
  return getFridayOfWeek(date.getDay() === 6
    ? new Date(date.getTime() + 24 * 60 * 60 * 1000)
    : date);
}

function isSameLocalDay(left, right) {
  return Boolean(left) && toYYYYMMDDLocal(new Date(left)) === toYYYYMMDDLocal(right);
}

module.exports = { toYYYYMMDDLocal, parseCalendarDate, getFridayOfWeek, getNextFriday, isSameLocalDay };
