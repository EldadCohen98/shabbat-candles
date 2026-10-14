import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "./api";
import { authFetch } from "./authFetch";

function ChangePassword({ onBackToHome, token, onSessionExpired }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const redirectTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(redirectTimeoutRef.current), []);


  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!oldPassword || !newPassword || !confirmNewPassword) {
        setIsError(true);
        setMessage("נא למלא את כל השדות 🤨");
        return;
    }

    if (newPassword.length < 6) {
        setIsError(true);
        setMessage("הסיסמה החדשה חייבת להיות לפחות 6 תווים 🗝️");
        return;
    }

    if (newPassword !== confirmNewPassword) {
        setIsError(true);
        setMessage("אימות הסיסמה לא תואם לסיסמה החדשה ❌");
        return;
    }

    if (!token) {
        setIsError(true);
        setMessage("אין הרשאה: התחבר מחדש ואז נסה שוב 🔑");
        return;
    }

    try {
        const response = await authFetch(`${API_BASE_URL}/api/change-password`, {
        method: "POST",
        token,
        onSessionExpired,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            oldPassword: oldPassword,
            newPassword: newPassword,
        }),
        });

        const data = await response.json();

        if (!response.ok) {
        setIsError(true);
        setMessage(data.message || "שגיאה בשינוי סיסמה 😵");
        return;
        }

        setIsError(false);
        setMessage(data.message || "הסיסמה שונתה בהצלחה ✅");

        // ניקוי שדות
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");

        // חזרה אוטומטית אחרי 2 שניות (אם המשתמש לא לחץ לבד)
        redirectTimeoutRef.current = setTimeout(() => {
        onBackToHome();
        }, 2000);

    } catch (error) {
        setIsError(true);
        setMessage("שגיאה בהתחברות לשרת 😵");
        console.error(error);
    }
};


  return (
    <div className="page">
      <h1 className="page-title">
        🔐 שינוי סיסמה
      </h1>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>
              סיסמה ישנה:
            </label>
            <input
              className="input"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="הכנס סיסמה ישנה"
            />
          </div>

          <div className="field">
            <label>
              סיסמה חדשה:
            </label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="מינימום 6 תווים"
            />
          </div>

          <div className="field">
            <label>
              אימות סיסמה חדשה:
            </label>
            <input
              className="input"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="חזור על הסיסמה החדשה"
            />
          </div>

          <button
            className="btn btn--primary"
            type="submit"
          >
            שמור סיסמה
          </button>

          <button
            className="btn btn--secondary"
            type="button"
            onClick={onBackToHome}
          >
            חזרה לבית
          </button>

          {message && (
            <p className={`msg ${isError ? "msg--error" : "msg--success"}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
