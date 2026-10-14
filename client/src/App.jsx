// App.jsx
import { useState, useCallback } from "react";
import { API_BASE_URL } from "./api";
import "./App.css";
import Login from "./Login";
import Home from "./Home";
import NewCandle from "./NewCandle";
import ChangePassword from "./ChangePassword";
import AlertSettings from "./AlertSettings";


function App() {
  // סטייט של טופס ההרשמה
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  // Preserve the local session across browser refreshes (JWT is still checked server-side).
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentPage, setCurrentPage] = useState(() =>
    localStorage.getItem('token') ? 'home' : 'register'
  );
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');
  // שם תצוגה בלבד (לא מזהה התחברות)
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  // הודעה זמנית שמוצגת במסך ההתחברות (למשל אחרי שההתחברות פגה)
  const [sessionMessage, setSessionMessage] = useState("");

  // ⬇⬇⬇ זה הפונקציה של ההרשמה שלך
  const handleRegisterSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (!fullName.trim()) {
      setIsError(true);
      setMessage("נא להזין שם");
      return;
    }

    if (!email || !password) {
      setIsError(true);
      setMessage("נא למלא מייל וסיסמא🤨");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("סיסמא חייבת להיות לפחות 6 תווים🗝️");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password, fullName: fullName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || "שגיאה בהתחברות לשרת😵");
        return;
      }

      setIsError(false);
      setMessage("נרשמת בהצלחה🥳");

      // The registration result is intentionally not logged (may contain personal data).
    } catch (error) {
      setIsError(true);
      setMessage("שגיאה בהתחברות לשרת😵");
      console.error(error);
    }
  };

  const handleLoginSuccess = (emailFromLogin, tokenFromLogin, fullNameFromLogin) => {
    setUserEmail(emailFromLogin);
    setUserName(fullNameFromLogin || "");
    setToken(tokenFromLogin);
    localStorage.setItem('token', tokenFromLogin);
    localStorage.setItem('userEmail', emailFromLogin);
    localStorage.setItem('userName', fullNameFromLogin || "");
    setSessionMessage("");
    setCurrentPage('home');         // נעבור למסך הבית
  };

  // נקרא כשהשרת מחזיר TOKEN_EXPIRED: מנקה את ההתחברות הישנה ומעביר ל-Login
  // useCallback keeps the reference stable so effects that depend on it don't re-run on every render
  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    setToken(null);
    setUserEmail("");
    setUserName("");
    setSessionMessage("ההתחברות פגה. יש להתחבר מחדש.");
    setCurrentPage("login");
  }, []);

  // ⬇⬇⬇ ניווט בין המסכים

  //  מסך התחברות
  if (currentPage === "login") {
    return (
      <Login
        notice={sessionMessage}
        onBackToRegister={() => {
          setSessionMessage("");
          setCurrentPage("register");
        }}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }


  //  מסך הבית אחרי התחברות
    if (currentPage === "home") {
    return (
      <Home
        userEmail={userEmail}
        userName={userName}
        token={token}
        onSessionExpired={handleSessionExpired}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          setUserEmail('');
          setUserName('');
          setToken('');
          setCurrentPage('login');
        }}
        onAddCandle={() => setCurrentPage("newCandle")}
        onChangePassword={() => setCurrentPage("changePassword")}
        onAlertSettings={() => setCurrentPage("alertSettings")}
      />
    );
  }


  // מסך יצירת נר חדש
  if (currentPage === "newCandle") {
    return (
      <NewCandle
        onBackToHome={() => setCurrentPage("home")}
      />
    );
  }

  // מסך שינוי סיסמה
  if (currentPage === "changePassword") {
    return (
      <ChangePassword
      token={token}
        onSessionExpired={handleSessionExpired}
        onBackToHome={() => setCurrentPage("home")}
      />
    );
  }

  //מסך הגדרות התראות
  if (currentPage === "alertSettings") {
    return (
      <AlertSettings
        token={token}
        onSessionExpired={handleSessionExpired}
        onBack={() => setCurrentPage("home")}
      />
    );
  }



  //  ברירת מחדל: מסך הרשמה
  return (
    <div className="page">
      {/* main title */}
      <h1 className="page-title">
        🕯️הרשמה למערכת נרות שבת🕯️
      </h1>

      {/* form itself */}
      <div className="card">
        {/* name field (display only) */}
        <div className="field">
          <label>
            שם:
          </label>
          <input
            className="input"
            type="text"
            required
            maxLength={100}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="הכנס את שמך"
          />
        </div>

        {/* email field */}
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

        {/* password field */}
        <div className="field">
          <label>
            סיסמא:
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="מינימום 6 תווים"
          />
        </div>

        {/* register button */}
        <button
          className="btn btn--primary"
          onClick={handleRegisterSubmit}
        >
          הרשמה
        </button>

        {/* login button */}
        <button
          className="btn btn--secondary"
          onClick={() => setCurrentPage("login")}
        >
          כבר יש לי משתמש – להתחברות
        </button>

        {/* print the message */}
        {message && (
          <p className={`msg ${isError ? "msg--error" : "msg--success"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
