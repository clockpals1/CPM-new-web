import React, { createContext, useContext, useEffect, useState } from "react";
import { http, storeToken, readToken } from "../lib/api";

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
  // Start authenticated if we have a cached session OR a stored token — avoids
  // flashing the auth screen on mobile while the /auth/me verify runs.
  const hasStoredCreds = Boolean(cached || readToken());
  const [user, setUser] = useState(cached || null);
  const [loading, setLoading] = useState(!hasStoredCreds);

  useEffect(() => {
    let active = true;
    http
      .get("/auth/me", { timeout: 28000 })
      .then((r) => {
        if (!active) return;
        setUser(r.data);
        writeCache(r.data);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        const status = e?.response?.status;
        if (status === 401) {
          // Definitive rejection — clear everything
          storeToken(null);
          writeCache(null);
          setUser(false);
        }
        // For network errors / timeouts (no response) keep cached user so
        // mobile users aren't bounced just because Render is waking up.
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const login = async (email, password) => {
    const { data } = await http.post("/auth/login", { email, password });
    if (data.access_token) storeToken(data.access_token);
    setUser(data);
    writeCache(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await http.post("/auth/register", payload);
    if (data.access_token) storeToken(data.access_token);
    setUser(data);
    writeCache(data);
    return data;
  };

  const logout = async () => {
    try { await http.post("/auth/logout"); } catch {}
    storeToken(null);
    writeCache(null);
    setUser(false);
  };

  const refresh = async () => {
    try {
      const r = await http.get("/auth/me");
      setUser(r.data);
      writeCache(r.data);
    } catch (e) {
      if (e?.response?.status === 401) {
        storeToken(null);
        writeCache(null);
        setUser(false);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
