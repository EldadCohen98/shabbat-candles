import { API_BASE_URL } from "./api";
import { authFetch } from "./authFetch";
// AlertSettings.jsx
import { useEffect, useState } from "react";

function AlertSettings({ onBack, token, onSessionExpired }) {
  const [minutesBefore, setMinutesBefore] = useState(20);
  const [enabled, setEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [city, setCity] = useState("");
  const [hasLocation, setHasLocation] = useState(false);


  // useEffect (אפקט) = קוד שרץ אוטומטית כשהמסך נטען
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setMessage("");

        if (!token) {
          setMessage("אין טוקן (Token = תעודת התחברות). התחבר מחדש.");
          setLoading(false);
          return;
        }

        const res = await authFetch(`${API_BASE_URL}/api/alerts/settings`, {
          method: "GET",
          token,
          onSessionExpired,
        });

        const data = await res.json();
        if (!res.ok) {
          setMessage(data?.error || data?.message || "שגיאה בקבלת ההגדרות");
          setLoading(false);
          return;
        }



        // 🔹 קריאה למיקום המשתמש
        const locRes = await authFetch(`${API_BASE_URL}/api/user/location`, {
        method: "GET",
        token,
        onSessionExpired,
        });

        const locData = await locRes.json();

        if (locRes.ok && locData.city) {
            setCity(locData.city);
        }

        if (locRes.ok && locData.latitude != null && locData.longitude != null) {
            setHasLocation(true);
        }
        else {
            setHasLocation(false);
        }




        // קיבלנו נתונים מהשרת ✅
        setMinutesBefore(data.minutes_before);
        setEnabled(data.enabled);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setMessage("שגיאה כללית (Network/Server).");
        setLoading(false);
      }
    };

    fetchSettings();
  }, [token, onSessionExpired]);

const handleSave = async () => {
  try {
    setMessage("");

    if (!token) {
      setMessage("אין טוקן. התחבר מחדש.");
      return;
    }

    // 1) אם המשתמש כתב עיר → נשמור מיקום קודם
    if (city.trim().length > 0) {
      const locRes = await authFetch(`${API_BASE_URL}/api/user/location`, {
        method: "PUT",
        token,
        onSessionExpired,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city: city.trim() }),
      });

      const locData = await locRes.json();

      if (!locRes.ok) {
        setHasLocation(false);
        setMessage(locData?.error || locData?.message || "שגיאה בשמירת מיקום");
        return;
      }

      setHasLocation(true);
    }

    // 2) שמירת הגדרות התראות
    const res = await authFetch(`${API_BASE_URL}/api/alerts/settings`, {
      method: "PUT",
      token,
      onSessionExpired,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        minutes_before: Number(minutesBefore),
        enabled: Boolean(enabled),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data?.error || data?.message || "שגיאה בשמירת ההגדרות");
      return;
    }

    setMessage("✅ כל השינויים נשמרו בהצלחה!");
  } catch (err) {
    console.error(err);
    setMessage("שגיאה כללית (Network/Server).");
  }
};

  // A user must be able to switch alerts off even before choosing a location.
  const disableSave = enabled && !hasLocation && city.trim().length === 0;
  return (
    <div className="page">
      <div className="card card--wide">
        <h1 className="page-title">🔔 הגדרות התראות</h1>

        {loading ? (
          <p className="muted center">טוען הגדרות...</p>
        ) : (
          <>
             {/* אזור מיקום להתראות */}
            <div className="field">
                <label>
                    📍 עיר מגורים להתראות
                </label>

                <input
                    className="input"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="לדוגמה: ירושלים"
                />

                {!hasLocation && (
                    <p className="hint hint--warn">
                    כדי לקבל התראות צריך להגדיר עיר מגורים.
                    </p>
                )}
            </div>

            <div className="field">
              <label>
                כמה דקות לפני הדלקת נרות?🕯️
              </label>
              <input
                className="input"
                type="number"
                min="0"
                max="240"
                value={minutesBefore}
                onChange={(e) => setMinutesBefore(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="check">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span>התראות פעילות</span>
              </label>
            </div>

            {message && (
              <p className={`msg ${message.startsWith("✅") ? "msg--success" : "msg--error"}`}>
                {message}
              </p>
            )}

            <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={disableSave}
                >
                שמור 💾
            </button>


            <button
              className="btn btn--secondary"
              onClick={onBack}
            >
              ← חזרה למסך הבית
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AlertSettings;
