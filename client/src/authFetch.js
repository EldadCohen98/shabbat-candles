// authFetch.js
// fetch לבקשות מוגנות: מוסיף Authorization ומזהה טוקן שפג תוקפו.

export async function authFetch(url, { token, onSessionExpired, headers, ...options } = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // clone() כדי שהקומפוננטה עדיין תוכל לקרוא את ה-body בעצמה
    const data = await response.clone().json().catch(() => null);
    if (data?.code === "TOKEN_EXPIRED") {
      onSessionExpired?.();
    }
  }

  return response;
}
