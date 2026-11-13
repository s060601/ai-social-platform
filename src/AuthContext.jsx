import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE } from "./config";

const AuthContext = createContext(null);

function readStoredUser(token) {
  try {
    const payload = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(payload));
    if (!data?.role) return null;
    return {
      token,
      id: data.id,
      username: data.username,
      role: data.role,
      name: data.name,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { token, role, name, username }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("yuyi_token");
    if (!token) { setLoading(false); return; }

    const storedUser = readStoredUser(token);
    if (!storedUser) {
      localStorage.removeItem("yuyi_token");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }))
      .then(({ ok, status, data }) => {
        if (ok && data.role) {
          setUser({ ...data, token });
          return;
        }

        // Only a clear authentication failure should sign the device out.
        // A temporary outage or a deployment restart must not discard login.
        if (status === 401 || status === 403) {
          localStorage.removeItem("yuyi_token");
          setUser(null);
          return;
        }

        setUser(storedUser);
      })
      .catch(() => setUser(storedUser))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password, captcha = {}) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, ...captcha }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "登录失败");
    localStorage.setItem("yuyi_token", data.token);
    setUser({ token: data.token, role: data.role, name: data.name, username });
    return data;
  }, []);

  const register = useCallback(async ({ username, password, name, role, captchaId, captchaAnswer, consentAccepted, consentVersion }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name, role, captchaId, captchaAnswer, consentAccepted, consentVersion }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "注册失败");
    localStorage.setItem("yuyi_token", data.token);
    setUser({ token: data.token, role: data.role, name: data.name, username });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("yuyi_token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
