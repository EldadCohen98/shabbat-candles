//notifications.js

// ---- Notification sound (Web Audio only, no audio files) ----
// Peak gain per note. 0.06–0.07 is gentle; raise/lower here to tune the loudness.
const SOUND_VOLUME = 0.065;
// Max time playBeep waits for a suspended AudioContext before giving up silently.
const AUDIO_RESUME_TIMEOUT_MS = 300;
// Two soft sine notes (C5 then E5). Times are in seconds; the 2nd note starts while the 1st fades.
const SOUND_NOTES = [
  { freq: 523.25, start: 0, attack: 0.04, length: 0.55 },
  { freq: 659.25, start: 0.22, attack: 0.05, length: 0.66 }, // ends at ~0.88s
];

export function isNotificationSupported() {
  return "Notification" in window;
}

export function getPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export async function requestPermission() {
  if (!isNotificationSupported()) return "unsupported";
  const p = await Notification.requestPermission();
  return p;
}

export function sendTestNotification() {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  // A fixed tag makes repeated tests replace the previous test notification.
  new Notification("🔔 בדיקת התראות", {
    body: "ההתראות באתר פועלות בהצלחה ✅",
    tag: "shabbat-test",
  });
  return true;
}

// AudioContext משותף, נוצר רק בשימוש הראשון (לא בטעינת המודול)
let sharedAudioCtx = null;

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") sharedAudioCtx = new AudioCtx();
  return sharedAudioCtx;
}

// מנסה להפעיל context חסום (autoplay policy), אבל לא ממתין יותר מ-300ms
async function ensureRunning(ctx) {
  if (ctx.state === "running") return true;
  let timer;
  try {
    await Promise.race([
      ctx.resume(),
      new Promise((resolve) => { timer = setTimeout(resolve, AUDIO_RESUME_TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  return ctx.state === "running";
}

// תו אחד: fade-in קצר ואז fade-out אקספוננציאלי, כדי שלא יהיו קליקים
function scheduleNote(ctx, { freq, start, attack, length }, t0) {
  const begin = t0 + start;
  const end = begin + length;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.0001, begin);
  gain.gain.exponentialRampToValueAtTime(SOUND_VOLUME, begin + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  osc.start(begin);
  osc.stop(end + 0.05);
}

// צליל התראה רך (שני תווים). מתזמן ומחזיר מיד, לא ממתין לסיום הצליל ולא נתקע.
// אם הדפדפן חוסם שמע, מוותר בשקט: ההתראה וה-PATCH /read ממשיכים כרגיל.
export async function playBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (!(await ensureRunning(ctx))) return;

    const t0 = ctx.currentTime + 0.03;
    SOUND_NOTES.forEach((note) => scheduleNote(ctx, note, t0));
  } catch (e) {
    console.warn("Notification sound failed:", e?.message || e);
  }
}

/**
 * מתזמן התראה לזמן יעד (Date).
 * מחזיר פונקציית cleanup שמבטלת את ה-timeout.
 */
export function scheduleNotificationAt(targetDate, { title, body, withBeep = true }) {
  if (!isNotificationSupported()) return () => {};
  if (Notification.permission !== "granted") return () => {};

  const ms = targetDate.getTime() - Date.now();
  if (ms <= 0) return () => {}; // כבר עבר

  const timeoutId = setTimeout(async () => {
    try {
      new Notification(title, { body });
      if (withBeep) await playBeep();
    } catch (e) {
      console.log("Notification failed:", e);
    }
  }, ms);

  return () => clearTimeout(timeoutId);
}
