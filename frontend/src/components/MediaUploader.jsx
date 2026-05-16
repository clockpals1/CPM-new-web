import React, { useRef, useState } from "react";
import { http } from "../lib/api";
import { Image, Video, X, Loader2, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime";

export default function MediaUploader({ mediaUrls, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(`File too large — max ${MAX_MB} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    const allowed = ["image/", "video/"];
    if (!allowed.some((p) => file.type.startsWith(p))) {
      toast.error("Only images and short videos are supported");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await http.post("/posts/media", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange([...(mediaUrls || []), { url: data.url, type: data.type }]);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files) => {
    Array.from(files || []).forEach(uploadFile);
  };

  const remove = (idx) => onChange((mediaUrls || []).filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {/* Previews */}
      {(mediaUrls || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mediaUrls.map((m, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-subtle)]" style={{ width: 96, height: 72 }}>
              {m.type === "video" ? (
                <video src={m.url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black/80"
                type="button"
              >
                <X size={10} />
              </button>
              {m.type === "video" && (
                <div className="absolute bottom-1 left-1">
                  <Video size={10} className="text-white drop-shadow" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition-colors text-xs select-none ${
          dragOver
            ? "border-[var(--brand-accent)] bg-amber-50 text-[var(--brand-accent)]"
            : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        }`}
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : (
          <Upload size={14} className="shrink-0" />
        )}
        <span>{uploading ? "Uploading…" : "Add photo or short video (max 10 MB)"}</span>
        <div className="flex items-center gap-1 ml-auto shrink-0 text-[var(--text-tertiary)]">
          <Image size={12} /> <Video size={12} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
        <AlertCircle size={10} />
        Images: JPG, PNG, GIF, WebP · Videos: MP4, WebM, MOV · Max 10 MB each
      </div>
    </div>
  );
}
