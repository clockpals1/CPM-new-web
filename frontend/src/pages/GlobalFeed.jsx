import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Send, Loader2, Globe, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import FeedCard from "../components/FeedCard";
import MediaUploader from "../components/MediaUploader";

function GlobalComposer({ onPosted }) {
  const [text, setText] = useState("");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim() && !mediaUrls.length) return;
    setBusy(true);
    try {
      const { data } = await http.post("/posts", {
        body: text,
        scope: "global",
        media_urls: mediaUrls.map((m) => m.url),
      });
      data.media_urls = mediaUrls;
      onPosted(data);
      setText("");
      setMediaUrls([]);
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card-surface p-5 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && submit()}
        placeholder="Share something with the worldwide Celestial family… Alleluia!"
        className="input-clean min-h-[80px] w-full text-sm"
        data-testid="gpost-input"
      />
      <MediaUploader mediaUrls={mediaUrls} onChange={setMediaUrls} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-tertiary)]">Ctrl+Enter to post</span>
        <button
          onClick={submit}
          disabled={busy || (!text.trim() && !mediaUrls.length)}
          className="btn-primary inline-flex items-center gap-2 text-sm"
          data-testid="gpost-submit"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Share
        </button>
      </div>
    </div>
  );
}

export default function GlobalFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    http.get("/posts", { params: { scope: "global" } })
      .then((r) => setPosts(r.data))
      .catch(() => toast.error("Could not load feed"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (pid) => {
    if (!window.confirm("Delete this post?")) return;
    try { await http.delete(`/posts/${pid}`); setPosts((p) => p.filter((x) => x.id !== pid)); } catch (e) { toast.error(formatErr(e)); }
  };
  const handlePin = async (pid, pinned) => {
    try {
      await http.patch(`/posts/${pid}/pin`, { pinned });
      setPosts((prev) =>
        prev.map((p) => p.id === pid ? { ...p, pinned } : p)
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at))
      );
    } catch (e) { toast.error(formatErr(e)); }
  };
  const handleEdit = (pid, body) => setPosts((prev) => prev.map((p) => p.id === pid ? { ...p, body, edited_at: new Date().toISOString() } : p));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] flex items-center gap-1.5">
          <Globe size={11} /> Community
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Global Feed</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Voices, testimonies, and daily inspiration from the worldwide Celestial family.
        </p>
      </div>

      <GlobalComposer onPosted={(p) => setPosts((prev) => [p, ...prev])} />

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card-surface p-5 space-y-3">
              <div className="flex gap-3"><div className="w-9 h-9 rounded-full bg-[var(--bg-subtle)]" /><div className="flex-1 space-y-2"><div className="h-3 bg-[var(--bg-subtle)] rounded w-1/3" /><div className="h-2 bg-[var(--bg-subtle)] rounded w-1/2" /></div></div>
              <div className="h-3 bg-[var(--bg-subtle)] rounded" /><div className="h-3 bg-[var(--bg-subtle)] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="card-surface p-12 text-center space-y-3">
          <BookOpen size={28} className="mx-auto text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Be the first to share with the worldwide family.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <FeedCard
              key={p.id}
              post={p}
              user={user}
              onDelete={handleDelete}
              onPin={handlePin}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
