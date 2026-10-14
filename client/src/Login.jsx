// Login.jsx
import { useState } from "react";
import { API_BASE_URL } from "./api";

function Login({ onBackToRegister, onLoginSuccess, notice }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (!email || !password) {
      setIsError(true);
      setMessage("נא למלא מייל וסיסמא🤨");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const errorMsg = data?.message || data?.error || "שגיאה בהתחברות😵";
        setIsError(true);
        setMessage(errorMsg);
        return;
      }

      const data = await response.json();
      if (!data?.token) {
        setIsError(true);
        setMessage("לא התקבל טוקן מהשרת 😵");
        return;
      }
      setIsError(false);
      setMessage("התחברת בהצלחה 🎉");
      onLoginSuccess?.(data.user?.email || email.trim(), data.token, data.fullName);

    }
    catch (error) {
      console.error(error);
      setIsError(true);
      setMessage("שגיאה בהתחברות לשרת😵");
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">
        🔐 התחברות למערכת נרות שבת
      </h1>

      <div className="card">
        <div className="field">
          <label>
            אימייל:
          </label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>

        <div className="field">
          <label>
            סיסמא:
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="הסיסמה שלך"
          />
        </div>

        <button
          className="btn btn--primary"
          onClick={handleLogin}
        >
          התחברות
        </button>

        <button
          className="btn btn--secondary"
          onClick={onBackToRegister}
        >
          אין לי משתמש – מעבר להרשמה
        </button>

        {/* הודעה מ-App, למשל כשההתחברות פגה */}
        {notice && !message && (
          <p className="msg msg--notice">
            {notice}
          </p>
        )}

        {message && (
          <p className={`msg ${isError ? "msg--error" : "msg--success"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
