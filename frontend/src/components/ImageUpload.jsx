import React, { useRef, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable image uploader. Reads selected file, sends base64 to /api/uploads
 * (which routes to R2 if configured, else inline data URL), then returns the URL via onUploaded(url).
 */
export default function ImageUpload({ onUploaded, currentUrl, label = "Upload image", className = "", testId = "image-upload", multiple = false, accept = "image/*" }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(currentUrl || "");

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handle = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is over 5MB — please choose a smaller image`);
          continue;
        }
        const dataUrl = await fileToBase64(file);
        const { data } = await http.post("/uploads", {
          data: dataUrl,
          filename: file.name,
          content_type: file.type,
        });
        urls.push(data.url);
      }
      if (urls.length === 0) return;
      if (multiple) {
        onUploaded && onUploaded(urls);
      } else {
        setPreview(urls[0]);
        onUploaded && onUploaded(urls[0]);
      }
    } catch (err) { toast.error(formatErr(err)); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };

  const clear = () => { setPreview(""); onUploaded && onUploaded(""); };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {preview && !multiple && (
        <div className="relative">
          <img src={preview} alt="" className="w-16 h-16 rounded-full object-cover border border-[var(--border-default)]" data-testid={`${testId}-preview`} />
          <button onClick={clear} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-700 text-white text-[10px] grid place-items-center" data-testid={`${testId}-clear`}><X size={10} /></button>
        </div>
      )}
      <button onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-sm" data-testid={`${testId}-btn`}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} {label}
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={handle} data-testid={`${testId}-input`} />
    </div>
  );
}
