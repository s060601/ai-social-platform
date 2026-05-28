import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE } from "./config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { token, role, name, username }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("yuyi_token");
    if (!token) { setLoading(false); return; }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.role) setUser({ ...data, token });
        else localStorage.removeItem("yuyi_token");
      })
      .catch(() => localStorage.removeItem("yuyi_token"))
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

  const register = useCallback(async ({ username, password, name, role, captchaId, captchaAnswer }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name, role, captchaId, captchaAnswer }),
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
