import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { Bell } from "lucide-react";

export default function Notifications() {
  const [items, setItems] = useState([]);
  useEffect(() => { http.get("/notifications").then((r) => setItems(r.data)).catch(() => {}); }, []);
  const markRead = async (id) => { try { await http.post(`/notifications/${id}/read`); setItems(items.map((i) => i.id === id ? { ...i, read: true } : i)); } catch {} };
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Notifications</h1>
      {items.length === 0 ? <div className="card-surface p-6 text-sm text-[var(--text-secondary)]">You're all caught up.</div> :
        items.map((n) => (
          <div key={n.id} onClick={() => !n.read && markRead(n.id)} className={`card-surface p-4 flex items-start gap-3 cursor-pointer ${n.read ? "opacity-70" : ""}`} data-testid={`notif-${n.id}`}>
            <Bell size={16} className="text-[var(--brand-accent)] mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--brand-primary)]">{n.title}</div>
              <div className="text-sm text-[var(--text-secondary)]">{n.body}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
    </div>
  );
}
