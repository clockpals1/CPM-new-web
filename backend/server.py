"""CelestialPeopleMeeet - FastAPI backend.

Single-file scaffold for the church community platform.
All routes are mounted under /api. Auth uses JWT in httpOnly cookies.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
import base64 as b64lib
import json as jsonlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal, Dict, Set

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------------- Config ----------------
JWT_ALGORITHM = "HS256"
ACCESS_MIN = 60 * 24 * 7  # 7 days for member-friendly UX

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("celestial")

app = FastAPI(title="CelestialPeopleMeeet API")
api = APIRouter(prefix="/api")


# ---------------- Helpers ----------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(d: Optional[datetime]) -> Optional[str]:
    return d.isoformat() if d else None


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": now_utc() + timedelta(minutes=ACCESS_MIN),
    }
    return jwt.encode(payload, get_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_MIN * 60,
        path="/",
    )


def clear_auth_cookie(response: Response):
    response.delete_cookie("access_token", path="/")


async def _get_user_from_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, get_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        return user
    except jwt.PyJWTError:
        return None


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await _get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


def require_roles(*roles: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Not authorized")
        return user
    return checker


# ---------------- Models ----------------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    sex: Optional[str] = None          # 'male' | 'female'
    ccc_rank: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    parish_id: Optional[str] = None
    parish_request: Optional[str] = None
    parish_shepherd_name: Optional[str] = None
    parish_phone: Optional[str] = None
    parish_address: Optional[str] = None
    interested_in_choir: Optional[bool] = False
    profile_summary: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class ParishIn(BaseModel):
    name: str
    country: str
    city: str
    state: Optional[str] = ""
    address: Optional[str] = ""
    shepherd_name: Optional[str] = ""
    phone: Optional[str] = ""
    website: Optional[str] = ""
    service_times: Optional[str] = ""
    livestream_url: Optional[str] = ""
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = "active"
    join_mode: Optional[str] = "request_only"  # open | location_based | request_only
    choir_enabled: Optional[bool] = True
    ministries_enabled: Optional[bool] = True


class SettingItemIn(BaseModel):
    key: str  # category key e.g. ccc_ranks, badges, event_categories
    label: str
    description: Optional[str] = ""
    order: Optional[int] = 0
    active: Optional[bool] = True
    meta: Optional[dict] = {}


class PostIn(BaseModel):
    body: str
    title: Optional[str] = ""
    media_urls: Optional[List[str]] = []   # R2/CDN URLs for images/videos
    media: Optional[List[str]] = []        # base64 strings (legacy)
    scope: Literal["parish", "global"] = "parish"
    parish_id: Optional[str] = None
    visibility: Optional[str] = "members"  # members, announcement, leaders
    post_type: Optional[str] = "member_post"
    image_url: Optional[str] = ""


class CommentIn(BaseModel):
    body: str


class PrayerIn(BaseModel):
    title: str
    body: str
    category: Optional[str] = "general"
    urgency: Optional[str] = "normal"
    scope: Literal["parish", "global"] = "parish"
    parish_id: Optional[str] = None
    anonymous: Optional[bool] = False


class TestimonyIn(BaseModel):
    title: str
    body: str
    media: Optional[List[str]] = []
    scope: Literal["parish", "global"] = "parish"
    parish_id: Optional[str] = None


class ContestIn(BaseModel):
    title: str
    description: str
    type: str = "photo"          # photo | video | verse | testimony
    prize: str = ""
    start_at: str
    end_at: str
    parish_id: Optional[str] = None  # None = platform-wide


class ContestEntryIn(BaseModel):
    body: str = ""
    media_urls: Optional[List[str]] = []


class CpmStarIn(BaseModel):
    member_name: str
    member_id: Optional[str] = None
    photo_url: str = ""
    award: str
    description: str = ""
    period: str = "week"   # week | month
    period_label: str      # e.g. "Week of 12 May 2026"
    expires_at: Optional[str] = None


class EventIn(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    starts_at: str  # ISO
    ends_at: Optional[str] = None
    scope: Literal["parish", "global"] = "parish"
    parish_id: Optional[str] = None
    livestream_url: Optional[str] = ""
    location: Optional[str] = ""
    poster_url: Optional[str] = None   # uploaded event poster / banner image


class JobIn(BaseModel):
    title: str
    description: str
    category: Optional[str] = "general"
    location: Optional[str] = ""
    remote: Optional[bool] = False
    scope: Literal["parish", "global"] = "global"
    parish_id: Optional[str] = None
    contact: Optional[str] = ""


class MembershipReqIn(BaseModel):
    parish_id: str
    note: Optional[str] = ""


class ChoirJoinIn(BaseModel):
    parish_id: str
    voice_part: Optional[str] = "Soprano"
    note: Optional[str] = ""


class RehearsalIn(BaseModel):
    parish_id: str
    title: str
    notes: Optional[str] = ""
    location: Optional[str] = ""
    scheduled_at: str
    voice_parts: Optional[List[str]] = []


class ChoirAnnouncementIn(BaseModel):
    parish_id: str
    title: str
    body: str
    priority: Optional[str] = "normal"  # normal | urgent


class EventLivestreamIn(BaseModel):
    provider: str  # youtube | facebook | instagram | tiktok | custom
    url: str
    embed_type: Optional[str] = "link"  # link | embed
    label: Optional[str] = ""
    is_primary: Optional[bool] = True


class EventHighlightIn(BaseModel):
    title: str
    body: Optional[str] = ""
    replay_url: Optional[str] = ""
    media_urls: Optional[List[str]] = []


class ServiceJoinIn(BaseModel):
    parish_id: str
    service_type: str
    note: Optional[str] = ""


class MessageIn(BaseModel):
    to_user_id: str
    body: str


class NotificationIn(BaseModel):
    user_id: str
    title: str
    body: str
    category: Optional[str] = "general"


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    ccc_rank: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    profile_summary: Optional[str] = None
    career_summary: Optional[str] = None
    interested_in_choir: Optional[bool] = None
    privacy: Optional[dict] = {}   # e.g. {"city": "members", "email": "private"}
    directory_visible: Optional[bool] = True


class ParishAdminReqIn(BaseModel):
    parish_id: str
    note: str                        # request note / message
    reason: str                      # why they want to be parish admin
    comments: Optional[str] = ""    # any supporting details


# ---------------- Auth Routes ----------------
@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id()
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name.strip(),
        "sex": req.sex or "",
        "ccc_rank": req.ccc_rank or "",
        "country": req.country or "",
        "city": req.city or "",
        "role": "member",
        "interested_in_choir": bool(req.interested_in_choir),
        "profile_summary": req.profile_summary or "",
        "avatar": "",
        "badges": [],
        "follow_count": 0,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    doc.pop("_id", None)

    # Instant parish join on onboarding — no pending, no approval required
    if req.parish_id:
        parish_doc = await db.parishes.find_one({"id": req.parish_id}, {"_id": 0})
        if parish_doc:
            joined_at = iso(now_utc())
            await db.parish_memberships.insert_one({
                "id": new_id(),
                "user_id": user_id,
                "parish_id": req.parish_id,
                "status": "approved",
                "approved_at": joined_at,
                "note": "Joined during onboarding",
                "join_mode_used": "onboarding",
                "created_at": joined_at,
            })
            await db.notifications.insert_one({
                "id": new_id(), "user_id": user_id,
                "title": "Welcome to your parish!",
                "body": f"Alleluia! You have joined {parish_doc.get('name', 'your parish')}. Welcome home!",
                "category": "membership", "read": False, "created_at": joined_at,
            })
    if req.parish_request and not req.parish_id:
        await db.parish_suggestions.insert_one({
            "id": new_id(),
            "user_id": user_id,
            "suggestion": req.parish_request,
            "country": req.country,
            "city": req.city,
            "shepherd_name": req.parish_shepherd_name or "",
            "phone": req.parish_phone or "",
            "address": req.parish_address or "",
            "status": "pending",
            "created_at": iso(now_utc()),
        })

    token = create_access_token(user_id, email, "member")
    set_auth_cookie(response, token)
    doc.pop("password_hash", None)
    doc["access_token"] = token   # mobile clients use this as Bearer header
    return doc


@api.post("/auth/login")
async def login(req: LoginReq, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user.get("role", "member"))
    set_auth_cookie(response, token)
    user.pop("_id", None)
    user.pop("password_hash", None)
    user["access_token"] = token   # mobile clients use this as Bearer header
    return user


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "No session")
    try:
        payload = jwt.decode(token, get_secret(), algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User missing")
    new_tok = create_access_token(user["id"], user["email"], user.get("role", "member"))
    set_auth_cookie(response, new_tok)
    return {"ok": True, "access_token": new_tok}


# ---------------- Admin Settings (key-value catalog) ----------------
SETTING_KEYS = {
    "ccc_ranks", "badges", "event_categories", "service_types",
    "prayer_categories", "job_categories", "report_reasons",
    "integration_config", "livestream_providers", "parish_join_rules",
}


@api.get("/settings/{key}")
async def list_settings(key: str):
    if key not in SETTING_KEYS:
        raise HTTPException(status_code=400, detail="Unknown setting key")
    items = await db.admin_settings.find({"key": key, "active": True}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


@api.get("/settings")
async def list_all_settings(user: dict = Depends(require_roles("super_admin"))):
    items = await db.admin_settings.find({}, {"_id": 0}).sort("order", 1).to_list(2000)
    return items


@api.post("/settings")
async def create_setting(item: SettingItemIn, user: dict = Depends(require_roles("super_admin"))):
    if item.key not in SETTING_KEYS:
        raise HTTPException(status_code=400, detail="Unknown setting key")
    doc = item.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = iso(now_utc())
    await db.admin_settings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/settings/{item_id}")
async def update_setting(item_id: str, body: dict, user: dict = Depends(require_roles("super_admin"))):
    body.pop("id", None)
    body.pop("_id", None)
    res = await db.admin_settings.update_one({"id": item_id}, {"$set": body})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.delete("/settings/{item_id}")
async def delete_setting(item_id: str, user: dict = Depends(require_roles("super_admin"))):
    await db.admin_settings.delete_one({"id": item_id})
    return {"ok": True}


# ---------------- Parishes ----------------
@api.get("/parishes")
async def list_parishes(
    q: Optional[str] = None,
    country: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 200,
):
    flt: dict = {}
    if country:
        flt["country"] = {"$regex": f"^{country}$", "$options": "i"}
    if state:
        flt["state"] = {"$regex": f"^{state}$", "$options": "i"}
    if city:
        flt["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if status:
        flt["status"] = status
    else:
        flt["status"] = {"$in": ["active", "pending_review"]}  # include user-contributed parishes awaiting review
    if q:
        flt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}},
            {"shepherd_name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"state": {"$regex": q, "$options": "i"}},
            {"country": {"$regex": q, "$options": "i"}},
        ]
    items = await db.parishes.find(flt, {"_id": 0}).limit(limit).to_list(limit)
    # Attach member_count to each result
    for p in items:
        p["member_count"] = await db.parish_memberships.count_documents({"parish_id": p["id"], "status": "approved"})
    return items


@api.get("/parishes/nearby")
async def nearby_parishes(country: Optional[str] = None, city: Optional[str] = None, limit: int = 8):
    # Simple proximity: same city > same country > any active
    out: list = []
    seen = set()
    if city:
        for p in await db.parishes.find({"city": {"$regex": f"^{city}$", "$options": "i"}}, {"_id": 0}).limit(limit).to_list(limit):
            if p["id"] not in seen:
                out.append(p); seen.add(p["id"])
    if country and len(out) < limit:
        for p in await db.parishes.find({"country": {"$regex": f"^{country}$", "$options": "i"}}, {"_id": 0}).limit(limit).to_list(limit):
            if p["id"] not in seen:
                out.append(p); seen.add(p["id"])
            if len(out) >= limit:
                break
    if len(out) < limit:
        for p in await db.parishes.find({"status": "active"}, {"_id": 0}).limit(limit).to_list(limit):
            if p["id"] not in seen:
                out.append(p); seen.add(p["id"])
            if len(out) >= limit:
                break
    return out[:limit]


@api.post("/parishes/lookup-or-create")
async def parish_lookup_or_create(body: dict):
    """
    Public onboarding endpoint — no auth required.
    1. Fuzzy-searches for existing parishes matching name + country.
    2. If similar found AND force_create=False → returns {created:false, matches:[...]}.
    3. If force_create=True OR no matches → creates parish with status='pending_review'
       and returns {created:true, parish:{...}, matches:[]}.
    """
    import re as _re
    name    = (body.get("name") or "").strip()
    city    = (body.get("city") or "").strip()
    country = (body.get("country") or "").strip()
    if not name:
        raise HTTPException(400, "Parish name is required")

    # Build fuzzy name key — strip noise words for a broader regex hit
    noise = {"celestial", "church", "of", "christ", "ccc", "parish", "the", "and", "&"}
    tokens = [t for t in _re.sub(r"[^\w\s]", "", name.lower()).split() if t not in noise]
    name_key = " ".join(tokens[:3])  # up to 3 meaningful tokens

    flt: dict = {}
    if name_key:
        flt["name"] = {"$regex": _re.escape(name_key) if not tokens else "|".join(_re.escape(t) for t in tokens[:4]), "$options": "i"}
    if country:
        flt["country"] = {"$regex": f"^{_re.escape(country)}$", "$options": "i"}

    similar = []
    if flt.get("name"):
        raw = await db.parishes.find(flt, {"_id": 0}).limit(6).to_list(6)
        # Score by how many search tokens appear in the name
        def score(p):
            n = p.get("name", "").lower()
            return sum(1 for t in tokens if t in n)
        similar = sorted([p for p in raw if score(p) > 0], key=score, reverse=True)[:4]

    force_create = bool(body.get("force_create"))

    if similar and not force_create:
        return {"created": False, "matches": similar, "parish": None}

    # ── Create new parish ──────────────────────────────────────────────
    doc = {
        "id":                  new_id(),
        "name":                name,
        "city":                city,
        "country":             country,
        "state":               body.get("state") or "",
        "address":             body.get("address") or "",
        "shepherd_name":       body.get("shepherd_name") or "",
        "phone":               body.get("phone") or "",
        "website":             "",
        "service_times":       "",
        "livestream_url":      "",
        "description":         "",
        "image_url":           "",
        "status":              "pending_review",   # admin must verify before going live
        "join_mode":           "request_only",
        "choir_enabled":       True,
        "ministries_enabled":  True,
        "source":              "user_onboarding",
        "contributed_by_name": body.get("contributed_by") or "",
        "member_count":        0,
        "lat":                 None,
        "lng":                 None,
        "created_at":          iso(now_utc()),
    }
    await db.parishes.insert_one(doc)
    doc.pop("_id", None)

    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor_id":    "onboarding",
        "actor_name":  body.get("contributed_by") or "new user",
        "action":      "parish_created_via_onboarding",
        "target":      doc["id"],
        "details":     {"parish_name": name, "city": city, "country": country},
        "created_at":  iso(now_utc()),
    })

    return {"created": True, "matches": [], "parish": doc}


@api.get("/parishes/{pid}")
async def get_parish(pid: str):
    p = await db.parishes.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Parish not found")
    return p


@api.post("/parishes")
async def create_parish(item: ParishIn, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    doc = item.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = iso(now_utc())
    doc["created_by"] = user["id"]
    await db.parishes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/parishes/{pid}")
async def update_parish(pid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    body.pop("id", None); body.pop("_id", None)
    await db.parishes.update_one({"id": pid}, {"$set": body})
    return {"ok": True}


@api.delete("/parishes/{pid}")
async def delete_parish(pid: str, user: dict = Depends(require_roles("super_admin"))):
    await db.parishes.delete_one({"id": pid})
    return {"ok": True}


@api.get("/parishes/{pid}/stats")
async def parish_stats(pid: str):
    p = await db.parishes.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Parish not found")
    member_count = await db.parish_memberships.count_documents({"parish_id": pid, "status": "approved"})
    pending_count = await db.parish_memberships.count_documents({"parish_id": pid, "status": "pending"})
    return {"member_count": member_count, "pending_count": pending_count}


@api.get("/parishes/{pid}/members")
async def parish_members(pid: str, user: dict = Depends(get_current_user)):
    """List approved members of a parish. Accessible to members and admins."""
    if user.get("role") not in ("super_admin", "parish_admin"):
        is_member = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": pid, "status": "approved"})
        if not is_member:
            raise HTTPException(403, "Not a member of this parish")
    memberships = await db.parish_memberships.find({"parish_id": pid, "status": "approved"}, {"_id": 0}).to_list(200)
    out = []
    for m in memberships:
        u = await db.users.find_one({"id": m["user_id"]}, {"_id": 0, "password_hash": 0})
        if u:
            out.append({"membership_id": m["id"], "joined_at": m.get("approved_at", m.get("created_at")), "user_id": u["id"], "name": u["name"], "ccc_rank": u.get("ccc_rank", ""), "country": u.get("country", ""), "city": u.get("city", ""), "avatar": u.get("avatar", "")})
    return out


@api.get("/parishes/{pid}/eligibility")
async def parish_join_eligibility(pid: str, user: dict = Depends(get_current_user)):
    """Return whether this user can directly join or must request."""
    p = await db.parishes.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Parish not found")
    if p.get("status") != "active":
        return {"can_direct_join": False, "can_request": False, "already_member": False, "pending": False, "reason": "parish_inactive"}
    existing = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": pid, "status": {"$in": ["approved", "pending"]}})
    if existing:
        approved = existing["status"] == "approved"
        return {"can_direct_join": False, "can_request": False, "already_member": approved, "pending": not approved, "reason": "already_member" if approved else "request_pending"}
    active = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "approved"})
    pending = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "pending"})
    max_m = int(await get_config("max_parish_memberships") or "2")
    if active + pending >= max_m:
        return {"can_direct_join": False, "can_request": False, "already_member": False, "pending": False, "reason": "membership_limit", "max": max_m}
    global_mode = await get_config("global_join_mode") or "per_parish"
    # Default join_mode is 'open' — only 'invite_only' explicitly requires admin approval
    join_mode = p.get("join_mode", "open") if global_mode == "per_parish" else global_mode
    if join_mode == "invite_only":
        return {"can_direct_join": False, "can_request": True, "join_mode": join_mode, "already_member": False, "pending": False, "reason": "invite_only"}
    # open, location_based, request_only all allow direct join by default
    return {"can_direct_join": True, "can_request": True, "join_mode": join_mode, "already_member": False, "pending": False, "reason": "open"}


@api.post("/parishes/{pid}/join")
async def join_parish(pid: str, body: dict = {}, user: dict = Depends(get_current_user)):
    """Direct join (open/location_based) or create pending request."""
    p = await db.parishes.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Parish not found")
    if p.get("status") != "active":
        raise HTTPException(400, "Parish is not currently active")
    existing = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": pid, "status": {"$in": ["approved", "pending"]}})
    if existing:
        raise HTTPException(400, "Already a member or request pending")
    active = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "approved"})
    pending = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "pending"})
    max_m = int(await get_config("max_parish_memberships") or "2")
    if active + pending >= max_m:
        raise HTTPException(400, f"Maximum of {max_m} active parish memberships allowed")
    global_mode = await get_config("global_join_mode") or "per_parish"
    # Default is 'open' — only 'invite_only' requires admin approval
    join_mode = p.get("join_mode", "open") if global_mode == "per_parish" else global_mode
    approved_at = iso(now_utc())
    status = "pending" if join_mode == "invite_only" else "approved"
    if status != "approved":
        approved_at = None
    doc = {
        "id": new_id(), "user_id": user["id"], "parish_id": pid,
        "status": status, "note": (body or {}).get("note", ""),
        "join_mode_used": join_mode, "created_at": iso(now_utc()),
    }
    if approved_at:
        doc["approved_at"] = approved_at
    await db.parish_memberships.insert_one(doc)
    doc.pop("_id", None)
    if status == "approved":
        await db.notifications.insert_one({
            "id": new_id(), "user_id": user["id"], "title": "Parish membership confirmed",
            "body": f"You have joined {p['name']}. Welcome home!",
            "category": "membership", "read": False, "created_at": iso(now_utc()),
        })
        await db.audit_logs.insert_one({
            "id": new_id(), "actor_id": user["id"], "actor_name": user.get("name"),
            "action": "parish_join_direct", "target": pid,
            "details": {"parish_name": p.get("name"), "join_mode": join_mode},
            "created_at": iso(now_utc()),
        })
    return {**doc, "joined": status == "approved", "pending": status == "pending", "parish_name": p.get("name")}


# ---------------- Memberships ----------------
@api.get("/me/memberships")
async def my_memberships(user: dict = Depends(get_current_user)):
    items = await db.parish_memberships.find({"user_id": user["id"], "status": "approved"}, {"_id": 0}).to_list(10)
    out = []
    for m in items:
        p = await db.parishes.find_one({"id": m["parish_id"]}, {"_id": 0})
        out.append({**m, "parish": p})
    return out


@api.get("/me/parish-dashboard")
async def my_parish_dashboard(user: dict = Depends(get_current_user)):
    """Single enriched call: approved + pending memberships, per-parish stats, next event, recent activity."""
    max_m = int(await get_config("max_parish_memberships") or "2")
    now_str = iso(now_utc())

    # Approved memberships
    approved = await db.parish_memberships.find(
        {"user_id": user["id"], "status": "approved"}, {"_id": 0}
    ).to_list(10)

    enriched = []
    for m in approved:
        pid = m["parish_id"]
        parish = await db.parishes.find_one({"id": pid}, {"_id": 0})
        if not parish:
            continue
        member_count = await db.parish_memberships.count_documents({"parish_id": pid, "status": "approved"})
        # next upcoming event for this parish
        next_event = await db.events.find_one(
            {"parish_id": pid, "starts_at": {"$gte": now_str}},
            {"_id": 0},
            sort=[("starts_at", 1)]
        )
        # recent post count (last 7 days)
        week_ago = iso(now_utc() - __import__("datetime").timedelta(days=7))
        recent_posts = await db.feed_posts.count_documents(
            {"parish_id": pid, "scope": "parish", "created_at": {"$gte": week_ago}}
        )
        recent_prayers = await db.prayer_requests.count_documents(
            {"parish_id": pid, "scope": "parish", "created_at": {"$gte": week_ago}}
        )
        enriched.append({
            **m,
            "parish": parish,
            "member_count": member_count,
            "next_event": next_event,
            "recent_posts": recent_posts,
            "recent_prayers": recent_prayers,
        })

    # Pending memberships
    pending = await db.parish_memberships.find(
        {"user_id": user["id"], "status": "pending"}, {"_id": 0}
    ).to_list(10)
    pending_enriched = []
    for m in pending:
        parish = await db.parishes.find_one({"id": m["parish_id"]}, {"_id": 0})
        pending_enriched.append({**m, "parish": parish})

    return {
        "memberships": enriched,
        "pending": pending_enriched,
        "max_memberships": max_m,
        "active_parish_id": user.get("active_parish_id", ""),
    }


@api.post("/me/active-parish")
async def set_active_parish(body: dict, user: dict = Depends(get_current_user)):
    """Persist the user's active parish context preference."""
    parish_id = (body or {}).get("parish_id", "")
    if parish_id:
        m = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": parish_id, "status": "approved"})
        if not m:
            raise HTTPException(403, "Not an approved member of this parish")
    await db.users.update_one({"id": user["id"]}, {"$set": {"active_parish_id": parish_id}})
    return {"ok": True, "active_parish_id": parish_id}


@api.patch("/me/profile")
async def update_my_profile(body: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    """Self-serve profile update. Respects field-level restrictions."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates.pop("id", None); updates.pop("email", None); updates.pop("role", None)
    updates["profile_updated_at"] = iso(now_utc())
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    return {"ok": True}


@api.post("/me/photo")
async def upload_profile_photo(request: Request, user: dict = Depends(get_current_user)):
    """Upload profile photo. Accepts multipart OR JSON {image_b64, filename}."""
    from fastapi import UploadFile
    import base64 as _b64
    r2_url = await get_config("cloudflare_r2_public_url")
    content_type = request.headers.get("content-type", "")
    avatar_url = ""
    if "multipart/form-data" in content_type:
        form = await request.form()
        file: UploadFile = form.get("file")
        if not file:
            raise HTTPException(400, "No file provided")
        data = await file.read()
        key = f"avatars/{user['id']}/{new_id()}_{file.filename}"
        try:
            import boto3, botocore.config
            s3 = boto3.client(
                "s3",
                endpoint_url=await get_config("cloudflare_r2_endpoint") or os.environ.get("R2_ENDPOINT", ""),
                aws_access_key_id=await get_config("cloudflare_r2_access_key") or os.environ.get("R2_ACCESS_KEY", ""),
                aws_secret_access_key=await get_config("cloudflare_r2_secret") or os.environ.get("R2_SECRET_KEY", ""),
                config=botocore.config.Config(signature_version="s3v4"),
                region_name="auto",
            )
            bucket = await get_config("cloudflare_r2_bucket") or os.environ.get("R2_BUCKET", "")
            s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=file.content_type or "image/jpeg")
            avatar_url = f"{r2_url}/{key}" if r2_url else f"/static/{key}"
        except Exception as e:
            log.warning("R2 upload failed: %s", e)
            b64 = _b64.b64encode(data).decode()
            avatar_url = f"data:{file.content_type or 'image/jpeg'};base64,{b64}"
    else:
        body_json = await request.json()
        b64_str = body_json.get("image_b64", "")
        mime = body_json.get("mime", "image/jpeg")
        if b64_str:
            avatar_url = f"data:{mime};base64,{b64_str}"
    if avatar_url:
        await db.users.update_one({"id": user["id"]}, {"$set": {"avatar": avatar_url, "profile_updated_at": iso(now_utc())}})
    return {"ok": True, "avatar": avatar_url}


@api.post("/memberships/request")
async def request_membership(body: MembershipReqIn, user: dict = Depends(get_current_user)):
    max_m = int(await get_config("max_parish_memberships") or "2")
    active = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "approved"})
    pending = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "pending"})
    if active + pending >= max_m:
        raise HTTPException(400, f"Maximum of {max_m} parish memberships allowed")
    existing = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": body.parish_id, "status": {"$in": ["pending", "approved"]}})
    if existing:
        raise HTTPException(400, "Already requested or member")
    p = await db.parishes.find_one({"id": body.parish_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Parish not found")
    global_mode = await get_config("global_join_mode") or "per_parish"
    join_mode = p.get("join_mode", "open") if global_mode == "per_parish" else global_mode
    status = "pending" if join_mode == "invite_only" else "approved"
    approved_at = iso(now_utc()) if status == "approved" else None
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "parish_id": body.parish_id,
        "status": status,
        "note": body.note,
        "join_mode_used": join_mode,
        "created_at": iso(now_utc()),
    }
    if approved_at:
        doc["approved_at"] = approved_at
    await db.parish_memberships.insert_one(doc)
    doc.pop("_id", None)
    if status == "approved":
        await db.notifications.insert_one({
            "id": new_id(), "user_id": user["id"], "title": "Parish membership confirmed",
            "body": f"You have joined {p['name']}. Welcome home!",
            "category": "membership", "read": False, "created_at": iso(now_utc()),
        })
    return {**doc, "joined": status == "approved", "pending": status == "pending", "parish_name": p.get("name")}


@api.get("/memberships/pending")
async def pending_memberships(user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    items = await db.parish_memberships.find({"status": "pending"}, {"_id": 0}).to_list(500)
    out = []
    for m in items:
        u = await db.users.find_one({"id": m["user_id"]}, {"_id": 0, "password_hash": 0})
        p = await db.parishes.find_one({"id": m["parish_id"]}, {"_id": 0})
        out.append({**m, "user": u, "parish": p})
    return out


@api.post("/memberships/{mid}/approve")
async def approve_membership(mid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    m = await db.parish_memberships.find_one({"id": mid})
    if not m:
        raise HTTPException(404, "Not found")
    max_m = int(await get_config("max_parish_memberships") or "2")
    active = await db.parish_memberships.count_documents({"user_id": m["user_id"], "status": "approved"})
    if active >= max_m:
        raise HTTPException(400, f"User already at {max_m} parish memberships")
    await db.parish_memberships.update_one({"id": mid}, {"$set": {"status": "approved", "approved_at": iso(now_utc())}})
    p = await db.parishes.find_one({"id": m["parish_id"]}, {"_id": 0})
    await db.notifications.insert_one({
        "id": new_id(), "user_id": m["user_id"], "title": "Parish membership approved",
        "body": f"You have been approved to join {p['name'] if p else 'the parish'}. Welcome home!",
        "category": "membership", "read": False, "created_at": iso(now_utc()),
    })
    return {"ok": True}


@api.post("/memberships/{mid}/reject")
async def reject_membership(mid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.parish_memberships.update_one({"id": mid}, {"$set": {"status": "rejected"}})
    return {"ok": True}


# ---------------- Feeds (parish + global posts) ----------------
async def _user_can_view_parish(user: dict, parish_id: str) -> bool:
    if user.get("role") in ("super_admin", "parish_admin"):
        return True
    m = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": parish_id, "status": "approved"})
    return bool(m)


@api.post("/posts")
async def create_post(body: PostIn, user: dict = Depends(get_current_user)):
    if body.scope == "parish":
        if not body.parish_id:
            raise HTTPException(400, "parish_id required")
        if not await _user_can_view_parish(user, body.parish_id):
            raise HTTPException(403, "Not a member of this parish")
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_avatar": user.get("avatar", ""),
        "user_rank": user.get("ccc_rank", ""),
        "reactions": {},
        "comment_count": 0,
        "created_at": iso(now_utc()),
    })
    await db.feed_posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/posts")
async def list_posts(scope: str = "global", parish_id: Optional[str] = None, country: Optional[str] = None, user: dict = Depends(get_current_user)):
    flt: dict = {"scope": scope}
    if scope == "parish":
        if not parish_id:
            raise HTTPException(400, "parish_id required")
        if not await _user_can_view_parish(user, parish_id):
            raise HTTPException(403, "Not a member of this parish")
        flt["parish_id"] = parish_id
    # Sort: pinned posts first, then by created_at desc
    pipeline = [
        {"$match": flt},
        {"$addFields": {"_pin_sort": {"$cond": [{"$eq": ["$pinned", True]}, 0, 1]}}},
        {"$sort": {"_pin_sort": 1, "created_at": -1}},
        {"$limit": 100},
        {"$project": {"_id": 0, "_pin_sort": 0}},
    ]
    items = await db.feed_posts.aggregate(pipeline).to_list(100)
    return items


@api.patch("/posts/{pid}")
async def edit_post(pid: str, body: dict, user: dict = Depends(get_current_user)):
    """Edit own post body/post_type. Admins can edit any post."""
    p = await db.feed_posts.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Post not found")
    if p["user_id"] != user["id"] and user.get("role") not in ("super_admin", "parish_admin", "moderator"):
        raise HTTPException(403, "Cannot edit this post")
    allowed = {k: v for k, v in body.items() if k in ("body", "post_type", "image_url")}
    if not allowed:
        raise HTTPException(400, "Nothing to update")
    allowed["edited_at"] = iso(now_utc())
    await db.feed_posts.update_one({"id": pid}, {"$set": allowed})
    return {"ok": True}


@api.patch("/posts/{pid}/pin")
async def pin_post(pid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    """Pin or unpin a post. Only parish_admin and super_admin."""
    p = await db.feed_posts.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Post not found")
    pinned = bool((body or {}).get("pinned", not p.get("pinned", False)))
    await db.feed_posts.update_one({"id": pid}, {"$set": {"pinned": pinned}})
    return {"ok": True, "pinned": pinned}


@api.post("/posts/{pid}/share-global")
async def share_post_global(pid: str, user: dict = Depends(get_current_user)):
    """Share a parish post to the global feed, with attribution to original author and parish."""
    original = await db.feed_posts.find_one({"id": pid}, {"_id": 0})
    if not original:
        raise HTTPException(404, "Post not found")
    if original.get("scope") == "global":
        raise HTTPException(400, "This post is already on the global feed")
    existing = await db.feed_posts.find_one({"shared_from_id": pid, "user_id": user["id"]})
    if existing:
        raise HTTPException(400, "You have already shared this post to the global feed")
    parish_name = None
    if original.get("parish_id"):
        par = await db.parishes.find_one({"id": original["parish_id"]}, {"name": 1})
        if par:
            parish_name = par.get("name")
    doc = {
        "id": new_id(),
        "scope": "global",
        "body": original.get("body", ""),
        "image_url": original.get("image_url"),
        "media_urls": original.get("media_urls", []),
        "post_type": original.get("post_type", "member_post"),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_avatar": user.get("avatar", ""),
        "user_rank": user.get("ccc_rank", ""),
        "reactions": {},
        "comment_count": 0,
        "created_at": iso(now_utc()),
        "shared_from_id": pid,
        "shared_from_user_name": original.get("user_name", ""),
        "shared_from_parish_name": parish_name,
    }
    await db.feed_posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ─────────────────── Contests ───────────────────────────────────────────────

@api.post("/contests")
async def create_contest(body: ContestIn, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "created_by": user["id"], "created_at": iso(now_utc()), "status": "active", "winner_entry_id": None})
    await db.contests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/contests")
async def list_contests(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    flt: dict = {}
    if status:
        flt["status"] = status
    items = await db.contests.find(flt, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


@api.get("/contests/{cid}")
async def get_contest(cid: str, user: dict = Depends(get_current_user)):
    c = await db.contests.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Contest not found")
    return c


@api.patch("/contests/{cid}")
async def update_contest(cid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    body.pop("id", None); body.pop("_id", None)
    await db.contests.update_one({"id": cid}, {"$set": body})
    return {"ok": True}


@api.delete("/contests/{cid}")
async def delete_contest(cid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.contests.delete_one({"id": cid})
    await db.contest_entries.delete_many({"contest_id": cid})
    return {"ok": True}


@api.post("/contests/{cid}/entries")
async def submit_contest_entry(cid: str, body: ContestEntryIn, user: dict = Depends(get_current_user)):
    c = await db.contests.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Contest not found")
    if c.get("status") != "active":
        raise HTTPException(400, "This contest is not open for submissions")
    existing = await db.contest_entries.find_one({"contest_id": cid, "user_id": user["id"]})
    if existing:
        raise HTTPException(400, "You have already submitted an entry for this contest")
    doc = {
        "id": new_id(),
        "contest_id": cid,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_avatar": user.get("avatar", ""),
        "body": body.body,
        "media_urls": body.media_urls or [],
        "votes": 0,
        "voted_by": [],
        "created_at": iso(now_utc()),
    }
    await db.contest_entries.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/contests/{cid}/entries")
async def get_contest_entries(cid: str, user: dict = Depends(get_current_user)):
    entries = await db.contest_entries.find({"contest_id": cid}, {"_id": 0}).sort("votes", -1).to_list(200)
    uid = user["id"]
    for e in entries:
        e["has_voted"] = uid in e.get("voted_by", [])
        e.pop("voted_by", None)
    return entries


@api.post("/contests/{cid}/entries/{eid}/vote")
async def vote_contest_entry(cid: str, eid: str, user: dict = Depends(get_current_user)):
    entry = await db.contest_entries.find_one({"id": eid, "contest_id": cid})
    if not entry:
        raise HTTPException(404, "Entry not found")
    uid = user["id"]
    if uid in entry.get("voted_by", []):
        await db.contest_entries.update_one({"id": eid}, {"$pull": {"voted_by": uid}, "$inc": {"votes": -1}})
        return {"ok": True, "voted": False}
    await db.contest_entries.update_one({"id": eid}, {"$addToSet": {"voted_by": uid}, "$inc": {"votes": 1}})
    return {"ok": True, "voted": True}


@api.post("/contests/{cid}/winner/{eid}")
async def declare_contest_winner(cid: str, eid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    entry = await db.contest_entries.find_one({"id": eid, "contest_id": cid})
    if not entry:
        raise HTTPException(404, "Entry not found")
    await db.contests.update_one({"id": cid}, {"$set": {"winner_entry_id": eid, "status": "ended"}})
    return {"ok": True}


# ─────────────────── CPM Stars ──────────────────────────────────────────────

@api.post("/cpm-stars")
async def create_cpm_star(body: CpmStarIn, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "created_by": user["id"], "created_at": iso(now_utc()), "active": True})
    await db.cpm_stars.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/cpm-stars")
async def list_cpm_stars(active_only: bool = True, user: dict = Depends(get_current_user)):
    flt: dict = {}
    if active_only:
        flt["active"] = True
    stars = await db.cpm_stars.find(flt, {"_id": 0}).sort("created_at", -1).to_list(20)
    return stars


@api.patch("/cpm-stars/{sid}")
async def update_cpm_star(sid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    allowed = {k: v for k, v in body.items() if k in ("active", "award", "description", "photo_url", "period_label", "expires_at", "member_name")}
    await db.cpm_stars.update_one({"id": sid}, {"$set": allowed})
    return {"ok": True}


@api.delete("/cpm-stars/{sid}")
async def delete_cpm_star(sid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.cpm_stars.delete_one({"id": sid})
    return {"ok": True}


# ─────────────────── Post reactions (original) ───────────────────────────────
@api.post("/posts/{pid}/react")
async def react_post(pid: str, body: dict, user: dict = Depends(get_current_user)):
    reaction = body.get("reaction", "amen")
    field = f"reactions.{reaction}"
    await db.feed_posts.update_one({"id": pid}, {"$inc": {field: 1}})
    await db.feed_reactions.insert_one({"id": new_id(), "post_id": pid, "user_id": user["id"], "reaction": reaction, "created_at": iso(now_utc())})
    return {"ok": True}


@api.post("/posts/{pid}/comments")
async def comment_post(pid: str, body: CommentIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "post_id": pid,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_avatar": user.get("avatar", ""),
        "body": body.body,
        "created_at": iso(now_utc()),
    }
    await db.feed_comments.insert_one(doc)
    await db.feed_posts.update_one({"id": pid}, {"$inc": {"comment_count": 1}})
    doc.pop("_id", None)
    return doc


@api.get("/posts/{pid}/comments")
async def list_comments(pid: str):
    items = await db.feed_comments.find({"post_id": pid}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return items


@api.delete("/posts/{pid}")
async def delete_post(pid: str, user: dict = Depends(get_current_user)):
    p = await db.feed_posts.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Not found")
    if p["user_id"] != user["id"] and user.get("role") not in ("super_admin", "parish_admin", "moderator"):
        raise HTTPException(403, "Cannot delete")
    await db.feed_posts.delete_one({"id": pid})
    await db.feed_comments.delete_many({"post_id": pid})
    return {"ok": True}


@api.delete("/posts/{pid}/comments/{cid}")
async def delete_comment(pid: str, cid: str, user: dict = Depends(get_current_user)):
    """Author or moderator/admin can delete a comment."""
    c = await db.feed_comments.find_one({"id": cid, "post_id": pid})
    if not c:
        raise HTTPException(404, "Comment not found")
    if c["user_id"] != user["id"] and user.get("role") not in ("super_admin", "parish_admin", "moderator"):
        raise HTTPException(403, "Cannot delete this comment")
    await db.feed_comments.delete_one({"id": cid})
    await db.feed_posts.update_one({"id": pid}, {"$inc": {"comment_count": -1}})
    return {"ok": True}


# ---------------- Prayer Wall ----------------
@api.post("/prayers")
async def create_prayer(body: PrayerIn, user: dict = Depends(get_current_user)):
    if body.scope == "parish":
        if not body.parish_id or not await _user_can_view_parish(user, body.parish_id):
            raise HTTPException(403, "Not a member of this parish")
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "user_id": user["id"],
        "user_name": "Anonymous" if body.anonymous else user.get("name", ""),
        "status": "new",
        "prayed_count": 0,
        "created_at": iso(now_utc()),
    })
    await db.prayer_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/prayers")
async def list_prayers(scope: str = "global", parish_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    flt: dict = {"scope": scope}
    if scope == "parish":
        if not parish_id:
            raise HTTPException(400, "parish_id required")
        if not await _user_can_view_parish(user, parish_id):
            raise HTTPException(403, "Not a member")
        flt["parish_id"] = parish_id
    items = await db.prayer_requests.find(flt, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return items


@api.post("/prayers/{pid}/prayed")
async def i_prayed(pid: str, user: dict = Depends(get_current_user)):
    already = await db.prayer_reactions.find_one({"prayer_id": pid, "user_id": user["id"]})
    if already:
        return {"ok": True, "already": True}
    await db.prayer_reactions.insert_one({"id": new_id(), "prayer_id": pid, "user_id": user["id"], "created_at": iso(now_utc())})
    await db.prayer_requests.update_one({"id": pid}, {"$inc": {"prayed_count": 1}})
    return {"ok": True}


@api.get("/prayers/{pid}")
async def get_prayer(pid: str, user: dict = Depends(get_current_user)):
    prayer = await db.prayer_requests.find_one({"id": pid}, {"_id": 0})
    if not prayer:
        raise HTTPException(404, "Prayer not found")
    if prayer.get("scope") == "parish":
        if not await _user_can_view_parish(user, prayer.get("parish_id", "")):
            raise HTTPException(403, "Not a member of this parish")
    already = await db.prayer_reactions.find_one({"prayer_id": pid, "user_id": user["id"]})
    prayer["i_prayed"] = bool(already)
    return prayer


@api.get("/prayers/{pid}/comments")
async def list_prayer_comments(pid: str, user: dict = Depends(get_current_user)):
    comments = await db.prayer_comments.find({"prayer_id": pid}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return comments


@api.post("/prayers/{pid}/comment")
async def add_prayer_comment(pid: str, body: CommentIn, user: dict = Depends(get_current_user)):
    prayer = await db.prayer_requests.find_one({"id": pid})
    if not prayer:
        raise HTTPException(404, "Prayer not found")
    if prayer.get("status") in ["removed", "archived"]:
        raise HTTPException(400, "Cannot comment on this prayer")
    doc = {
        "id": new_id(),
        "prayer_id": pid,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "ccc_rank": user.get("ccc_rank", ""),
        "body": body.body.strip(),
        "created_at": iso(now_utc()),
    }
    await db.prayer_comments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/prayers/{pid}/answered")
async def mark_prayer_answered(pid: str, body: dict, user: dict = Depends(get_current_user)):
    prayer = await db.prayer_requests.find_one({"id": pid})
    if not prayer:
        raise HTTPException(404, "Prayer not found")
    is_owner = prayer["user_id"] == user["id"]
    is_admin = user.get("role") in ["super_admin", "parish_admin", "shepherd"]
    if not is_owner and not is_admin:
        raise HTTPException(403, "Not authorized")
    testimony = body.get("testimony", "").strip()
    await db.prayer_requests.update_one(
        {"id": pid},
        {"$set": {"status": "answered", "testimony": testimony, "answered_at": iso(now_utc())}},
    )
    return {"ok": True}


@api.post("/prayers/{pid}/report")
async def report_prayer(pid: str, body: dict, user: dict = Depends(get_current_user)):
    prayer = await db.prayer_requests.find_one({"id": pid})
    if not prayer:
        raise HTTPException(404, "Prayer not found")
    existing = await db.prayer_reports.find_one({"prayer_id": pid, "reporter_id": user["id"]})
    if existing:
        return {"ok": True, "already": True}
    doc = {
        "id": new_id(),
        "prayer_id": pid,
        "reporter_id": user["id"],
        "reason": body.get("reason", ""),
        "notes": body.get("notes", "").strip(),
        "created_at": iso(now_utc()),
    }
    await db.prayer_reports.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/admin/prayers/moderation")
async def prayer_moderation_queue(user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    reported_ids = await db.prayer_reports.distinct("prayer_id")
    result = []
    for pid in reported_ids:
        prayer = await db.prayer_requests.find_one({"id": pid}, {"_id": 0})
        if prayer:
            reports = await db.prayer_reports.find({"prayer_id": pid}, {"_id": 0}).to_list(50)
            report_count = len(reports)
            reasons = [r.get("reason", "") for r in reports]
            prayer["report_count"] = report_count
            prayer["report_reasons"] = reasons
            result.append(prayer)
    result.sort(key=lambda x: x.get("report_count", 0), reverse=True)
    return result


@api.patch("/admin/prayers/{pid}")
async def admin_moderate_prayer(pid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    action = body.get("action")
    updates: dict = {"moderated_by": user["id"], "moderated_at": iso(now_utc())}
    if action == "remove":
        updates["status"] = "removed"
    elif action == "archive":
        updates["status"] = "archived"
    elif action == "restore":
        updates["status"] = "new"
    else:
        raise HTTPException(400, f"Unknown action: {action}")
    await db.prayer_requests.update_one({"id": pid}, {"$set": updates})
    if action == "remove":
        await db.prayer_reports.update_many({"prayer_id": pid}, {"$set": {"resolved": True}})
    return {"ok": True}


# ---------------- Testimonies ----------------
@api.post("/testimonies")
async def create_testimony(body: TestimonyIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "status": "approved",  # MVP auto-approve; admin can moderate
        "created_at": iso(now_utc()),
    })
    await db.testimonies.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/testimonies")
async def list_testimonies(scope: str = "global", parish_id: Optional[str] = None):
    flt: dict = {"scope": scope, "status": "approved"}
    if scope == "parish" and parish_id:
        flt["parish_id"] = parish_id
    items = await db.testimonies.find(flt, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return items


@api.post("/testimonies/{tid}/react")
async def react_testimony(tid: str, body: dict, user: dict = Depends(get_current_user)):
    reaction = body.get("reaction", "amen")
    field = f"reactions.{reaction}"
    already = await db.testimony_reactions.find_one({"testimony_id": tid, "user_id": user["id"], "reaction": reaction})
    if already:
        return {"ok": True, "already": True}
    await db.testimonies.update_one({"id": tid}, {"$inc": {field: 1}})
    await db.testimony_reactions.insert_one({"id": new_id(), "testimony_id": tid, "user_id": user["id"], "reaction": reaction, "created_at": iso(now_utc())})
    return {"ok": True}


@api.get("/testimonies/{tid}/comments")
async def list_testimony_comments(tid: str, user: dict = Depends(get_current_user)):
    return await db.testimony_comments.find({"testimony_id": tid}, {"_id": 0}).sort("created_at", 1).to_list(200)


@api.post("/testimonies/{tid}/comments")
async def add_testimony_comment(tid: str, body: CommentIn, user: dict = Depends(get_current_user)):
    doc = {"id": new_id(), "testimony_id": tid, "user_id": user["id"], "user_name": user.get("name", ""), "user_avatar": user.get("avatar", ""), "body": body.body.strip(), "created_at": iso(now_utc())}
    await db.testimony_comments.insert_one(doc)
    await db.testimonies.update_one({"id": tid}, {"$inc": {"comment_count": 1}})
    doc.pop("_id", None)
    return doc


@api.patch("/testimonies/{tid}")
async def admin_testimony(tid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin", "moderator"))):
    action = body.get("action")  # approve | reject | feature | unfeature
    updates: dict = {"moderated_by": user["id"], "moderated_at": iso(now_utc())}
    if action == "approve":
        updates["status"] = "approved"
    elif action == "reject":
        updates["status"] = "rejected"
    elif action == "feature":
        updates["featured"] = True
    elif action == "unfeature":
        updates["featured"] = False
    else:
        raise HTTPException(400, f"Unknown action: {action}")
    await db.testimonies.update_one({"id": tid}, {"$set": updates})
    return {"ok": True}


# ---------------- Events ----------------
@api.post("/events")
async def create_event(body: EventIn, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_by"] = user["id"]
    doc["created_at"] = iso(now_utc())
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/events")
async def list_events(scope: Optional[str] = None, parish_id: Optional[str] = None):
    flt: dict = {}
    if scope:
        flt["scope"] = scope
    if parish_id:
        flt["parish_id"] = parish_id
    items = await db.events.find(flt, {"_id": 0}).sort("starts_at", 1).limit(200).to_list(200)
    return items


@api.post("/events/{eid}/rsvp")
async def rsvp_event(eid: str, user: dict = Depends(get_current_user)):
    existing = await db.event_attendance.find_one({"event_id": eid, "user_id": user["id"]})
    if existing:
        return {"ok": True, "already": True}
    await db.event_attendance.insert_one({"id": new_id(), "event_id": eid, "user_id": user["id"], "user_name": user.get("name"), "created_at": iso(now_utc())})
    return {"ok": True}


@api.get("/events/{eid}/rsvp-status")
async def rsvp_status(eid: str, user: dict = Depends(get_current_user)):
    existing = await db.event_attendance.find_one({"event_id": eid, "user_id": user["id"]})
    count = await db.event_attendance.count_documents({"event_id": eid})
    return {"rsvped": bool(existing), "count": count}


@api.patch("/events/{eid}")
async def update_event(eid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    safe = {k: v for k, v in body.items() if k not in ("id", "_id", "created_by", "created_at")}
    await db.events.update_one({"id": eid}, {"$set": safe})
    ev = await db.events.find_one({"id": eid}, {"_id": 0})
    return ev


@api.delete("/events/{eid}")
async def delete_event(eid: str, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    await db.events.delete_one({"id": eid})
    return {"ok": True}


@api.post("/events/{eid}/livestreams")
async def add_event_livestream(eid: str, body: EventLivestreamIn, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "event_id": eid, "created_by": user["id"], "created_at": iso(now_utc())})
    await db.event_livestreams.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/events/{eid}/livestreams")
async def get_event_livestreams(eid: str):
    items = await db.event_livestreams.find({"event_id": eid}, {"_id": 0}).to_list(10)
    return items


@api.delete("/events/{eid}/livestreams/{lid}")
async def delete_event_livestream(eid: str, lid: str, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    await db.event_livestreams.delete_one({"id": lid, "event_id": eid})
    return {"ok": True}


@api.post("/events/{eid}/highlights")
async def add_event_highlight(eid: str, body: EventHighlightIn, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "event_id": eid, "author_id": user["id"], "author_name": user.get("name", ""), "created_at": iso(now_utc())})
    await db.event_highlights.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/events/{eid}/highlights")
async def get_event_highlights(eid: str):
    items = await db.event_highlights.find({"event_id": eid}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return items


@api.post("/admin/events/{eid}/feature")
async def feature_event(eid: str, body: dict, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.events.update_one({"id": eid}, {"$set": {"featured": bool(body.get("featured", True))}})
    return {"ok": True}


@api.get("/events/featured")
async def list_featured_events():
    items = await db.events.find({"featured": True}, {"_id": 0}).sort("starts_at", 1).limit(10).to_list(10)
    return items


@api.get("/me/engagement")
async def me_engagement(user: dict = Depends(get_current_user)):
    now_str = iso(now_utc())
    memberships = await db.parish_memberships.find({"user_id": user["id"], "status": "approved"}, {"_id": 0}).to_list(10)
    parish_ids = [m["parish_id"] for m in memberships]

    if parish_ids:
        parish_filter = {"$or": [{"scope": "global"}, {"scope": "parish", "parish_id": {"$in": parish_ids}}]}
    else:
        parish_filter = {"scope": "global"}

    upcoming = await db.events.find(
        {**parish_filter, "starts_at": {"$gte": now_str}},
        {"_id": 0}
    ).sort("starts_at", 1).limit(5).to_list(5)

    live_now = await db.events.find(
        {**parish_filter, "starts_at": {"$lte": now_str}, "ends_at": {"$gte": now_str}},
        {"_id": 0}
    ).to_list(5)

    featured = await db.events.find(
        {"featured": True, "starts_at": {"$gte": now_str}},
        {"_id": 0}
    ).sort("starts_at", 1).limit(3).to_list(3)

    next_rehearsal = None
    if parish_ids:
        reh = await db.rehearsals.find(
            {"parish_id": {"$in": parish_ids}, "scheduled_at": {"$gte": now_str}},
            {"_id": 0}
        ).sort("scheduled_at", 1).limit(1).to_list(1)
        next_rehearsal = reh[0] if reh else None

    choir_memberships = await db.choir_memberships.find({"user_id": user["id"]}, {"_id": 0}).to_list(10)

    return {
        "upcoming_events": upcoming,
        "live_now": live_now,
        "next_rehearsal": next_rehearsal,
        "choir_memberships": choir_memberships,
        "featured_events": featured,
    }


# ---------------- Choir ----------------
@api.post("/choir/join")
async def choir_join(body: ChoirJoinIn, user: dict = Depends(get_current_user)):
    # Must be an approved member of the parish to join its choir
    membership = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": body.parish_id, "status": "approved"})
    if not membership and user.get("role") not in ("super_admin", "parish_admin"):
        raise HTTPException(403, "Join the parish first before joining its choir")
    existing = await db.choir_memberships.find_one({"user_id": user["id"], "parish_id": body.parish_id}, {"_id": 0})
    if existing:
        return existing
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "parish_id": body.parish_id,
        "voice_part": body.voice_part,
        "role": "member",  # member | director
        "status": "pending",  # pending | verified
        "note": body.note,
        "created_at": iso(now_utc()),
    }
    await db.choir_memberships.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/choir")
async def choir_roster(parish_id: str):
    items = await db.choir_memberships.find({"parish_id": parish_id, "status": "verified"}, {"_id": 0}).sort("role", -1).to_list(500)
    return items


@api.get("/choir/pending")
async def choir_pending(user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    items = await db.choir_memberships.find({"status": "pending"}, {"_id": 0}).to_list(500)
    for c in items:
        p = await db.parishes.find_one({"id": c["parish_id"]}, {"_id": 0})
        c["parish"] = p
    return items


@api.post("/choir/{cid}/verify")
async def choir_verify(cid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.choir_memberships.update_one({"id": cid}, {"$set": {"status": "verified", "verified_at": iso(now_utc())}})
    # award verified choir badge
    c = await db.choir_memberships.find_one({"id": cid})
    if c:
        await db.users.update_one({"id": c["user_id"]}, {"$addToSet": {"badges": "verified_choir"}})
    return {"ok": True}


@api.post("/choir/{cid}/promote")
async def choir_promote(cid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    c = await db.choir_memberships.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Not found")
    if c.get("status") != "verified":
        raise HTTPException(400, "Member must be verified first")
    dir_count = await db.choir_memberships.count_documents({"parish_id": c["parish_id"], "role": "director"})
    if dir_count >= 2:
        raise HTTPException(400, "Parish already has 2 choir directors")
    await db.choir_memberships.update_one({"id": cid}, {"$set": {"role": "director"}})
    return {"ok": True}


@api.get("/me/choir-status")
async def my_choir_status(user: dict = Depends(get_current_user)):
    items = await db.choir_memberships.find({"user_id": user["id"]}, {"_id": 0}).to_list(20)
    for c in items:
        p = await db.parishes.find_one({"id": c["parish_id"]}, {"_id": 0})
        c["parish"] = p
    return items


# ---------------- Rehearsals ----------------
@api.post("/rehearsals")
async def create_rehearsal(body: RehearsalIn, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "created_by": user["id"], "created_at": iso(now_utc())})
    await db.rehearsals.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/rehearsals")
async def list_rehearsals(parish_id: str):
    items = await db.rehearsals.find({"parish_id": parish_id}, {"_id": 0}).sort("scheduled_at", 1).to_list(100)
    return items


@api.delete("/rehearsals/{rid}")
async def delete_rehearsal(rid: str, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    await db.rehearsals.delete_one({"id": rid})
    return {"ok": True}


# ---------------- Choir Announcements ----------------
@api.post("/choir/announcements")
async def create_choir_announcement(body: ChoirAnnouncementIn, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "author_id": user["id"], "author_name": user.get("name", ""), "created_at": iso(now_utc())})
    await db.choir_announcements.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/choir/announcements")
async def list_choir_announcements(parish_id: str):
    items = await db.choir_announcements.find({"parish_id": parish_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


@api.delete("/choir/announcements/{aid}")
async def delete_choir_announcement(aid: str, user: dict = Depends(require_roles("super_admin", "parish_admin", "shepherd"))):
    await db.choir_announcements.delete_one({"id": aid})
    return {"ok": True}


# ---------------- Service / Volunteer ----------------
@api.post("/service/join")
async def service_join(body: ServiceJoinIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "parish_id": body.parish_id,
        "service_type": body.service_type,
        "status": "pending",
        "note": body.note,
        "created_at": iso(now_utc()),
    }
    await db.volunteer_memberships.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/service")
async def service_list(parish_id: Optional[str] = None):
    flt: dict = {"status": "approved"}
    if parish_id:
        flt["parish_id"] = parish_id
    items = await db.volunteer_memberships.find(flt, {"_id": 0}).to_list(500)
    return items


@api.get("/service/pending")
async def service_pending(user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    return await db.volunteer_memberships.find({"status": "pending"}, {"_id": 0}).to_list(500)


@api.post("/service/{sid}/approve")
async def service_approve(sid: str, user: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.volunteer_memberships.update_one({"id": sid}, {"$set": {"status": "approved", "approved_at": iso(now_utc())}})
    return {"ok": True}


# ---------------- Members / Discovery ----------------
@api.get("/members")
async def list_members(country: Optional[str] = None, q: Optional[str] = None, limit: int = 100):
    flt: dict = {}
    if country:
        flt["country"] = {"$regex": f"^{country}$", "$options": "i"}
    if q:
        flt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"ccc_rank": {"$regex": q, "$options": "i"}},
        ]
    items = await db.users.find(flt, {"_id": 0, "password_hash": 0, "email": 0}).limit(limit).to_list(limit)
    return items


@api.post("/members/{uid}/follow")
async def follow_member(uid: str, user: dict = Depends(get_current_user)):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot follow yourself")
    existing = await db.member_follows.find_one({"follower_id": user["id"], "followee_id": uid})
    if existing:
        return {"ok": True, "already": True}
    await db.member_follows.insert_one({"id": new_id(), "follower_id": user["id"], "followee_id": uid, "created_at": iso(now_utc())})
    await db.users.update_one({"id": uid}, {"$inc": {"follow_count": 1}})
    return {"ok": True}


@api.delete("/members/{uid}/follow")
async def unfollow_member(uid: str, user: dict = Depends(get_current_user)):
    await db.member_follows.delete_one({"follower_id": user["id"], "followee_id": uid})
    await db.users.update_one({"id": uid}, {"$inc": {"follow_count": -1}})
    return {"ok": True}


@api.get("/members/{uid}/follow-status")
async def follow_status(uid: str, user: dict = Depends(get_current_user)):
    following = await db.member_follows.find_one({"follower_id": user["id"], "followee_id": uid})
    followers_count = await db.member_follows.count_documents({"followee_id": uid})
    return {"following": bool(following), "followers_count": followers_count}


@api.get("/members/{uid}")
async def get_member_profile(uid: str, user: dict = Depends(get_current_user)):
    """Return a member's public/members-visible profile fields."""
    blocked = await db.member_blocks.find_one({"$or": [{"blocker_id": user["id"], "blocked_id": uid}, {"blocker_id": uid, "blocked_id": user["id"]}]})
    if blocked:
        raise HTTPException(403, "Profile not available")
    m = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0, "email": 0})
    if not m:
        raise HTTPException(404, "Member not found")
    priv = m.get("privacy") or {}
    # Respect privacy field — strip private-only fields
    def _vis(field: str) -> bool:
        v = priv.get(field, "members")
        if v == "public": return True
        if v == "members": return True
        if v == "private": return False
        return True
    for f in ["city", "career_summary", "phone_public"]:
        if not _vis(f):
            m.pop(f, None)
    # Enrich with choir & service
    choir = await db.choir_memberships.find_one({"user_id": uid, "status": "verified"}, {"_id": 0})
    service_teams = await db.volunteer_memberships.find({"user_id": uid, "status": "approved"}, {"_id": 0}).to_list(20)
    # Check follow
    is_following = bool(await db.member_follows.find_one({"follower_id": user["id"], "followee_id": uid}))
    followers_count = await db.member_follows.count_documents({"followee_id": uid})
    return {**m, "choir": choir, "service_teams": service_teams, "is_following": is_following, "followers_count": followers_count}


@api.post("/members/{uid}/block")
async def block_member(uid: str, user: dict = Depends(get_current_user)):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot block yourself")
    existing = await db.member_blocks.find_one({"blocker_id": user["id"], "blocked_id": uid})
    if existing:
        return {"ok": True, "already": True}
    await db.member_blocks.insert_one({"id": new_id(), "blocker_id": user["id"], "blocked_id": uid, "created_at": iso(now_utc())})
    # Also remove follows in both directions
    await db.member_follows.delete_many({"$or": [{"follower_id": user["id"], "followee_id": uid}, {"follower_id": uid, "followee_id": user["id"]}]})
    return {"ok": True}


@api.delete("/members/{uid}/block")
async def unblock_member(uid: str, user: dict = Depends(get_current_user)):
    await db.member_blocks.delete_one({"blocker_id": user["id"], "blocked_id": uid})
    return {"ok": True}


@api.get("/me/blocks")
async def my_blocks(user: dict = Depends(get_current_user)):
    blocks = await db.member_blocks.find({"blocker_id": user["id"]}, {"_id": 0}).to_list(200)
    return blocks


# ---------------- Messaging ----------------
@api.post("/messages")
async def send_message(body: MessageIn, user: dict = Depends(get_current_user)):
    pair = sorted([user["id"], body.to_user_id])
    conv_id = f"{pair[0]}__{pair[1]}"
    msg = {
        "id": new_id(),
        "conversation_id": conv_id,
        "from_user_id": user["id"],
        "from_name": user.get("name", ""),
        "to_user_id": body.to_user_id,
        "body": body.body,
        "created_at": iso(now_utc()),
    }
    await db.direct_messages.insert_one(msg)
    await db.notifications.insert_one({
        "id": new_id(), "user_id": body.to_user_id, "title": f"New message from {user.get('name', '')}",
        "body": body.body[:120], "category": "message", "read": False, "created_at": iso(now_utc()),
    })
    msg.pop("_id", None)
    return msg


@api.get("/messages/inbox")
async def inbox(user: dict = Depends(get_current_user)):
    msgs = await db.direct_messages.find({"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    convs: dict = {}
    for m in msgs:
        cid = m["conversation_id"]
        if cid not in convs:
            other_id = m["to_user_id"] if m["from_user_id"] == user["id"] else m["from_user_id"]
            other = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0, "email": 0, "id": 1, "name": 1, "avatar": 1, "ccc_rank": 1})
            unread = await db.direct_messages.count_documents({"conversation_id": cid, "to_user_id": user["id"], "read": {"$ne": True}})
            convs[cid] = {"conversation_id": cid, "other_user_id": other_id, "other_user": other or {}, "last": m, "unread": unread, "messages": []}
        convs[cid]["messages"].append(m)
    return list(convs.values())


@api.patch("/messages/conversations/{cid}/read")
async def mark_conversation_read(cid: str, user: dict = Depends(get_current_user)):
    await db.direct_messages.update_many({"conversation_id": cid, "to_user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- Careers ----------------
@api.post("/jobs")
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "posted_by": user["id"],
        "poster_name": user.get("name", ""),
        "status": "active",
        "created_at": iso(now_utc()),
    })
    await db.careers_jobs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/jobs")
async def list_jobs(q: Optional[str] = None, location: Optional[str] = None, remote: Optional[bool] = None):
    flt: dict = {"status": "active"}
    if q:
        flt["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"description": {"$regex": q, "$options": "i"}}]
    if location:
        flt["location"] = {"$regex": location, "$options": "i"}
    if remote is not None:
        flt["remote"] = remote
    return await db.careers_jobs.find(flt, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


@api.post("/jobs/{jid}/apply")
async def apply_job(jid: str, body: dict, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "job_id": jid,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "message": body.get("message", ""),
        "status": "submitted",
        "created_at": iso(now_utc()),
    }
    await db.careers_applications.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/jobs/{jid}/save")
async def save_job(jid: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_jobs.find_one({"job_id": jid, "user_id": user["id"]})
    if existing:
        return {"ok": True, "already": True}
    await db.saved_jobs.insert_one({"id": new_id(), "job_id": jid, "user_id": user["id"], "created_at": iso(now_utc())})
    return {"ok": True}


@api.delete("/jobs/{jid}/save")
async def unsave_job(jid: str, user: dict = Depends(get_current_user)):
    await db.saved_jobs.delete_one({"job_id": jid, "user_id": user["id"]})
    return {"ok": True}


@api.get("/me/saved-jobs")
async def my_saved_jobs(user: dict = Depends(get_current_user)):
    saves = await db.saved_jobs.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    out = []
    for s in saves:
        job = await db.careers_jobs.find_one({"id": s["job_id"]}, {"_id": 0})
        if job:
            out.append({**job, "saved_at": s["created_at"]})
    return out


@api.get("/me/applications")
async def my_applications(user: dict = Depends(get_current_user)):
    apps = await db.careers_applications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    out = []
    for a in apps:
        job = await db.careers_jobs.find_one({"id": a["job_id"]}, {"_id": 0})
        out.append({**a, "job": job})
    return out


@api.get("/me/service-teams")
async def my_service_teams(user: dict = Depends(get_current_user)):
    items = await db.volunteer_memberships.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    for it in items:
        p = await db.parishes.find_one({"id": it.get("parish_id", "")}, {"_id": 0, "name": 1, "id": 1})
        it["parish"] = p
    return items


# ---------------- Notifications ----------------
@api.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- Admin: users mgmt ----------------
@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_roles("super_admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).limit(1000).to_list(1000)


@api.patch("/admin/users/{uid}")
async def admin_update_user(uid: str, body: dict, user: dict = Depends(get_current_user)):
    # Allow self-update OR super_admin
    if uid != user["id"] and user.get("role") != "super_admin":
        raise HTTPException(403, "Not authorized")
    body.pop("password_hash", None); body.pop("_id", None); body.pop("id", None); body.pop("email", None)
    # non-admins cannot change their own role
    if user.get("role") != "super_admin":
        body.pop("role", None); body.pop("badges", None); body.pop("assigned_parish_id", None); body.pop("managed_parish_ids", None)
    await db.users.update_one({"id": uid}, {"$set": body})
    return {"ok": True}


@api.post("/admin/users/{uid}/badge")
async def admin_award_badge(uid: str, body: dict, user: dict = Depends(require_roles("super_admin"))):
    badge = body.get("badge")
    if not badge:
        raise HTTPException(400, "badge required")
    await db.users.update_one({"id": uid}, {"$addToSet": {"badges": badge}})
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": user["id"], "actor_name": user.get("name"),
        "action": "award_badge", "target": uid, "details": {"badge": badge},
        "created_at": iso(now_utc()),
    })
    return {"ok": True}


@api.post("/admin/users/{uid}/role")
async def admin_set_role(uid: str, body: dict, actor: dict = Depends(require_roles("super_admin"))):
    role = body.get("role")
    parish_id = body.get("parish_id")
    if role not in ("member", "parish_admin", "shepherd", "moderator", "super_admin"):
        raise HTTPException(400, "Invalid role")
    update = {"role": role}
    if parish_id:
        update["assigned_parish_id"] = parish_id
    await db.users.update_one({"id": uid}, {"$set": update})
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "set_role", "target": uid, "details": {"role": role, "parish_id": parish_id},
        "created_at": iso(now_utc()),
    })
    return {"ok": True}


@api.post("/admin/users/{uid}/verify")
async def verify_member(uid: str, body: dict = {}, actor: dict = Depends(require_roles("super_admin"))):
    """Assign the verified badge to a member."""
    reason = (body or {}).get("reason", "Verified by Super Admin")
    await db.users.update_one(
        {"id": uid},
        {"$set": {"verified": True, "verified_reason": reason, "verified_at": iso(now_utc()), "verified_by": actor["id"]}},
    )
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "user_verified", "target": uid, "details": {"reason": reason},
        "created_at": iso(now_utc()),
    })
    return {"ok": True}


@api.delete("/admin/users/{uid}/verify")
async def unverify_member(uid: str, actor: dict = Depends(require_roles("super_admin"))):
    """Remove the verified badge from a member."""
    await db.users.update_one(
        {"id": uid},
        {"$unset": {"verified": "", "verified_reason": "", "verified_at": "", "verified_by": ""}},
    )
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "user_unverified", "target": uid, "details": {},
        "created_at": iso(now_utc()),
    })
    return {"ok": True}


# ── Parish Admin Requests ─────────────────────────────────────────────────────
@api.post("/me/parish-admin-request")
async def submit_parish_admin_request(body: ParishAdminReqIn, user: dict = Depends(get_current_user)):
    """Member submits a request to become parish admin for a specific parish."""
    existing = await db.parish_admin_requests.find_one({
        "user_id": user["id"], "parish_id": body.parish_id,
        "status": {"$in": ["pending", "approved"]},
    })
    if existing:
        raise HTTPException(400, "You already have a pending or approved request for this parish")
    parish = await db.parishes.find_one({"id": body.parish_id}, {"_id": 0, "name": 1})
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "ccc_rank": user.get("ccc_rank"),
        "parish_id": body.parish_id,
        "parish_name": parish.get("name") if parish else None,
        "note": body.note,
        "reason": body.reason,
        "comments": body.comments or "",
        "status": "pending",          # pending | approved | rejected | needs_info | deferred
        "reviewed_by": None,
        "reviewer_name": None,
        "review_note": None,
        "created_at": iso(now_utc()),
        "reviewed_at": None,
    }
    await db.parish_admin_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/me/parish-admin-requests")
async def my_parish_admin_requests(user: dict = Depends(get_current_user)):
    """Return the authenticated member's own parish admin requests."""
    reqs = await db.parish_admin_requests.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return reqs


@api.get("/admin/parish-admin-requests")
async def admin_list_parish_admin_requests(
    status: Optional[str] = None,
    actor: dict = Depends(require_roles("super_admin")),
):
    """Super Admin — list all parish admin requests, optionally filtered by status."""
    flt: dict = {}
    if status:
        flt["status"] = status
    reqs = await db.parish_admin_requests.find(flt, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reqs


@api.post("/admin/parish-admin-requests/{rid}/review")
async def admin_review_parish_admin_request(
    rid: str, body: dict, actor: dict = Depends(require_roles("super_admin"))
):
    """Super Admin reviews a parish admin request: approve | reject | needs_info | defer."""
    action = (body or {}).get("action")
    review_note = (body or {}).get("note", "")
    if action not in ("approve", "reject", "needs_info", "defer"):
        raise HTTPException(400, "action must be one of: approve | reject | needs_info | defer")
    req = await db.parish_admin_requests.find_one({"id": rid})
    if not req:
        raise HTTPException(404, "Request not found")
    status_map = {"approve": "approved", "reject": "rejected", "needs_info": "needs_info", "defer": "deferred"}
    new_status = status_map[action]
    await db.parish_admin_requests.update_one({"id": rid}, {"$set": {
        "status": new_status,
        "reviewed_by": actor["id"],
        "reviewer_name": actor.get("name"),
        "review_note": review_note,
        "reviewed_at": iso(now_utc()),
    }})
    uid = req["user_id"]
    if action == "approve":
        await db.users.update_one(
            {"id": uid},
            {"$set": {"role": "parish_admin", "assigned_parish_id": req["parish_id"]}},
        )
        await db.notifications.insert_one({
            "id": new_id(), "user_id": uid,
            "title": "Parish Admin Request Approved",
            "body": f"Your request to manage {req.get('parish_name', 'the parish')} has been approved. Welcome, Parish Admin!",
            "category": "admin", "read": False, "created_at": iso(now_utc()),
        })
        await db.audit_logs.insert_one({
            "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
            "action": "parish_admin_approved", "target": uid,
            "details": {"parish_id": req["parish_id"], "user_name": req.get("user_name")},
            "created_at": iso(now_utc()),
        })
    elif action == "reject":
        await db.notifications.insert_one({
            "id": new_id(), "user_id": uid,
            "title": "Parish Admin Request — Not Approved",
            "body": f"Your parish admin request was not approved. {('Reason: ' + review_note) if review_note else 'Please contact Super Admin for details.'}",
            "category": "admin", "read": False, "created_at": iso(now_utc()),
        })
    elif action == "needs_info":
        await db.notifications.insert_one({
            "id": new_id(), "user_id": uid,
            "title": "Parish Admin Request — More Info Needed",
            "body": review_note or "Super Admin requires more information about your Parish Admin application.",
            "category": "admin", "read": False, "created_at": iso(now_utc()),
        })
    return {"ok": True, "status": new_status}


# ---------------- Moderation / Reports ----------------
@api.post("/reports")
async def create_report(body: dict, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "reporter_id": user["id"],
        "reporter_name": user.get("name"),
        "target_type": body.get("target_type"),  # post|prayer|testimony|user|comment
        "target_id": body.get("target_id"),
        "reason": body.get("reason", "Other"),
        "note": body.get("note", ""),
        "status": "open",  # open | resolved | dismissed
        "created_at": iso(now_utc()),
    }
    await db.reports.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/admin/reports")
async def list_reports(status: Optional[str] = None, actor: dict = Depends(require_roles("super_admin", "parish_admin", "moderator"))):
    flt: dict = {}
    if status:
        flt["status"] = status
    return await db.reports.find(flt, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/reports/{rid}/resolve")
async def resolve_report(rid: str, body: dict, actor: dict = Depends(require_roles("super_admin", "parish_admin", "moderator"))):
    action = body.get("action", "dismiss")  # dismiss | hide | delete
    r = await db.reports.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Not found")
    if action in ("hide", "delete"):
        tt = r.get("target_type")
        tid = r.get("target_id")
        if tt == "post":
            await db.feed_posts.update_one({"id": tid}, {"$set": {"hidden": True}})
            if action == "delete":
                await db.feed_posts.delete_one({"id": tid})
        elif tt == "prayer":
            await db.prayer_requests.update_one({"id": tid}, {"$set": {"hidden": True}})
            if action == "delete":
                await db.prayer_requests.delete_one({"id": tid})
        elif tt == "testimony":
            await db.testimonies.update_one({"id": tid}, {"$set": {"hidden": True}})
            if action == "delete":
                await db.testimonies.delete_one({"id": tid})
    await db.reports.update_one({"id": rid}, {"$set": {"status": "resolved", "resolved_action": action, "resolved_by": actor["id"], "resolved_at": iso(now_utc())}})
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": f"report_{action}", "target": rid,
        "details": {"target_type": r.get("target_type"), "target_id": r.get("target_id")},
        "created_at": iso(now_utc()),
    })
    return {"ok": True}


# ---------------- Parish Settings (admin configurable) ----------------
PARISH_SETTING_KEYS = ["max_parish_memberships", "global_join_mode", "join_state_match_required"]

@api.get("/admin/parish-settings")
async def get_parish_settings(actor: dict = Depends(require_roles("super_admin"))):
    out = {}
    for key in PARISH_SETTING_KEYS:
        out[key] = await get_config(key)
    return out

@api.patch("/admin/parish-settings")
async def update_parish_settings(body: dict, actor: dict = Depends(require_roles("super_admin"))):
    updated = {}
    for key in PARISH_SETTING_KEYS:
        if key in body:
            await set_config(key, str(body[key]))
            updated[key] = str(body[key])
    if not updated:
        raise HTTPException(400, f"No valid keys provided. Allowed: {PARISH_SETTING_KEYS}")
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "parish_settings_update", "target": "parish_settings",
        "details": updated, "created_at": iso(now_utc()),
    })
    return {"ok": True, "updated": updated}


# ---------------- Audit Log ----------------
@api.get("/admin/audit-logs")
async def audit_logs(actor: dict = Depends(require_roles("super_admin"))):
    return await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)


@api.get("/admin/parish-suggestions")
async def parish_suggestions(user: dict = Depends(require_roles("super_admin"))):
    return await db.parish_suggestions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ── Parish Bulk Import ──────────────────────────────────────────────────
PARISH_SAMPLE = [
    {
        "name": "CCC Bethel Parish Example",
        "country": "Nigeria", "state": "Lagos", "city": "Lagos",
        "address": "12 Palm Avenue, Lagos Island",
        "shepherd_name": "Shepherd Emmanuel Adewale",
        "phone": "+2348012345678",
        "website": "https://bethel.ccc.org",
        "service_times": "Sunday 9:00am, Wednesday 6:00pm",
        "description": "A vibrant Celestial Church of Christ parish in the heart of Lagos.",
        "image_url": "https://example.com/parish-photo.jpg",
        "lat": 6.5244, "lng": 3.3792,
        "status": "active", "join_mode": "open",
        "choir_enabled": True, "ministries_enabled": True,
    },
    {
        "name": "CCC Celestial Parish London",
        "country": "United Kingdom", "state": "Greater London", "city": "London",
        "address": "45 Church Road, Peckham, London SE15",
        "shepherd_name": "Pastor Adebisi Okonkwo",
        "phone": "+447700900000",
        "website": "", "service_times": "Sunday 10:30am",
        "description": "Serving the Celestial family across South London.",
        "image_url": "", "lat": 51.4735, "lng": -0.0682,
        "status": "active", "join_mode": "open",
        "choir_enabled": True, "ministries_enabled": False,
    },
]

@api.get("/admin/parishes/sample")
async def parish_sample_json(actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    """Download sample JSON template for bulk parish import."""
    return PARISH_SAMPLE

@api.post("/admin/parishes/import")
async def import_parishes(body: List[dict], actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    """Bulk import parishes from a JSON array."""
    created = 0; skipped = 0; errors = []
    for p in body:
        name = (p.get("name") or "").strip()
        if not name:
            errors.append("Entry skipped: missing name"); continue
        existing = await db.parishes.find_one({"name": name})
        if existing:
            skipped += 1; continue
        try:
            doc = {
                "id": new_id(), "name": name,
                "country": p.get("country", ""), "state": p.get("state", ""),
                "city": p.get("city", ""), "address": p.get("address", ""),
                "shepherd_name": p.get("shepherd_name", ""), "phone": p.get("phone", ""),
                "website": p.get("website", ""), "service_times": p.get("service_times", ""),
                "description": p.get("description", ""), "image_url": p.get("image_url", ""),
                "lat": float(p["lat"]) if p.get("lat") not in (None, "") else None,
                "lng": float(p["lng"]) if p.get("lng") not in (None, "") else None,
                "status": p.get("status", "active"),
                "join_mode": p.get("join_mode", "open"),
                "choir_enabled": bool(p.get("choir_enabled", True)),
                "ministries_enabled": bool(p.get("ministries_enabled", True)),
                "livestream_url": "", "created_at": iso(now_utc()), "created_by": actor["id"],
            }
            await db.parishes.insert_one(doc)
            created += 1
        except Exception as ex:
            errors.append(f"{name}: {ex}")
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "parish_bulk_import", "target": "parishes",
        "details": {"created": created, "skipped": skipped}, "created_at": iso(now_utc()),
    })
    return {"created": created, "skipped": skipped, "errors": errors}


# ── Settings / Ranks Bulk Import ─────────────────────────────────────────
SETTINGS_SAMPLES: Dict[str, List] = {
    "ccc_ranks": [
        "Praying Band Member", "Tender", "Full Member", "Senior Member",
        "Deacon", "Deaconess", "Evangelist", "Pastor",
        "Reverend", "Reverend Superintendent", "Senior Shepherd", "Superior Shepherd",
    ],
    "badges": [
        "New Member", "Choir Star", "Prayer Warrior", "Testimony Champion",
        "Service Leader", "Youth Ambassador", "Community Builder", "Faithful Giver",
    ],
    "service_types": [
        "Ushering", "Choir", "Protocol", "Media & Streaming",
        "Children Ministry", "Prayer Team", "Welfare", "Evangelism",
    ],
    "event_categories": [
        "Harvest Festival", "Special Services", "Youth Rally",
        "Women's Meeting", "Bible Study", "Thanksgiving Service", "Musical Night",
    ],
    "prayer_categories": [
        "Healing", "Deliverance", "Provision", "Family", "Nation", "Thanksgiving",
    ],
}

@api.get("/admin/settings/sample/{key}")
async def settings_sample_json(key: str, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    """Download sample JSON array for bulk-importing a settings catalog."""
    sample = SETTINGS_SAMPLES.get(key, ["Example Value 1", "Example Value 2", "Example Value 3"])
    return sample

@api.post("/admin/settings/import/{key}")
async def import_settings_bulk(key: str, body: List[str], actor: dict = Depends(require_roles("super_admin"))):
    """Bulk import setting labels from a JSON array of strings."""
    existing_labels = {
        i["label"] for i in
        await db.admin_settings.find({"key": key}, {"label": 1}).to_list(None)
    }
    order = await db.admin_settings.count_documents({"key": key})
    added = 0; skipped = 0
    for raw in body:
        label = str(raw).strip()
        if not label or label in existing_labels:
            skipped += 1; continue
        await db.admin_settings.insert_one({
            "id": new_id(), "key": key, "label": label, "order": order + added,
            "active": True, "meta": {}, "description": "", "created_at": iso(now_utc()),
        })
        added += 1
    return {"added": added, "skipped": skipped}


# ── Post Media Upload ──────────────────────────────────────────────────────
_POST_MEDIA_MAX = 10 * 1024 * 1024  # 10 MB
_POST_MEDIA_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
                     "video/mp4", "video/quicktime", "video/webm", "video/ogg"}

@api.post("/posts/media")
async def upload_post_media(request: Request, user: dict = Depends(get_current_user)):
    """Upload an image or short video (max 10 MB) to attach to a post. Returns {url, type}."""
    from fastapi import UploadFile
    ct_hdr = request.headers.get("content-type", "")
    if "multipart/form-data" not in ct_hdr:
        raise HTTPException(400, "multipart/form-data required")
    form = await request.form()
    file: UploadFile = form.get("file")
    if not file:
        raise HTTPException(400, "No file in form")
    data = await file.read()
    if len(data) > _POST_MEDIA_MAX:
        raise HTTPException(413, f"File exceeds 10 MB (got {len(data)//1024//1024:.1f} MB)")
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct not in _POST_MEDIA_TYPES:
        raise HTTPException(415, f"Unsupported file type '{ct}'. Allowed: images and short videos.")
    is_video = ct.startswith("video/")
    folder = "post-videos" if is_video else "post-images"
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() or ("mp4" if is_video else "jpg")
    key = f"{folder}/{user['id']}/{new_id()}.{ext}"
    r2_url = (await get_config("cloudflare_r2_public_url") or "").rstrip("/")
    try:
        import boto3, botocore.config
        s3 = boto3.client(
            "s3",
            endpoint_url=await get_config("cloudflare_r2_endpoint") or os.environ.get("R2_ENDPOINT", ""),
            aws_access_key_id=await get_config("cloudflare_r2_access_key") or os.environ.get("R2_ACCESS_KEY", ""),
            aws_secret_access_key=await get_config("cloudflare_r2_secret") or os.environ.get("R2_SECRET_KEY", ""),
            config=botocore.config.Config(signature_version="s3v4"),
            region_name="auto",
        )
        bucket = await get_config("cloudflare_r2_bucket") or os.environ.get("R2_BUCKET", "")
        s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=ct)
        url = f"{r2_url}/{key}" if r2_url else ""
    except Exception as e:
        log.warning("[post-media] R2 upload failed: %s — returning data-uri fallback", e)
        import base64 as _b64
        url = f"data:{ct};base64,{_b64.b64encode(data).decode()}"
    return {"url": url, "type": "video" if is_video else "image", "size_bytes": len(data)}


# ── CPM Wave Tracks (admin-managed) ──────────────────────────────────────────
@api.get("/cpmwave/tracks")
async def list_cpmwave_tracks(user: dict = Depends(get_current_user)):
    return await db.cpmwave_tracks.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.get("/admin/cpmwave/tracks")
async def admin_list_tracks(actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    return await db.cpmwave_tracks.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/admin/cpmwave/tracks")
async def admin_add_track(body: dict, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    title = (body.get("title") or "").strip()
    url   = (body.get("url") or "").strip()
    if not title or not url:
        raise HTTPException(400, "title and url required")
    doc = {
        "id": new_id(), "title": title,
        "artist": (body.get("artist") or "").strip(),
        "category": (body.get("category") or "hymn").strip(),
        "description": (body.get("description") or "").strip(),
        "url": url, "featured": bool(body.get("featured", False)),
        "added_by": actor.get("name", ""), "created_at": iso(now_utc()),
    }
    await db.cpmwave_tracks.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/admin/cpmwave/tracks/{tid}")
async def admin_update_track(tid: str, body: dict, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    allowed = {"title", "artist", "category", "description", "url", "featured"}
    updates = {k: v for k, v in body.items() if k in allowed}
    await db.cpmwave_tracks.update_one({"id": tid}, {"$set": updates})
    return {"ok": True}

@api.delete("/admin/cpmwave/tracks/{tid}")
async def admin_delete_track(tid: str, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.cpmwave_tracks.delete_one({"id": tid})
    return {"ok": True}


# ── AI Knowledge Base Documents ──────────────────────────────────────────
@api.get("/admin/ai/documents")
async def list_ai_documents(actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    return await db.ai_documents.find({}, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(100)

@api.post("/admin/ai/documents")
async def add_ai_document(body: dict, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    title = (body.get("title") or "").strip()
    content = (body.get("content") or "").strip()
    if not title or not content:
        raise HTTPException(400, "title and content required")
    doc = {
        "id": new_id(), "title": title, "content": content,
        "char_count": len(content), "created_by_name": actor.get("name"),
        "created_at": iso(now_utc()),
    }
    await db.ai_documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/admin/ai/documents/{did}")
async def delete_ai_document(did: str, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    await db.ai_documents.delete_one({"id": did})
    return {"ok": True}


# ── CCC Hymns — Structured Knowledge Base ────────────────────────────────────
import re as _re_hymn

_RESERVED_PHRASES = ["reserved", "will be provided", "pending", "information will be", "not available"]

def _parse_hymn_markdown(raw: str) -> list:
    """
    Parse the structured Markdown format produced by the admin knowledge base doc:
        ### Hymn 1
        Category: PROCESSIONAL HYMN
        Opening line: Jerih Moh Yamah
        Lyrics:
        - Jerih Moh Yamah
        - ...

        ### Hymn 20
        Category: PROCESSIONAL HYMN
        Status: Reserved
        Response: This hymn is reserved. Information will be provided soon.
    """
    hymns = []
    current = None
    in_lyrics = False

    for raw_line in raw.splitlines():
        line = raw_line.strip()

        # ── New hymn header: ### Hymn N or ## Hymn N ──────────────────────
        hm = _re_hymn.match(r'^#{2,3}\s+Hymn\s+(\d+)', line, _re_hymn.IGNORECASE)
        if hm:
            if current is not None:
                hymns.append(current)
            current = {
                "id": new_id(),
                "number": int(hm.group(1)),
                "section": "General",
                "category": "",
                "title": "",
                "opening_line": "",
                "lines": [],
                "reserved": False,
            }
            in_lyrics = False
            continue

        if current is None:
            continue

        # ── Category ────────────────────────────────────────────────────────
        if _re_hymn.match(r'^Category\s*:', line, _re_hymn.IGNORECASE):
            val = line.split(":", 1)[1].strip()
            current["category"] = val
            current["section"] = val
            in_lyrics = False
            continue

        # ── Opening line ────────────────────────────────────────────────────
        if _re_hymn.match(r'^Opening\s+line\s*:', line, _re_hymn.IGNORECASE):
            val = line.split(":", 1)[1].strip()
            current["opening_line"] = val
            if not current["title"]:
                current["title"] = val[:80]
            in_lyrics = False
            continue

        # ── Status: Reserved ────────────────────────────────────────────────
        if _re_hymn.match(r'^Status\s*:', line, _re_hymn.IGNORECASE):
            if "reserved" in line.lower():
                current["reserved"] = True
            in_lyrics = False
            continue

        # ── Response line (just confirms reserved, skip content) ────────────
        if _re_hymn.match(r'^Response\s*:', line, _re_hymn.IGNORECASE):
            in_lyrics = False
            continue

        # ── Lyrics section marker ────────────────────────────────────────────
        if _re_hymn.match(r'^Lyrics\s*:', line, _re_hymn.IGNORECASE):
            in_lyrics = True
            continue

        # ── Lyric list item "- ..." ──────────────────────────────────────────
        if in_lyrics and line.startswith("- "):
            current["lines"].append(line[2:])
            continue

        # ── Stop lyrics on any new labelled field ────────────────────────────
        if in_lyrics and _re_hymn.match(r'^[A-Za-z][A-Za-z\s]+\s*:', line):
            in_lyrics = False

    if current is not None:
        hymns.append(current)

    result = []
    for h in hymns:
        h["lyrics_text"] = "\n".join(h["lines"])
        del h["lines"]
        if not h.get("title") and h.get("opening_line"):
            h["title"] = h["opening_line"][:80]
        h["created_at"] = iso(now_utc())
        result.append(h)
    return result


def _parse_hymn_source(raw: str) -> list:
    """
    Auto-detect format and parse CCC hymn text into structured hymn records.
    Supports:
      1. Structured Markdown (### Hymn N / Category: / Opening line: / Lyrics: / Status: Reserved)
      2. Raw plain text (ALL-CAPS section headers, bare hymn numbers, inline lyrics)
    """
    # ── Auto-detect: Markdown format ─────────────────────────────────────────
    if _re_hymn.search(r'^#{2,3}\s+Hymn\s+\d+', raw, _re_hymn.MULTILINE | _re_hymn.IGNORECASE):
        return _parse_hymn_markdown(raw)

    # ── Raw plain-text format ─────────────────────────────────────────────────
    # Pre-scan: collect explicit reserved ranges  e.g. "Hymns 51-100 are reserved"
    reserved_ranges = []
    for m in _re_hymn.finditer(
        r'hymns?\s+(\d+)\s*[-\u2013to]+\s*(\d+)\s+(?:are\s+)?reserved',
        raw, _re_hymn.IGNORECASE
    ):
        reserved_ranges.append((int(m.group(1)), int(m.group(2))))

    hymns = []
    current_section = "General"
    current = None

    for raw_line in raw.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        # Section header: all-caps line, no leading digit, length > 3
        if (
            _re_hymn.match(r'^[A-Z][A-Z\s\(\)\-\/&]+$', line)
            and not _re_hymn.match(r'^\d', line)
            and len(line) > 3
        ):
            current_section = line.title()
            continue

        # Reserved range declaration (may also update ranges)
        if any(ph in line.lower() for ph in _RESERVED_PHRASES):
            rm = _re_hymn.search(r'hymns?\s+(\d+)\s*[-\u2013to]+\s*(\d+)', line, _re_hymn.IGNORECASE)
            if rm:
                reserved_ranges.append((int(rm.group(1)), int(rm.group(2))))
            if current is not None and not rm:
                current["reserved"] = True
            continue

        # Hymn-number line: "35" or "35." or "35 (Category)" or "35 - Title"
        hm = _re_hymn.match(
            r'^(\d{1,4})\.?\s*(?:\(([^)]*)\))?(?:\s*[-\u2013]\s*(.+))?$', line
        )
        if hm and 1 <= int(hm.group(1)) <= 9999:
            if current is not None:
                hymns.append(current)
            num = int(hm.group(1))
            category = (hm.group(2) or "").strip()
            title_hint = (hm.group(3) or "").strip()
            is_res = any(s <= num <= e for s, e in reserved_ranges)
            current = {
                "id": new_id(),
                "number": num,
                "section": current_section,
                "category": category,
                "title": title_hint,
                "opening_line": "",
                "lines": [],
                "reserved": is_res,
            }
            continue

        # Lyric / chorus content
        if current is not None:
            if not current["opening_line"] and not _re_hymn.match(r'^(?:chorus|verse|refrain)\s*:?', line, _re_hymn.IGNORECASE):
                current["opening_line"] = line
            current["lines"].append(line)

    if current is not None:
        hymns.append(current)

    result = []
    for h in hymns:
        h["lyrics_text"] = "\n".join(h["lines"])
        del h["lines"]
        if not h.get("title") and h.get("opening_line"):
            h["title"] = h["opening_line"][:80]
        h["created_at"] = iso(now_utc())
        result.append(h)
    return result


@api.get("/admin/ai/hymns")
async def list_hymns(actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    docs = await db.ai_hymns.find({}, {"_id": 0, "lyrics_text": 0}).sort("number", 1).to_list(2000)
    return docs


@api.post("/admin/ai/hymns/parse")
async def import_hymns(body: dict, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    """Parse raw CCC hymn text and upsert structured records into ai_hymns collection."""
    raw = (body.get("content") or "").strip()
    if not raw:
        raise HTTPException(400, "content required")
    replace = body.get("replace", False)
    parsed = _parse_hymn_source(raw)
    if not parsed:
        raise HTTPException(422, "No hymns could be parsed from the provided text. Check the format.")
    if replace:
        await db.ai_hymns.delete_many({})
    # Upsert by number
    for h in parsed:
        await db.ai_hymns.update_one(
            {"number": h["number"]},
            {"$set": h},
            upsert=True,
        )
    await db.ai_hymns.delete_many({"_id": {"$exists": True}, "id": {"$exists": False}})  # cleanup
    return {"ok": True, "parsed": len(parsed), "replaced": replace}


@api.delete("/admin/ai/hymns")
async def clear_hymns(actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    res = await db.ai_hymns.delete_many({})
    return {"ok": True, "deleted": res.deleted_count}


@api.get("/admin/ai/hymns/{num}")
async def get_hymn(num: int, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    h = await db.ai_hymns.find_one({"number": num}, {"_id": 0})
    if not h:
        raise HTTPException(404, "Hymn not found")
    return h


def _format_hymn_reply(hymn: dict) -> str:
    """
    Format a CCC hymn record into clean, readable text for the chat UI.
    Header block (number + metadata) is separated from lyrics by a blank line
    so the frontend can style them distinctly.
    """
    header = [f"\u2726  CCC Hymn #{hymn.get('number', '?')}"]
    cat = (hymn.get("category") or hymn.get("section") or "").strip()
    if cat:
        header.append(f"Category: {cat.title() if cat.isupper() else cat}")
    opening = (hymn.get("opening_line") or "").strip()
    if opening:
        header.append(f"Opening line: {opening}")
    lyrics = (hymn.get("lyrics_text") or "").strip()
    if lyrics:
        return "\n".join(header) + "\n\n" + lyrics
    return "\n".join(header)


async def _get_hymn_context(message: str) -> tuple:
    """
    Detect if message is a hymn query.
    Returns (result, is_reserved) where result is:
      - dict  : the hymn record (found, not reserved) — caller formats directly
      - 'RESERVED'  : hymn is reserved
      - 'NOT_FOUND' : DB is seeded but no hymn matched the query
      - None        : not a hymn query, or hymn DB not yet seeded
    """
    import re as _re2

    # Pattern 1: "hymn 35", "hymn number 35", "hymn #35", "hymn no. 35"
    nm = _re2.search(
        r'\bhymn\s+(?:number|no\.?|#)?\s*#?(\d+)\b'
        r'|\b(?:number|no\.?|#)\s*(\d+)\s+(?:in\s+the\s+)?hymn',
        message, _re2.IGNORECASE,
    )
    hymn_num = None
    if nm:
        hymn_num = int(nm.group(1) or nm.group(2))
    elif 'hymn' in message.lower():
        bare = _re2.search(r'\b(\d{1,4})\b', message)
        if bare:
            hymn_num = int(bare.group(1))

    hymn = None
    if hymn_num is not None:
        hymn = await db.ai_hymns.find_one({"number": hymn_num}, {"_id": 0})

    # Pattern 2: title / opening-line text search
    if hymn is None:
        stopwords = r'\b(?:hymn|what|is|the|sing|lyrics|words|tell|me|about|number|can|you|please|do|know|give|say|says|does|like)\b'
        clean = _re2.sub(stopwords, '', message, flags=_re2.IGNORECASE).strip()
        clean = _re2.sub(r'\s+', ' ', clean)
        if len(clean) > 4:
            hymn = await db.ai_hymns.find_one(
                {"$or": [
                    {"opening_line": {"$regex": clean[:40], "$options": "i"}},
                    {"title": {"$regex": clean[:40], "$options": "i"}},
                ]},
                {"_id": 0},
            )

    total = await db.ai_hymns.count_documents({})
    if total == 0:
        return (None, False)   # DB not seeded — fall through to raw-doc KB

    if hymn is None:
        return ("NOT_FOUND", False) if 'hymn' in message.lower() else (None, False)

    if hymn.get("reserved"):
        return ("RESERVED", True)

    return (hymn, False)   # return the document dict directly


# ── AI Provider — supports Groq (free), Mistral, Together AI, Ollama, OpenAI ────
_AI_PROVIDERS: Dict[str, Dict[str, str]] = {
    "groq":    {"base_url": "https://api.groq.com/openai/v1",        "model": "llama-3.3-70b-versatile"},
    "mistral": {"base_url": "https://api.mistral.ai/v1",             "model": "mistral-small-latest"},
    "together":{"base_url": "https://api.together.xyz/v1",           "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"},
    "ollama":  {"base_url": "http://localhost:11434/v1",             "model": "llama3"},
    "openai":  {"base_url": "https://api.openai.com/v1",             "model": "gpt-4o-mini"},
}

async def _ai_complete(messages: list, max_tokens: int = 600, temperature: float = 0.7) -> Optional[str]:
    """Call any OpenAI-compatible AI provider from admin config. Defaults to Groq (free)."""
    provider = (await get_config("ai_provider") or "groq").lower()
    api_key  = await get_config("ai_api_key")
    defaults = _AI_PROVIDERS.get(provider, _AI_PROVIDERS["groq"])
    base_url = ((await get_config("ai_base_url")) or defaults["base_url"]).rstrip("/")
    model    = (await get_config("ai_model")) or defaults["model"]
    if not api_key and provider != "ollama":
        log.warning("[ai] No api_key set for provider '%s'", provider)
        return None
    try:
        import httpx as _httpx
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        async with _httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": temperature},
            )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        log.error("[ai] provider=%s status=%s body=%s", provider, resp.status_code, resp.text[:300])
    except Exception as ex:
        log.error("[ai] _ai_complete error (%s): %s", provider, ex)
    return None


# ── AI Chat ──────────────────────────────────────────────────────────────
_CPM_SYSTEM = """You are CPM Assistant — the friendly, knowledgeable AI guide for CelestialPeopleMeet (CPM), the official digital platform of the worldwide Celestial Church of Christ (CCC) community.

YOUR ROLES:
1. Help members navigate CPM features: parishes, prayer wall, choir, testimonies, careers, messages, events, service teams, profiles, and the CPM Wave music platform.
2. Answer questions about the Celestial Church of Christ — its history, beliefs, ordinances, the "sutana" (white garment), founder Samuel Bilewu Joseph Oshoffa, and worldwide administration.
3. Share Bible references, spiritual encouragement, and guidance in the spirit of CCC worship.
4. Use uploaded Knowledge Base documents (constitution, CCC lessons, etc.) to give grounded, accurate answers.
5. For parish-specific questions you cannot answer, invite the member to contact their shepherd.

TONE: Warm, reverent, encouraging. You may greet with "Amen", "Hallelujah", or "Greetings in the name of our Lord". 
LIMITS: Do not give medical advice, make up church doctrine, or discuss politics."""

@api.post("/ai/chat")
async def ai_chat(body: dict, user: dict = Depends(get_current_user)):
    message = (body.get("message") or "").strip()[:2000]
    history = body.get("history", [])
    if not message:
        raise HTTPException(400, "message required")

    # ── Hymn short-circuit (no AI needed) ───────────────────────────────────
    hymn_result, is_reserved = await _get_hymn_context(message)
    if is_reserved:
        return {"reply": "This hymn is reserved. Information will be provided soon.", "error": False}
    if isinstance(hymn_result, dict):
        # Structured hymn found — return pre-formatted reply, bypassing AI entirely
        return {"reply": _format_hymn_reply(hymn_result), "error": False}

    # ── AI path ──────────────────────────────────────────────────────────────
    provider = (await get_config("ai_provider") or "groq").lower()
    api_key  = await get_config("ai_api_key")
    if not api_key and provider != "ollama":
        return {
            "reply": f"The CPM Assistant needs an API key. Go to Admin \u2192 Integrations, set the AI Provider to '{provider}' and paste your free API key.",
            "error": True,
        }

    kb = ""
    if hymn_result == "NOT_FOUND":
        kb = "\n\n[HYMN NOTE: The requested hymn was not found in the database. Inform the user politely and suggest checking the printed CCC Hymn Book.]"
    else:
        # General query — use raw uploaded KB documents
        docs = await db.ai_documents.find({}, {"_id": 0, "title": 1, "content": 1}).to_list(15)
        if docs:
            kb = "\n\n=== UPLOADED KNOWLEDGE BASE ===\n"
            for d in docs:
                kb += f"\n## {d['title']}\n{d['content'][:2500]}\n"
            kb += "\n=== END KNOWLEDGE BASE ==="

    messages = [{"role": "system", "content": _CPM_SYSTEM + kb}]
    for h in (history or [])[-8:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])[:600]})
    messages.append({"role": "user", "content": message})
    reply = await _ai_complete(messages, max_tokens=700, temperature=0.65)
    if reply:
        return {"reply": reply, "error": False}
    return {"reply": "I'm temporarily unavailable. Please try again in a moment.", "error": True}


# ── Helpers — AI text cleaning & structure parsing ───────────────────────────
import re as _re

def _strip_md(text: str) -> str:
    """Strip markdown artifacts from AI-generated text so it reads as plain prose."""
    text = _re.sub(r'\*{1,3}(.+?)\*{1,3}', r'\1', text)
    text = _re.sub(r'^#{1,6}\s+', '', text, flags=_re.MULTILINE)
    text = _re.sub(r'^[\-\*]\s+', '', text, flags=_re.MULTILINE)
    text = _re.sub(r'\n{3,}', '\n\n', text)
    text = _re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
    return text.strip()

def _parse_structured_post(raw: str) -> dict:
    """Parse labelled AI response (TITLE: / BODY: / VERSE: / REFLECTION: / SONG: / PRAYER: / CTA:)."""
    fields: dict = {}
    current_key = None; buffer: list = []
    KEYS = {"TITLE", "INTRO", "BODY", "VERSE", "REFLECTION", "SONG", "PRAYER", "CTA", "CTA_URL"}
    for line in raw.splitlines():
        matched = False
        for k in KEYS:
            if line.upper().startswith(f"{k}:"):
                if current_key:
                    fields[current_key.lower()] = _strip_md("\n".join(buffer).strip())
                current_key = k; buffer = [line[len(k)+1:].strip()]; matched = True; break
        if not matched and current_key:
            buffer.append(line)
    if current_key:
        fields[current_key.lower()] = _strip_md("\n".join(buffer).strip())
    return fields

# ── Daily Scheduled Posts ────────────────────────────────────────────────
_DAILY_TYPES = [
    {"type": "devotion", "label": "Daily Devotion",  "emoji": "✝️",  "color": "navy"},
    {"type": "prayer",   "label": "Morning Prayer",   "emoji": "🙏",  "color": "rose"},
    {"type": "bible",    "label": "Verse of the Day", "emoji": "📖",  "color": "amber"},
    {"type": "music",    "label": "Music for the Day","emoji": "🎵",  "color": "teal"},
]

_DAILY_PROMPTS = {
    "devotion": """Write a daily devotion for Celestial Church of Christ members worldwide.
Format your response EXACTLY like this (no ** or ## or bullet points):
TITLE: [A short inspiring title, max 8 words]
INTRO: [One sentence that draws the reader in]
BODY: [2-3 sentences of devotional content. Plain prose, no symbols.]
VERSE: [One Bible verse with full reference in parentheses]
REFLECTION: [One brief closing sentence of encouragement]""",

    "prayer": """Write a morning prayer for Celestial Church of Christ members to pray together today.
Format your response EXACTLY like this (no ** or ## or bullet points):
TITLE: [Short prayer title, max 8 words]
INTRO: [One sentence setting the spiritual context]
PRAYER: [3-4 sentences of the prayer itself. Reverently written. Begin with 'Heavenly Father' or 'Lord God'.]
VERSE: [A supporting Bible verse with reference]
REFLECTION: [One encouraging closing sentence]""",

    "bible": """Share a verse of the day for Celestial Church of Christ members.
Format your response EXACTLY like this (no ** or ## or bullet points):
TITLE: [Short engaging title for today's verse]
VERSE: [The Bible verse in full, with book, chapter and verse reference in parentheses]
BODY: [2-3 sentences of reflection on its meaning for CCC members today]
REFLECTION: [One short personal application sentence]""",

    "music": """Suggest a Celestial Church of Christ hymn or spiritual song for today.
Format your response EXACTLY like this (no ** or ## or bullet points):
TITLE: [Song title]
SONG: [Artist or choir name who performs it]
BODY: [2-3 sentences about why this song is meaningful for CCC worship today]
VERSE: [A Bible verse that connects to the song's theme]
CTA: Listen on CPM Wave
CTA_URL: https://cpmwave.com""",
}

async def _generate_daily_content(post_type: str) -> Optional[dict]:
    """Generate a structured daily post dict {title, intro, body, verse, reflection, cta, cta_url}."""
    prompt = _DAILY_PROMPTS.get(post_type, "Write a short spiritual encouragement for CCC members.")
    raw = await _ai_complete(
        messages=[
            {"role": "system", "content": "You are a spiritual editor for the Celestial Church of Christ worldwide community. Follow the given format exactly. Write clean, plain prose without any markdown symbols."},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=380, temperature=0.78,
    )
    if not raw:
        return None
    fields = _parse_structured_post(raw)
    # Enrich music posts with a random CPM Wave track if available
    if post_type == "music" and not fields.get("cta_url"):
        track = await db.cpmwave_tracks.find_one({}, sort=[("_id", -1)])
        if track:
            fields["cta"] = f"Listen: {track['title']}"
            fields["cta_url"] = track.get("url", "https://cpmwave.com")
        else:
            fields["cta"] = "Listen on CPM Wave"
            fields["cta_url"] = "https://cpmwave.com"
    return fields


async def fire_daily_posts():
    """Generate structured daily posts and publish to the global feed."""
    enabled  = await get_config("daily_posts_enabled")
    provider = await get_config("ai_provider") or "groq"
    api_key  = await get_config("ai_api_key")
    if enabled != "true":
        log.info("[daily-posts] Skipped — daily_posts_enabled is not 'true'"); return
    if not api_key and provider != "ollama":
        log.info("[daily-posts] Skipped — no AI API key"); return
    sys_user = await db.users.find_one({"role": "super_admin"}, {"_id": 0})
    if not sys_user:
        log.warning("[daily-posts] No super_admin found"); return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for pt in _DAILY_TYPES:
        if await db.feed_posts.find_one({"daily_post_type": pt["type"], "daily_post_date": today}):
            continue
        fields = await _generate_daily_content(pt["type"])
        if not fields:
            continue
        # Build clean body from parsed fields (no markdown)
        body_parts = []
        if fields.get("intro"): body_parts.append(fields["intro"])
        if fields.get("body"):  body_parts.append(fields["body"])
        if fields.get("prayer"): body_parts.append(fields["prayer"])
        if fields.get("reflection"): body_parts.append(fields["reflection"])
        clean_body = "\n\n".join(body_parts)
        doc = {
            "id": new_id(),
            "user_id": sys_user["id"], "user_name": "CPM Community",
            "title": fields.get("title", pt["label"]),
            "body": clean_body,
            "daily_verse": fields.get("verse", ""),
            "daily_song": fields.get("song", ""),
            "cta_label": fields.get("cta", ""),
            "cta_url": fields.get("cta_url", ""),
            "scope": "global", "pinned": False,
            "post_type": "daily_"+pt["type"],
            "daily_post_type": pt["type"],
            "daily_post_date": today,
            "daily_post_category": pt["label"],
            "daily_post_emoji": pt["emoji"],
            "daily_post_color": pt["color"],
            "media_urls": [],
            "reactions": {"amen": 0, "hallelujah": 0, "fire": 0, "pray": 0},
            "comment_count": 0, "created_at": iso(now_utc()),
        }
        await db.feed_posts.insert_one(doc)
        log.info("[daily-posts] Posted %s '%s' for %s", pt["type"], doc["title"], today)
        # Push notification to all members
        try:
            all_users = await db.users.find({}, {"id": 1}).to_list(5000)
            notifs = [{
                "id": new_id(), "user_id": u["id"],
                "title": f"{pt['emoji']} {pt['label']}: {doc['title']}",
                "body": (clean_body[:100] + "…") if len(clean_body) > 100 else clean_body,
                "category": "daily_post", "read": False, "created_at": iso(now_utc()),
            } for u in all_users]
            if notifs:
                await db.notifications.insert_many(notifs)
        except Exception as ne:
            log.warning("[daily-posts] Notification error: %s", ne)

@api.post("/admin/daily-posts/trigger")
async def trigger_daily_posts(actor: dict = Depends(require_roles("super_admin"))):
    """Manually trigger today's daily posts."""
    import asyncio as _asyncio
    # ... (rest of the code remains the same)
    _asyncio.create_task(fire_daily_posts())
    return {"ok": True, "message": "Daily posts generation started in background"}

async def _daily_post_loop():
    import asyncio as _asyncio
    while True:
        try:
            await fire_daily_posts()
        except Exception as ex:
            log.error("[daily-posts] loop error: %s", ex)
        now = datetime.now(timezone.utc)
        target = now.replace(hour=6, minute=0, second=0, microsecond=0)
        if now >= target:
            target += timedelta(days=1)
        wait = (target - now).total_seconds()
        log.info("[daily-posts] Next run in %.0f seconds", wait)
        await _asyncio.sleep(wait)


# ---------------- Home Stats ----------------
@api.get("/stats/home")
async def home_stats():
    return {
        "parishes": await db.parishes.count_documents({}),
        "members": await db.users.count_documents({}),
        "prayers": await db.prayer_requests.count_documents({}),
        "events": await db.events.count_documents({}),
    }


# ====================================================
# INTEGRATIONS — admin-configurable via /api/integrations
# ====================================================
async def get_config(label: str) -> Optional[str]:
    doc = await db.admin_settings.find_one({"key": "integration_config", "label": label, "active": True})
    if not doc:
        return None
    return (doc.get("meta") or {}).get("value")


async def set_config(label: str, value: str, description: str = ""):
    existing = await db.admin_settings.find_one({"key": "integration_config", "label": label})
    if existing:
        await db.admin_settings.update_one({"id": existing["id"]}, {"$set": {"meta": {"value": value}, "description": description, "active": True}})
    else:
        await db.admin_settings.insert_one({
            "id": new_id(), "key": "integration_config", "label": label,
            "description": description, "order": 0, "active": True,
            "meta": {"value": value}, "created_at": iso(now_utc()),
        })


@api.get("/integrations")
async def list_integrations(actor: dict = Depends(require_roles("super_admin"))):
    items = await db.admin_settings.find({"key": "integration_config"}, {"_id": 0}).to_list(100)
    # Mask secrets in listing
    out = []
    for it in items:
        v = (it.get("meta") or {}).get("value", "")
        _public_labels = {"resend_from_email", "google_maps_api_key_public", "vapid_public_key",
                          "cloudflare_r2_public_url", "cloudflare_r2_bucket",
                          "ai_provider", "ai_model", "ai_base_url",
                          "daily_posts_enabled", "global_join_mode", "max_parish_memberships",
                          "join_state_match_required"}
        masked = v if it["label"] in _public_labels else (("…" + v[-4:]) if v else "")
        it["masked_value"] = masked
        it["has_value"] = bool(v)
        # remove raw value from response unless it's a public field
        if it["label"] not in _public_labels:
            it["meta"] = {"value": ""}
        out.append(it)
    return out


@api.post("/integrations")
async def set_integration(body: dict, actor: dict = Depends(require_roles("super_admin"))):
    label = body.get("label")
    value = body.get("value", "")
    description = body.get("description", "")
    if not label:
        raise HTTPException(400, "label required")
    await set_config(label, value, description)
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "set_integration", "target": label,
        "details": {"has_value": bool(value)},
        "created_at": iso(now_utc()),
    })
    return {"ok": True}


@api.post("/integrations/test/{provider}")
async def test_integration(provider: str, body: dict, actor: dict = Depends(require_roles("super_admin"))):
    """Send a test email or check storage/maps config."""
    if provider == "resend":
        ok, msg = await _send_email(body.get("to", actor.get("email")), "CelestialPeopleMeeet test email", "<p>This is a test from your admin console.</p>")
        return {"ok": ok, "message": msg}
    if provider == "vapid":
        # Generate VAPID keypair if not yet set
        pub = await get_config("vapid_public_key")
        priv = await get_config("vapid_private_key")
        if not pub or not priv:
            try:
                from py_vapid import Vapid
                v = Vapid()
                v.generate_keys()
                pub_pem = v.public_pem().decode("utf-8") if isinstance(v.public_pem(), bytes) else v.public_pem()
                priv_pem = v.private_pem().decode("utf-8") if isinstance(v.private_pem(), bytes) else v.private_pem()
                # urlsafe-base64 of raw public key
                raw_pub = v.public_key.public_bytes(encoding=__import__("cryptography").hazmat.primitives.serialization.Encoding.X962, format=__import__("cryptography").hazmat.primitives.serialization.PublicFormat.UncompressedPoint)
                pub_b64 = b64lib.urlsafe_b64encode(raw_pub).decode("utf-8").rstrip("=")
                await set_config("vapid_public_key", pub_b64, "VAPID public key (URL-safe base64) for browser push")
                await set_config("vapid_private_pem", priv_pem, "VAPID private key PEM — keep secret")
                return {"ok": True, "message": "VAPID keys generated", "public_key": pub_b64}
            except Exception as e:
                return {"ok": False, "message": f"VAPID generation failed: {e}"}
        return {"ok": True, "message": "VAPID already configured", "public_key": pub}
    return {"ok": False, "message": "Unknown provider"}


async def _send_email(to: str, subject: str, html: str) -> tuple[bool, str]:
    api_key = await get_config("resend_api_key")
    from_addr = await get_config("resend_from_email") or "CelestialPeopleMeeet <noreply@celestialpeoplemeet.com>"
    if not api_key:
        log.info("[email-fallback] to=%s subject=%s body=%s", to, subject, html[:300])
        return True, "logged (no Resend API key configured)"
    try:
        import resend
        resend.api_key = api_key
        r = resend.Emails.send({"from": from_addr, "to": to, "subject": subject, "html": html})
        return True, f"sent id={r.get('id') if isinstance(r, dict) else r}"
    except Exception as e:
        log.exception("Resend send failed")
        return False, f"failed: {e}"


# ---------------- Public integrations endpoint ----------------
@api.get("/integrations/public")
async def public_integrations():
    """Frontend-safe values: maps API key, vapid public key, r2 public base url."""
    return {
        "google_maps_api_key_public": await get_config("google_maps_api_key_public") or "",
        "vapid_public_key": await get_config("vapid_public_key") or "",
        "cloudflare_r2_public_url": await get_config("cloudflare_r2_public_url") or "",
    }


# ====================================================
# PASSWORD RESET
# ====================================================
@api.post("/auth/forgot-password")
async def forgot_password(body: dict):
    email = (body.get("email") or "").lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "id": new_id(), "user_id": user["id"], "token": token,
            "used": False, "expires_at": iso(now_utc() + timedelta(hours=1)),
            "created_at": iso(now_utc()),
        })
        reset_url = f"{body.get('origin', '')}/reset-password?token={token}"
        html = f"""<p>Hello {user.get('name', 'beloved')},</p>
<p>You requested a password reset. Click the link below to set a new password (valid for 1 hour):</p>
<p><a href="{reset_url}">{reset_url}</a></p>
<p>If you did not request this, you can safely ignore this email.</p>
<p>— CelestialPeopleMeeet</p>"""
        await _send_email(email, "Reset your CelestialPeopleMeeet password", html)
    # Always return ok to avoid email enumeration
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(body: dict):
    token = body.get("token")
    new_pw = body.get("password") or ""
    if not token or len(new_pw) < 6:
        raise HTTPException(400, "Invalid token or password")
    rec = await db.password_reset_tokens.find_one({"token": token, "used": False})
    if not rec:
        raise HTTPException(400, "Invalid or used token")
    if rec.get("expires_at") and datetime.fromisoformat(rec["expires_at"]) < now_utc():
        raise HTTPException(400, "Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(new_pw)}})
    await db.password_reset_tokens.update_one({"id": rec["id"]}, {"$set": {"used": True, "used_at": iso(now_utc())}})
    return {"ok": True}


# ====================================================
# SHEPHERD ENDORSEMENT
# ====================================================
@api.post("/admin/users/{uid}/endorse-shepherd")
async def endorse_shepherd(uid: str, body: dict, actor: dict = Depends(require_roles("super_admin", "parish_admin"))):
    parish_id = body.get("parish_id")
    note = body.get("note", "")
    if not parish_id:
        raise HTTPException(400, "parish_id required")
    parish = await db.parishes.find_one({"id": parish_id})
    if not parish:
        raise HTTPException(404, "Parish not found")
    user = await db.users.find_one({"id": uid})
    if not user:
        raise HTTPException(404, "User not found")
    doc = {
        "id": new_id(),
        "user_id": uid,
        "user_name": user.get("name"),
        "parish_id": parish_id,
        "parish_name": parish.get("name"),
        "endorsed_by": actor["id"],
        "endorser_name": actor.get("name"),
        "note": note,
        "status": "active",
        "created_at": iso(now_utc()),
    }
    await db.shepherd_endorsements.insert_one(doc)
    await db.users.update_one({"id": uid}, {"$addToSet": {"badges": "Shepherd"}, "$set": {"role": "shepherd", "assigned_parish_id": parish_id}})
    await db.parishes.update_one({"id": parish_id}, {"$set": {"shepherd_user_id": uid, "shepherd_name": user.get("name")}})
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "endorse_shepherd", "target": uid,
        "details": {"parish_id": parish_id, "note": note},
        "created_at": iso(now_utc()),
    })
    doc.pop("_id", None)
    return doc


@api.get("/shepherds")
async def list_shepherds(parish_id: Optional[str] = None):
    flt: dict = {"status": "active"}
    if parish_id:
        flt["parish_id"] = parish_id
    items = await db.shepherd_endorsements.find(flt, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.delete("/admin/endorsements/{eid}")
async def revoke_endorsement(eid: str, actor: dict = Depends(require_roles("super_admin"))):
    rec = await db.shepherd_endorsements.find_one({"id": eid})
    if not rec:
        raise HTTPException(404, "Not found")
    await db.shepherd_endorsements.update_one({"id": eid}, {"$set": {"status": "revoked", "revoked_at": iso(now_utc())}})
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "revoke_endorsement", "target": eid,
        "details": {}, "created_at": iso(now_utc()),
    })
    return {"ok": True}


# ====================================================
# MULTI-PARISH ADMIN ASSIGNMENT
# ====================================================
@api.post("/admin/users/{uid}/parishes")
async def assign_parishes(uid: str, body: dict, actor: dict = Depends(require_roles("super_admin"))):
    parish_ids = body.get("parish_ids") or []
    await db.users.update_one({"id": uid}, {"$set": {"managed_parish_ids": parish_ids}})
    await db.audit_logs.insert_one({
        "id": new_id(), "actor_id": actor["id"], "actor_name": actor.get("name"),
        "action": "assign_parishes", "target": uid,
        "details": {"parish_ids": parish_ids}, "created_at": iso(now_utc()),
    })
    return {"ok": True}


# ====================================================
# OBJECT STORAGE — Cloudflare R2 (S3-compatible)
# ====================================================
@api.post("/uploads")
async def upload_file(body: dict, actor: dict = Depends(get_current_user)):
    """Upload base64 payload to R2 if configured, else return data URL."""
    import re as _re
    data_b64 = body.get("data") or ""
    raw_filename = body.get("filename") or f"upload-{new_id()}"
    # sanitize filename: strip path separators, keep alnum + ._-
    safe_filename = _re.sub(r"[^A-Za-z0-9._-]+", "_", raw_filename.split("/")[-1].split("\\")[-1])[:120] or new_id()
    content_type = body.get("content_type") or "application/octet-stream"
    if not data_b64:
        raise HTTPException(400, "data required (base64)")
    try:
        if "," in data_b64:
            data_b64 = data_b64.split(",", 1)[1]
        raw = b64lib.b64decode(data_b64)
    except Exception:
        raise HTTPException(400, "invalid base64 payload")
    # 5MB max for inline; 25MB for R2
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(413, "file too large (max 25MB)")

    account_id = await get_config("cloudflare_r2_account_id")
    access_key = await get_config("cloudflare_r2_access_key_id")
    secret_key = await get_config("cloudflare_r2_secret_access_key")
    bucket = await get_config("cloudflare_r2_bucket")
    public_url = await get_config("cloudflare_r2_public_url")

    if not all([account_id, access_key, secret_key, bucket]):
        # Fallback: return data URL — inline path; cap at 5MB
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(413, "file too large for inline storage (max 5MB); configure R2 for larger files")
        return {"url": f"data:{content_type};base64,{data_b64}", "storage": "inline"}

    try:
        import boto3
        s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",
        )
        key = f"{actor['id']}/{datetime.utcnow().strftime('%Y%m%d')}/{new_id()}-{safe_filename}"
        s3.put_object(Bucket=bucket, Key=key, Body=raw, ContentType=content_type)
        url = f"{public_url.rstrip('/')}/{key}" if public_url else f"https://{account_id}.r2.cloudflarestorage.com/{bucket}/{key}"
        return {"url": url, "key": key, "storage": "r2"}
    except Exception as e:
        log.exception("R2 upload failed")
        raise HTTPException(500, f"upload failed: {e}")


# ====================================================
# PUSH NOTIFICATIONS — VAPID
# ====================================================
@api.post("/push/subscribe")
async def push_subscribe(body: dict, actor: dict = Depends(get_current_user)):
    sub = body.get("subscription")
    if not sub:
        raise HTTPException(400, "subscription required")
    await db.push_subscriptions.update_one(
        {"user_id": actor["id"], "endpoint": sub.get("endpoint")},
        {"$set": {"user_id": actor["id"], "subscription": sub, "endpoint": sub.get("endpoint"), "updated_at": iso(now_utc())}},
        upsert=True,
    )
    return {"ok": True}


@api.post("/push/test")
async def push_test(actor: dict = Depends(get_current_user)):
    """Send a test push to the current user."""
    sent = await _send_push(actor["id"], "CelestialPeopleMeeet", "Push notifications are working ✨")
    return {"ok": sent > 0, "sent": sent}


async def _send_push(user_id: str, title: str, body: str, url: str = "/") -> int:
    priv_pem = await get_config("vapid_private_pem")
    if not priv_pem:
        return 0
    try:
        from pywebpush import webpush, WebPushException
    except Exception:
        return 0
    subs = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    sent = 0
    payload = jsonlib.dumps({"title": title, "body": body, "url": url})
    claims = {"sub": "mailto:noreply@celestialpeoplemeet.com"}
    for s in subs:
        try:
            webpush(subscription_info=s["subscription"], data=payload, vapid_private_key=priv_pem, vapid_claims=claims)
            sent += 1
        except Exception as e:
            log.warning("push failed: %s", e)
    return sent


# ====================================================
# WEBSOCKET — Real-time chat
# ====================================================
ws_connections: Dict[str, Set[WebSocket]] = {}


async def _ws_user_from_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_secret(), algorithms=[JWT_ALGORITHM])
        return await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    except Exception:
        return None


@app.websocket("/api/ws/chat")
async def ws_chat(ws: WebSocket, token: Optional[str] = Query(None)):
    user = await _ws_user_from_token(token)
    if not user:
        await ws.close(code=4401)
        return
    await ws.accept()
    uid = user["id"]
    ws_connections.setdefault(uid, set()).add(ws)
    try:
        while True:
            data = await ws.receive_json()
            to = data.get("to_user_id")
            text = (data.get("body") or "").strip()
            if not to or not text:
                continue
            pair = sorted([uid, to])
            conv_id = f"{pair[0]}__{pair[1]}"
            msg = {
                "id": new_id(),
                "conversation_id": conv_id,
                "from_user_id": uid,
                "from_name": user.get("name", ""),
                "to_user_id": to,
                "body": text,
                "created_at": iso(now_utc()),
            }
            await db.direct_messages.insert_one(dict(msg))
            await db.notifications.insert_one({
                "id": new_id(), "user_id": to, "title": f"New message from {user.get('name', '')}",
                "body": text[:120], "category": "message", "read": False, "created_at": iso(now_utc()),
            })
            # broadcast
            for target in [to, uid]:
                for c in list(ws_connections.get(target, [])):
                    try:
                        await c.send_json(msg)
                    except Exception:
                        ws_connections[target].discard(c)
            # async push
            await _send_push(to, f"{user.get('name', 'Someone')} messaged you", text[:120], "/app/messages")
    except WebSocketDisconnect:
        pass
    finally:
        ws_connections.get(uid, set()).discard(ws)


# ---------------- Seed ----------------
DEFAULT_RANKS = [
    "Brother", "Sister", "Evangelist", "Senior Evangelist",
    "Leader", "Senior Leader", "Most Senior Leader",
    "Assistant Shepherd", "Shepherd", "Senior Shepherd",
    "Wolikan", "Prophet", "Prophetess", "Wolijah",
    "Youth Leader", "Choir Master", "Sunday School Teacher",
]
DEFAULT_BADGES = [
    {"label": "Verified Choir", "meta": {"slug": "verified_choir", "color": "#C5A028"}},
    {"label": "Shepherd", "meta": {"slug": "shepherd", "color": "#0F1E38"}},
    {"label": "Parish Admin", "meta": {"slug": "parish_admin", "color": "#1E3A8A"}},
    {"label": "Evangelist", "meta": {"slug": "evangelist", "color": "#166534"}},
    {"label": "Youth Leader", "meta": {"slug": "youth_leader", "color": "#9A3412"}},
    {"label": "Sunday School Teacher", "meta": {"slug": "sunday_school", "color": "#2A456C"}},
]
DEFAULT_EVENT_CATEGORIES = ["Sunday Worship", "Bible Class", "Sunday School", "Choir Rehearsal", "Revival", "Harvest", "Vigil", "Convention"]
DEFAULT_SERVICE_TYPES = ["Ushering", "Choir", "Media & Tech", "Sunday School Teaching", "Welfare", "Sanitation", "Evangelism", "Security"]
DEFAULT_PRAYER_CATEGORIES = ["Health", "Family", "Career", "Travel", "Thanksgiving", "Spiritual Growth", "Nation", "Other"]
DEFAULT_JOB_CATEGORIES = ["Technology", "Education", "Healthcare", "Ministry", "Finance", "Trades", "Hospitality", "Other"]
DEFAULT_REPORT_REASONS = ["Spam", "Harassment", "Hate Speech", "Misinformation", "Inappropriate Content", "Other"]
DEFAULT_LIVESTREAM_PROVIDERS = ["YouTube", "Facebook", "Instagram", "TikTok", "Custom"]

SAMPLE_PARISHES = [
    {"name": "CCC Bethel Parish, Lagos", "country": "Nigeria", "city": "Lagos", "address": "12 Surulere Avenue, Lagos", "shepherd_name": "Snr Evang. Adekunle", "phone": "+234 800 000 0001", "service_times": "Sun 9am, Wed 6pm", "description": "A vibrant parish in central Lagos.", "join_mode": "open", "status": "active"},
    {"name": "CCC Mount of Mercy Parish, Abuja", "country": "Nigeria", "city": "Abuja", "address": "5 Wuse II Road, Abuja", "shepherd_name": "Shepherd Ola", "phone": "+234 800 000 0002", "service_times": "Sun 9am, Fri 7pm", "description": "Calm worship community in the capital.", "join_mode": "open", "status": "active"},
    {"name": "CCC Cotonou Central Parish", "country": "Benin", "city": "Cotonou", "address": "Avenue Steinmetz, Cotonou", "shepherd_name": "Evang. Houngbedji", "phone": "+229 21 00 00 03", "service_times": "Sun 9am", "description": "Historic parish near the founding city of CCC.", "join_mode": "open", "status": "active"},
    {"name": "CCC Brooklyn Parish", "country": "United States", "city": "New York", "address": "Atlantic Ave, Brooklyn, NY", "shepherd_name": "Snr Shep. Bamidele", "phone": "+1 718 000 0004", "service_times": "Sun 10am", "description": "Diaspora parish in the heart of Brooklyn.", "join_mode": "open", "status": "active"},
    {"name": "CCC Peckham Parish", "country": "United Kingdom", "city": "London", "address": "Rye Lane, Peckham, London", "shepherd_name": "Shep. Akinwale", "phone": "+44 20 0000 0005", "service_times": "Sun 11am", "description": "Long-established UK parish.", "join_mode": "open", "status": "active"},
    {"name": "CCC Toronto Parish", "country": "Canada", "city": "Toronto", "address": "Eglinton Ave W, Toronto", "shepherd_name": "Evang. Adebayo", "phone": "+1 416 000 0006", "service_times": "Sun 10am", "description": "Welcoming Canadian parish for diaspora.", "join_mode": "open", "status": "active"},
]


async def _ensure_setting(key: str, label: str, order: int, meta: Optional[dict] = None):
    existing = await db.admin_settings.find_one({"key": key, "label": label})
    if existing:
        return
    await db.admin_settings.insert_one({
        "id": new_id(), "key": key, "label": label, "order": order,
        "active": True, "meta": meta or {}, "description": "",
        "created_at": iso(now_utc()),
    })


async def _ensure_user(email: str, password: str, name: str, role: str, **extra):
    u = await db.users.find_one({"email": email})
    if u:
        # keep password fresh
        if not verify_password(password, u.get("password_hash", "")):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": role}})
        return u["id"]
    uid = new_id()
    await db.users.insert_one({
        "id": uid, "email": email, "password_hash": hash_password(password),
        "name": name, "role": role, "ccc_rank": extra.get("ccc_rank", ""),
        "country": extra.get("country", ""), "city": extra.get("city", ""),
        "interested_in_choir": extra.get("choir", False),
        "profile_summary": extra.get("summary", ""),
        "avatar": "", "badges": extra.get("badges", []), "follow_count": 0,
        "created_at": iso(now_utc()),
    })
    return uid


async def _ensure_parish(p: dict) -> str:
    existing = await db.parishes.find_one({"name": p["name"]})
    if existing:
        # Patch join_mode and status if missing or request_only on existing seeded parishes
        updates = {}
        if not existing.get("join_mode") or existing.get("join_mode") == "request_only":
            updates["join_mode"] = p.get("join_mode", "open")
        if not existing.get("status"):
            updates["status"] = "active"
        if updates:
            await db.parishes.update_one({"id": existing["id"]}, {"$set": updates})
        return existing["id"]
    pid = new_id()
    doc = {**p, "id": pid, "status": p.get("status", "active"), "join_mode": p.get("join_mode", "open"), "livestream_url": "", "created_at": iso(now_utc()), "created_by": "seed"}
    await db.parishes.insert_one(doc)
    return pid


@app.on_event("startup")
async def on_startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.parishes.create_index("id", unique=True)
    await db.parish_memberships.create_index([("user_id", 1), ("parish_id", 1)])
    await db.feed_posts.create_index([("scope", 1), ("parish_id", 1), ("created_at", -1)])
    await db.prayer_requests.create_index([("scope", 1), ("parish_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    # seed settings
    for i, r in enumerate(DEFAULT_RANKS):
        await _ensure_setting("ccc_ranks", r, i)
    for i, b in enumerate(DEFAULT_BADGES):
        await _ensure_setting("badges", b["label"], i, b["meta"])
    for i, e in enumerate(DEFAULT_EVENT_CATEGORIES):
        await _ensure_setting("event_categories", e, i)
    for i, s in enumerate(DEFAULT_SERVICE_TYPES):
        await _ensure_setting("service_types", s, i)
    for i, p in enumerate(DEFAULT_PRAYER_CATEGORIES):
        await _ensure_setting("prayer_categories", p, i)
    for i, j in enumerate(DEFAULT_JOB_CATEGORIES):
        await _ensure_setting("job_categories", j, i)
    for i, r in enumerate(DEFAULT_REPORT_REASONS):
        await _ensure_setting("report_reasons", r, i)
    for i, lp in enumerate(DEFAULT_LIVESTREAM_PROVIDERS):
        await _ensure_setting("livestream_providers", lp, i, {"slug": lp.lower()})

    # seed parish join rule defaults (stored as integration_config)
    join_rule_defaults = [
        {"label": "global_join_mode", "meta": {"value": "per_parish"}, "description": "per_parish | open | location_based | request_only"},
        {"label": "max_parish_memberships", "meta": {"value": "2"}, "description": "Maximum active + pending memberships per user"},
        {"label": "join_state_match_required", "meta": {"value": "false"}, "description": "Require state match for location_based join (true|false)"},
    ]
    for jrd in join_rule_defaults:
        await _ensure_setting("integration_config", jrd["label"], 0, jrd["meta"])

    # seed parishes + migrate any existing parishes missing join_mode
    parish_ids = []
    for p in SAMPLE_PARISHES:
        pid = await _ensure_parish(p)
        parish_ids.append(pid)
    # Ensure ALL existing parishes have join_mode set to open if unset or request_only
    await db.parishes.update_many(
        {"$or": [{"join_mode": {"$exists": False}}, {"join_mode": "request_only"}, {"join_mode": ""}]},
        {"$set": {"join_mode": "open"}}
    )

    # Migrate orphaned onboarding joins from wrong collection → parish_memberships (approved)
    orphaned_reqs = await db.parish_membership_requests.find(
        {"note": "Onboarding request"}, {"_id": 0}
    ).to_list(None)
    migrated_count = 0
    for req in orphaned_reqs:
        exists = await db.parish_memberships.find_one(
            {"user_id": req["user_id"], "parish_id": req["parish_id"]}
        )
        if not exists:
            await db.parish_memberships.insert_one({
                "id": req.get("id", new_id()),
                "user_id": req["user_id"],
                "parish_id": req["parish_id"],
                "status": "approved",
                "approved_at": req.get("created_at", iso(now_utc())),
                "note": "Migrated from onboarding request",
                "join_mode_used": "onboarding_migrated",
                "created_at": req.get("created_at", iso(now_utc())),
            })
            migrated_count += 1
    if migrated_count:
        print(f"[startup] Migrated {migrated_count} orphaned onboarding parish joins to approved memberships")

    # Auto-approve pending memberships for open parishes (not invite_only)
    # Ensures no user is stuck waiting for admin approval on open-join parishes
    stale_pending = await db.parish_memberships.find({"status": "pending"}, {"_id": 0}).to_list(None)
    auto_approved_count = 0
    for sp in stale_pending:
        sp_parish = await db.parishes.find_one({"id": sp["parish_id"]}, {"_id": 0})
        if sp_parish and sp_parish.get("join_mode", "open") != "invite_only":
            await db.parish_memberships.update_one(
                {"id": sp["id"]},
                {"$set": {"status": "approved", "approved_at": iso(now_utc()), "join_mode_used": sp_parish.get("join_mode", "open")}}
            )
            auto_approved_count += 1
    if auto_approved_count:
        print(f"[startup] Auto-approved {auto_approved_count} pending memberships for open parishes")

    # seed users
    admin_email = os.environ["ADMIN_EMAIL"]
    admin_password = os.environ["ADMIN_PASSWORD"]
    admin_name = os.environ.get("ADMIN_NAME", "Super Admin")
    await _ensure_user(admin_email, admin_password, admin_name, "super_admin", ccc_rank="Senior Shepherd", country="Nigeria", city="Lagos", summary="Platform administrator.")

    pa_id = await _ensure_user("parishadmin@celestialpeoplemeet.com", "Parish@2026", "Adekunle Bamidele", "parish_admin", ccc_rank="Shepherd", country="Nigeria", city="Lagos", summary="Shepherd in charge of Bethel Parish, Lagos.")
    member_id = await _ensure_user("member@celestialpeoplemeet.com", "Member@2026", "Joy Adewale", "member", ccc_rank="Sister", country="Nigeria", city="Lagos", choir=True, summary="Choir soprano. Loves prayer and worship.")

    # ensure member auto-joined to a parish for nice demo
    if parish_ids:
        existing_m = await db.parish_memberships.find_one({"user_id": member_id, "parish_id": parish_ids[0]})
        if not existing_m:
            await db.parish_memberships.insert_one({
                "id": new_id(), "user_id": member_id, "parish_id": parish_ids[0],
                "status": "approved", "approved_at": iso(now_utc()), "created_at": iso(now_utc()),
            })
        existing_pa = await db.parish_memberships.find_one({"user_id": pa_id, "parish_id": parish_ids[0]})
        if not existing_pa:
            await db.parish_memberships.insert_one({
                "id": new_id(), "user_id": pa_id, "parish_id": parish_ids[0],
                "status": "approved", "approved_at": iso(now_utc()), "created_at": iso(now_utc()),
            })

    # Seed AI / daily-posts config keys (no-op if already set)
    ai_defaults = [
        {"label": "ai_provider",         "value": "groq",  "description": "AI provider: groq (free), mistral, together, ollama, openai"},
        {"label": "ai_api_key",           "value": "",      "description": "API key for the chosen AI provider (free Groq key from console.groq.com)"},
        {"label": "ai_model",             "value": "",      "description": "Model override (leave blank to use provider default e.g. llama-3.3-70b-versatile)"},
        {"label": "ai_base_url",          "value": "",      "description": "Base URL override (leave blank to use provider default)"},
        {"label": "daily_posts_enabled",  "value": "false", "description": "Set to 'true' to enable automatic daily devotion/prayer/verse/music posts"},
    ]
    for ai in ai_defaults:
        if not await get_config(ai["label"]):
            await set_config(ai["label"], ai["value"], ai["description"])

    # Start daily post background scheduler
    import asyncio as _asyncio
    _asyncio.create_task(_daily_post_loop())

    log.info("CelestialPeopleMeeet startup complete: %d parishes, settings seeded", len(parish_ids))


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

# CORS configuration — explicit production origins + preview + localhost
CORS_DEFAULT = "https://celestialpeoplemeet.com,https://www.celestialpeoplemeet.com,http://localhost:3000"
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", CORS_DEFAULT).split(",") if o.strip()]
_wildcard = "*" in _cors_origins
if _wildcard:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "celestialpeoplemeeet"}
