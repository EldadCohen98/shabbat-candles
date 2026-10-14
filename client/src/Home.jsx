//Home.jsx
import { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "./api";
import { authFetch } from "./authFetch";


// ✅ חשוב: זה נתיב לקובץ שלך, לא "notifications"
import {
  getPermission,
  requestPermission,
  sendTestNotification,
  playBeep,
} from "./notifications";

function Home({
  userEmail,
  userName,
  token,
  onSessionExpired,
  onLogout,
  onAddCandle,
  onChangePassword,
  onAlertSettings,
}) {
  // notifStatus = מצב ההרשאה להתראות בדפדפן
  // "default" | "granted" | "denied"
const [notifStatus, setNotifStatus] = useState(() => getPermission());

  // useEffect = קוד שרץ אוטומטית כשמסך נטען (כמו "onLoad" של העמוד)
  const seenAlerts = useRef(new Set());

  useEffect(() => {
    let timerId;

    const pollAlerts = async () => {
      try {
        if (getPermission() !== "granted" || !token) return;

        const res = await authFetch(`${API_BASE_URL}/api/alerts`, {
          token,
          onSessionExpired,
        });

        const data = await res.json();
        if (!res.ok) return;

        const alerts = data.alerts || [];

        for (const a of alerts) {
          if (seenAlerts.current.has(a.id)) continue;
          const notification = new Notification(a.title, {
            body: a.body,
            tag: `alert-${a.id}`,
          });
          notification.onerror = () => {
            console.warn("Browser notification failed to display (alert id:", a.id, ")");
          };
          seenAlerts.current.add(a.id);
          await playBeep();
          // Mark as read after display; retry acknowledgement on a later poll if needed.
          const marked = await authFetch(`${API_BASE_URL}/api/alerts/${a.id}/read`, {
            method: "PATCH",
            token,
            onSessionExpired,
          });
          if (!marked.ok) seenAlerts.current.delete(a.id);
        }
      } catch (e) {
        console.log("pollAlerts failed:", e);
      }
    };

    // poll כל 5 שניות
    timerId = setInterval(pollAlerts, 20000);
    pollAlerts(); // גם ישר כשנכנסים

    return () => clearInterval(timerId);
  }, [token, onSessionExpired]);


  const handleLogout = () => {
    onLogout();
  };

  // ✅ הכפתור החדש: מבקש הרשאה + עושה בדיקה + ביפ
  const enableNotifications = async () => {
    const permission = await requestPermission(); // מבקש מהדפדפן הרשאה
    setNotifStatus(permission);

    if (permission === "granted") {
      sendTestNotification(); // הודעת בדיקה
      await playBeep();       // צליל בדיקה
    } else if (permission === "denied") {
      alert("חסמת התראות. צריך לאפשר דרך הגדרות הדפדפן לאתר הזה.");
    }
  };

  // תצוגה בלבד: איך להציג את סטטוס ההרשאה כ-badge
  const badge = NOTIF_BADGE[notifStatus] || NOTIF_BADGE.default;

  return (
    <div className="page">
      <div className="card card--wide">
        <div className="hero">
          <div className="shabbat-candles" aria-hidden="true">
            <span className="shabbat-candle">🕯️</span>
            <span className="shabbat-candle">🕯️</span>
          </div>
          <h1 className="page-title">
            {userName ? `שבת שלום ${userName}` : "שבת שלום"}
          </h1>
          {/* <p className="hero__tagline">זמני הדלקת נרות והתראות לשבת</p> */}

          {userEmail && (
            <span className="chip">
              <span aria-hidden="true">✉️</span>
              <span className="chip__email">{userEmail}</span>
            </span>
          )}
        </div>

        {/* חיפוש זמני הדלקת נרות */}
        <button
          className="btn btn--primary"
          onClick={onAddCandle}
        >
          🔍 חיפוש זמני הדלקת נרות
        </button>

        <div className="tiles">
          {/* הגדרות התראות */}
          <button
            className="tile"
            onClick={onAlertSettings}
          >
            <span className="tile__icon" aria-hidden="true">⚙️</span>
            <span className="tile__text">
              <span className="tile__title">הגדרות התראות</span>
              <span className="tile__desc">עיר מגורים וזמן ההתראה</span>
            </span>
          </button>

          {/* ✅ הפעל התראות */}
          <button
            className="tile"
            onClick={enableNotifications}
          >
            <span className="tile__icon" aria-hidden="true">🔔</span>
            <span className="tile__text">
              <span className="tile__title">הפעל התראות באתר</span>
              <span className="tile__desc">אישור התראות בדפדפן</span>
            </span>
            <span className={`badge ${badge.className}`}>{badge.label}</span>
          </button>

          {/* שינוי סיסמה */}
          <button
            className="tile"
            onClick={onChangePassword}
          >
            <span className="tile__icon" aria-hidden="true">🔐</span>
            <span className="tile__text">
              <span className="tile__title">שינוי סיסמה</span>
              <span className="tile__desc">עדכון סיסמת ההתחברות</span>
            </span>
          </button>
        </div>

        {/* התנתקות */}
        <button
          className="link-btn"
          onClick={handleLogout}
        >
          התנתקות
        </button>
      </div>
    </div>
  );
}

// תצוגה בלבד: טקסט וצבע ה-badge לפי סטטוס ההרשאה
const NOTIF_BADGE = {
  granted: { className: "badge--on", label: "פעיל" },
  default: { className: "badge--off", label: "כבוי" },
  denied: { className: "badge--warn", label: "חסום" },
  unsupported: { className: "badge--off", label: "לא נתמך" },
};

export default Home;
