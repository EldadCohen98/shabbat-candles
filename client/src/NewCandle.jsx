// NewCandle.jsx
// כרגע זה מסך "חיפוש זמני הדלקת נרות"
// אחר כך נוכל לשנות את השם לקובץ ולטיפוס, אבל בינתיים משאירים ככה כדי שלא תסתבך

import { useState } from "react";
import { API_BASE_URL } from "./api";

function formatTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleTimeString("he-IL", {
    timeZone: 'Asia/Jerusalem',
    hour: "2-digit",
    minute: "2-digit",
  });
}


function NewCandle({ onBackToHome }) {
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState(null);

  const handleSearch = async (e) => {
  e.preventDefault();

  setMessage("");
  setResults(null);

  if (!city || !date) {
    setMessage("נא למלא עיר ותאריך 🕯️");
    return;
  }

  try {
    const params = new URLSearchParams({
      city,
      date,
    }).toString();

    const token = localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE_URL}/api/shabbat-times?${params}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );


    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg =
        errorData?.message || "שגיאה בקבלת זמני הדלקה מהשרת 😵";
      setMessage(msg);
      return;
    }

    const data = await response.json();
    // Do not log the selected city/location unnecessarily.

    setResults({
      hadlaka: data.hadlaka,
      shkia: data.shkia,
      havdala: data.havdala,
      parasha: data.parasha,
      shabbatDate: data.shabbatDate || data.fridayStr,
    });

  } catch (err) {
    console.error(err);
    setMessage("שגיאה בחיבור לשרת 😵");
  }
};


  return (
    <div className="page">
      <h1 className="page-title">
        🕯️ חיפוש זמני הדלקת נרות שבת
      </h1>

      <div className="card">
        {/* עיר */}
        <div className="field">
          <label>
            עיר:
          </label>
          <input
            className="input"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="לדוגמה: ירושלים"
          />
        </div>

        {/* תאריך */}
        <div className="field">
          <label>
            תאריך:
          </label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* כפתור חיפוש */}
        <button
          className="btn btn--primary"
          onClick={handleSearch}
        >
          חיפוש זמני הדלקה
        </button>

        {/* כפתור חזרה הביתה */}
        <button
          className="btn btn--secondary"
          onClick={onBackToHome}
        >
          חזרה לדף הבית
        </button>

        {/* הודעת שגיאה/מידע */}
        {message && (
          <p className="msg msg--error">
            {message}
          </p>
        )}

        {/* תוצאות חיפוש */}
        {results && (
          <div className="result">
            <h3 className="result__title">
              {results.parasha || "זמני שבת"}
            </h3>
            <p className="result__sub">
              זמני שבת ל{city} · {results.shabbatDate}
            </p>

            <div className="result__row result__row--main">
              <span className="result__label"><span aria-hidden="true">🕯️</span> הדלקת נרות</span>
              <b className="result__time">{formatTime(results.hadlaka)}</b>
            </div>
            <div className="result__row">
              <span className="result__label"><span aria-hidden="true">🌇</span> שקיעה</span>
              <b className="result__time">{formatTime(results.shkia)}</b>
            </div>
            <div className="result__row">
              <span className="result__label"><span aria-hidden="true">✨</span> צאת שבת</span>
              <b className="result__time">{formatTime(results.havdala)}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewCandle;
