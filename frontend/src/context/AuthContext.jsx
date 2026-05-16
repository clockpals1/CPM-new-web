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
  const hasStoredCreds = Boolean(cached || readToken());
  const [user, setUser] = useState(cached || null);
  // loading=true means we must NOT redirect yet (no cached creds to show)
  // verifying=true means a background check is running but we already show cached user
  const [loading, setLoading] = useState(!hasStoredCreds);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let active = true;

    const tryRefresh = async () => {
      const tok = readToken();
      if (!tok) return false;
      try {
        const r = await http.post("/auth/refresh", {}, {
          headers: { Authorization: `Bearer ${tok}` },
          timeout: 55000,
        });
        if (r.data?.access_token) {
          storeToken(r.data.access_token);
          const me = await http.get("/auth/me", { timeout: 55000 });
          if (active) { setUser(me.data); writeCache(me.data); }
          return true;
        }
      } catch {}
      return false;
    };

    http
      .get("/auth/me", { timeout: 55000 })
      .then((r) => {
        if (!active) return;
        setUser(r.data);
        writeCache(r.data);
      })
      .catch(async (e) => {
        if (!active) return;
        const status = e?.response?.status;
        if (status === 401) {
          const refreshed = await tryRefresh();
          if (!refreshed && active) {
            storeToken(null);
            writeCache(null);
            setUser(false);
          }
        }
        // Network / timeout errors: keep cached user — Render free-tier cold start
      })
      .finally(() => {
        if (active) { setLoading(false); setVerifying(false); }
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
    <AuthContext.Provider value={{ user, loading, verifying, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
