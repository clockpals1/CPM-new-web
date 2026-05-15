import React, { createContext, useContext, useEffect, useState } from "react";
import { http } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = no auth, obj = user
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    http
      .get("/auth/me")
      .then((r) => active && setUser(r.data))
      .catch(() => active && setUser(false))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await http.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await http.post("/auth/register", payload);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await http.post("/auth/logout"); } catch {}
    setUser(false);
  };

  const refresh = async () => {
    try { const r = await http.get("/auth/me"); setUser(r.data); } catch { setUser(false); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
