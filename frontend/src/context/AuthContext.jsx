import React, { createContext, useContext, useEffect, useState } from "react";
import { http } from "../lib/api";

const AuthContext = createContext(null);
const SESSION_KEY = "cpm_session";

function readCache() {
  try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function writeCache(u) {
  try { if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); else localStorage.removeItem(SESSION_KEY); } catch {}
}

export function AuthProvider({ children }) {
  const cached = readCache();
  const [user, setUser] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let active = true;
    http
      .get("/auth/me", { timeout: 25000 })
      .then((r) => {
        if (!active) return;
        setUser(r.data);
        writeCache(r.data);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        const is401 = e?.response?.status === 401;
        if (is401) {
          writeCache(null);
          setUser(false);
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const login = async (email, password) => {
    const { data } = await http.post("/auth/login", { email, password });
    setUser(data);
    writeCache(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await http.post("/auth/register", payload);
    setUser(data);
    writeCache(data);
    return data;
  };

  const logout = async () => {
    try { await http.post("/auth/logout"); } catch {}
    writeCache(null);
    setUser(false);
  };

  const refresh = async () => {
    try {
      const r = await http.get("/auth/me");
      setUser(r.data);
      writeCache(r.data);
    } catch (e) {
      if (e?.response?.status === 401) { writeCache(null); setUser(false); }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
