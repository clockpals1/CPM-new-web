import React, { useState } from "react";
import { http, formatErr } from "../lib/api";
import {
  Heart, MessageCircle, ChevronDown, Flag, Pin, Pencil, Trash2,
  Loader2, Send, ExternalLink, Music2, BookOpen, Flame, HandHelping,
  Cross, Play,
} from "lucide-react";
import { toast } from "sonner";

// ── Daily post type config ────────────────────────────────────────────────────
const DAILY_STYLES = {
  devotion: { color: "text-[var(--brand-primary)]", bg: "bg-blue-50",   border: "border-blue-200",   icon: Cross,     emoji: "✝️"  },
  prayer:   { color: "text-rose-700",               bg: "bg-rose-50",    border: "border-rose-200",   icon: HandHelping,emoji: "🙏" },
  bible:    { color: "text-amber-700",              bg: "bg-amber-50",   border: "border-amber-200",  icon: BookOpen,  emoji: "📖" },
  music:    { color: "text-teal-700",               bg: "bg-teal-50",    border: "border-teal-200",   icon: Music2,    emoji: "🎵" },
};
const getDailyStyle = (type) => DAILY_STYLES[type] || DAILY_STYLES.devotion;

// ── Media gallery ─────────────────────────────────────────────────────────────
function MediaGallery({ mediaUrls, imageUrl }) {
  const items = [
    ...(mediaUrls || []),
    ...(imageUrl ? [{ url: imageUrl, type: "image" }] : []),
  ].filter((m) => m.url);
  if (!items.length) return null;
  const single = items.length === 1;
  return (
    <div className={`mt-3 grid gap-1.5 rounded-xl overflow-hidden ${items.length >= 3 ? "grid-cols-3" : items.length === 2 ? "grid-cols-2" : ""}`}>
      {items.map((m, i) => (
        <div key={i} className={`relative bg-[var(--bg-subtle)] ${single ? "rounded-xl" : ""} overflow-hidden`} style={{ maxHeight: single ? 360 : 180 }}>
          {m.type === "video" ? (
            <video
              src={m.url}
              controls
              className="w-full h-full object-cover"
              style={{ maxHeight: single ? 360 : 180 }}
              preload="metadata"
            />
          ) : (
            <img
              src={m.url}
              alt=""
              className="w-full h-full object-cover"
              style={{ maxHeight: single ? 360 : 180 }}
              loading="lazy"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Verse / quote block ───────────────────────────────────────────────────────
function VerseBlock({ verse }) {
  if (!verse) return null;
  return (
    <div className="my-3 px-4 py-3 rounded-xl bg-[var(--brand-primary)]/5 border-l-4 border-[var(--brand-accent)]">
      <p className="text-sm italic text-[var(--brand-primary)] leading-relaxed">{verse}</p>
    </div>
  );
}

// ── Comment thread ────────────────────────────────────────────────────────────
function CommentThread({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  React.useEffect(() => {
    if (!loaded) {
      http.get(`/posts/${postId}/comments`).then((r) => { setComments(r.data); setLoaded(true); }).catch(() => {});
    }
  }, [postId, loaded]);
  const submit = async () => {
    if (!text.trim()) return;
    try {
      const { data } = await http.post(`/posts/${postId}/comments`, { body: text });
      setComments([...comments, data]); setText("");
    } catch (e) { toast.error(formatErr(e)); }
  };
  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-default)] space-y-2" data-testid={`comments-${postId}`}>
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-sm">
          <div className="w-7 h-7 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-xs shrink-0 overflow-hidden">
            {c.user_avatar ? <img src={c.user_avatar} alt="" className="w-full h-full object-cover" /> : (c.user_name || "?")[0]}
          </div>
          <div className="flex-1 bg-[var(--bg-subtle)] rounded-lg px-3 py-2 min-w-0">
            <span className="font-medium text-[var(--brand-primary)] text-xs">{c.user_name}</span>{" "}
            <span className="text-[var(--text-secondary)]">{c.body}</span>
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Write a comment…"
          className="input-clean text-sm flex-1"
          data-testid={`comment-input-${postId}`}
        />
        <button onClick={submit} className="btn-primary text-xs px-3" data-testid={`comment-submit-${postId}`}>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Main FeedCard ─────────────────────────────────────────────────────────────
export default function FeedCard({ post, user, onDelete, onPin, onEdit }) {
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body || "");
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "super_admin" || user?.role === "parish_admin";
  const canModify = post.user_id === user?.id || isAdmin;
  const isDaily = Boolean(post.daily_post_type);
  const dailyStyle = isDaily ? getDailyStyle(post.daily_post_type) : null;
  const DailyIcon = dailyStyle?.icon;

  // Collapse long body text
  const BODY_LIMIT = 280;
  const bodyText = post.body || "";
  const needsExpand = bodyText.length > BODY_LIMIT && !expanded;
  const displayBody = needsExpand ? bodyText.slice(0, BODY_LIMIT).trimEnd() : bodyText;

  const saveEdit = async () => {
    setSaving(true);
    try {
      await http.patch(`/posts/${post.id}`, { body: editBody });
      onEdit?.(post.id, editBody);
      setEditing(false);
    } catch (e) { toast.error(formatErr(e)); } finally { setSaving(false); }
  };

  const react = async (reaction = "amen") => {
    try {
      await http.post(`/posts/${post.id}/react`, { reaction });
    } catch {}
  };

  const report = async () => {
    try {
      await http.post("/reports", { target_type: "post", target_id: post.id, reason: "Inappropriate Content" });
      toast.success("Reported to moderators.");
    } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <article
      className={`card-surface overflow-hidden ${post.pinned ? "ring-1 ring-[var(--brand-accent)]/40" : ""}`}
      data-testid={`feed-post-${post.id}`}
    >
      {/* Pinned strip */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 px-5 py-1.5 bg-amber-50 border-b border-amber-100 text-xs text-[var(--brand-accent)] font-semibold">
          <Pin size={10} /> Pinned
        </div>
      )}

      {/* Daily post header strip */}
      {isDaily && dailyStyle && (
        <div className={`flex items-center gap-2 px-5 py-2 border-b ${dailyStyle.bg} ${dailyStyle.border} ${dailyStyle.color}`}>
          <span className="text-base leading-none">{post.daily_post_emoji}</span>
          <span className="text-xs font-semibold uppercase tracking-wider">{post.daily_post_category}</span>
        </div>
      )}

      {/* Non-daily type badge */}
      {!isDaily && post.post_type && post.post_type !== "member_post" && (
        <div className="px-5 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wider">
          {post.post_type.replace(/_/g, " ")}
        </div>
      )}

      <div className="p-5">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-sm font-semibold shrink-0 overflow-hidden">
            {post.user_avatar
              ? <img src={post.user_avatar} alt="" className="w-full h-full object-cover" />
              : isDaily
                ? <span className="text-base">{post.daily_post_emoji || "✝️"}</span>
                : (post.user_name || "U")[0]}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-sm font-medium text-[var(--brand-primary)] truncate">{post.user_name || "CPM Community"}</div>
            <div className="text-xs text-[var(--text-tertiary)]">
              {post.user_rank && <span>{post.user_rank} · </span>}
              {new Date(post.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              {post.edited_at && <span className="italic"> (edited)</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isAdmin && onPin && (
              <button onClick={() => onPin(post.id, !post.pinned)} title={post.pinned ? "Unpin" : "Pin"}
                className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--brand-accent)]"
                data-testid={`pin-${post.id}`}><Pin size={13} /></button>
            )}
            {canModify && !isDaily && (
              <button onClick={() => { setEditing(!editing); setEditBody(post.body || ""); }}
                className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)]"
                data-testid={`edit-${post.id}`}><Pencil size={13} /></button>
            )}
            {canModify && (
              <button onClick={() => onDelete?.(post.id)}
                className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-red-400 hover:text-red-600"
                data-testid={`delete-${post.id}`}><Trash2 size={13} /></button>
            )}
            <button onClick={report} title="Report"
              className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-red-500"
              data-testid={`report-${post.id}`}><Flag size={13} /></button>
          </div>
        </div>

        {/* Daily post title */}
        {isDaily && post.title && (
          <h3 className="font-display text-xl text-[var(--brand-primary)] leading-snug mb-2">{post.title}</h3>
        )}

        {/* Body */}
        {editing ? (
          <div className="space-y-2 mb-3">
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
              className="input-clean text-sm w-full min-h-[80px]" data-testid={`edit-input-${post.id}`} />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving}
                className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1">
                {saving && <Loader2 size={12} className="animate-spin" />} Save
              </button>
              <button onClick={() => setEditing(false)}
                className="text-xs px-3 py-1.5 border border-[var(--border-default)] rounded-md">Cancel</button>
            </div>
          </div>
        ) : (
          displayBody && (
            <div className="mb-1">
              <p className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap">
                {displayBody}{needsExpand && "…"}
              </p>
              {bodyText.length > BODY_LIMIT && (
                <button onClick={() => setExpanded(!expanded)}
                  className="text-xs text-[var(--brand-accent)] hover:underline mt-1 font-medium">
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )
        )}

        {/* Bible verse / quote block */}
        {post.daily_verse && <VerseBlock verse={post.daily_verse} />}

        {/* Song attribution (music posts) */}
        {post.daily_song && (
          <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2 mb-3">
            <Music2 size={12} className="shrink-0" />
            <span className="font-medium">{post.daily_song}</span>
          </div>
        )}

        {/* Media gallery */}
        <MediaGallery mediaUrls={post.media_urls} imageUrl={post.image_url} />

        {/* CPM Wave CTA */}
        {post.cta_url && (
          <a
            href={post.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors text-sm text-teal-800 font-medium group"
            data-testid={`cta-${post.id}`}
          >
            <Music2 size={14} className="text-teal-600 shrink-0" />
            <span className="flex-1 truncate">{post.cta_label || "Listen on CPM Wave"}</span>
            <ExternalLink size={12} className="text-teal-500 group-hover:text-teal-700 shrink-0" />
          </a>
        )}

        {/* Reactions + comments toggle */}
        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-tertiary)]">
          <button onClick={() => react("amen")}
            className="inline-flex items-center gap-1.5 hover:text-[var(--brand-accent)] transition-colors"
            data-testid={`react-${post.id}`}>
            <Heart size={13} /> {post.reactions?.amen || 0} Amen
          </button>
          {post.daily_post_type === "prayer" && (
            <button onClick={() => react("pray")}
              className="inline-flex items-center gap-1.5 hover:text-rose-600 transition-colors">
              🙏 {post.reactions?.pray || 0}
            </button>
          )}
          <button
            onClick={() => setShowComments(!showComments)}
            className="inline-flex items-center gap-1.5 hover:text-[var(--brand-primary)] transition-colors"
            data-testid={`toggle-comments-${post.id}`}
          >
            <MessageCircle size={13} />
            {post.comment_count || 0}
            <ChevronDown size={11} className={`transition-transform ${showComments ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showComments && <CommentThread postId={post.id} user={user} />}
      </div>
    </article>
  );
}
