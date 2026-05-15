import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Messages() {
  const { user } = useAuth();
  const [conv, setConv] = useState([]);
  useEffect(() => { http.get("/messages/inbox").then((r) => setConv(r.data)).catch(() => {}); }, []);
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Messages</h1>
      {conv.length === 0 ? <div className="card-surface p-6 text-sm text-[var(--text-secondary)]">No conversations yet. Visit Meet People to start one.</div> :
        conv.map((c) => (
          <div key={c.conversation_id} className="card-surface p-5" data-testid={`conv-${c.conversation_id}`}>
            <div className="text-sm text-[var(--text-tertiary)] mb-2">Conversation</div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[...c.messages].reverse().map((m) => (
                <div key={m.id} className={`flex ${m.from_user_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.from_user_id === user?.id ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--bg-subtle)] text-[var(--text-primary)]"}`}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
