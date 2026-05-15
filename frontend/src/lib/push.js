// Push notification helper
import { http } from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const { data } = await http.get("/integrations/public");
    if (!data.vapid_public_key) return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.vapid_public_key),
    });
    await http.post("/push/subscribe", { subscription: sub.toJSON() });
    return true;
  } catch (e) {
    console.warn("push register failed", e);
    return false;
  }
}

export async function ensureServiceWorker() {
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("/sw.js"); } catch (_) { /* ignore */ }
  }
}
