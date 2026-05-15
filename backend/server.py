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
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
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
    ccc_rank: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    parish_id: Optional[str] = None
    parish_request: Optional[str] = None
    interested_in_choir: Optional[bool] = False
    profile_summary: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class ParishIn(BaseModel):
    name: str
    country: str
    city: str
    address: Optional[str] = ""
    shepherd_name: Optional[str] = ""
    phone: Optional[str] = ""
    service_times: Optional[str] = ""
    livestream_url: Optional[str] = ""
    description: Optional[str] = ""
    status: Optional[str] = "active"


class SettingItemIn(BaseModel):
    key: str  # category key e.g. ccc_ranks, badges, event_categories
    label: str
    description: Optional[str] = ""
    order: Optional[int] = 0
    active: Optional[bool] = True
    meta: Optional[dict] = {}


class PostIn(BaseModel):
    body: str
    media: Optional[List[str]] = []  # base64 strings
    scope: Literal["parish", "global"] = "parish"
    parish_id: Optional[str] = None
    visibility: Optional[str] = "members"  # members, announcement, leaders


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

    # Optional parish join request from onboarding
    if req.parish_id:
        await db.parish_membership_requests.insert_one({
            "id": new_id(),
            "user_id": user_id,
            "parish_id": req.parish_id,
            "status": "pending",
            "note": "Onboarding request",
            "created_at": iso(now_utc()),
        })
    if req.parish_request and not req.parish_id:
        await db.parish_suggestions.insert_one({
            "id": new_id(),
            "user_id": user_id,
            "suggestion": req.parish_request,
            "country": req.country,
            "city": req.city,
            "status": "pending",
            "created_at": iso(now_utc()),
        })

    token = create_access_token(user_id, email, "member")
    set_auth_cookie(response, token)
    doc.pop("password_hash", None)
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
async def list_parishes(q: Optional[str] = None, country: Optional[str] = None, city: Optional[str] = None, limit: int = 200):
    flt: dict = {}
    if country:
        flt["country"] = {"$regex": f"^{country}$", "$options": "i"}
    if city:
        flt["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if q:
        flt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}},
            {"shepherd_name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
        ]
    items = await db.parishes.find(flt, {"_id": 0}).limit(limit).to_list(limit)
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


# ---------------- Memberships ----------------
@api.get("/me/memberships")
async def my_memberships(user: dict = Depends(get_current_user)):
    items = await db.parish_memberships.find({"user_id": user["id"], "status": "approved"}, {"_id": 0}).to_list(10)
    # join parish info
    out = []
    for m in items:
        p = await db.parishes.find_one({"id": m["parish_id"]}, {"_id": 0})
        out.append({**m, "parish": p})
    return out


@api.post("/memberships/request")
async def request_membership(body: MembershipReqIn, user: dict = Depends(get_current_user)):
    active = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "approved"})
    pending = await db.parish_memberships.count_documents({"user_id": user["id"], "status": "pending"})
    if active + pending >= 2:
        raise HTTPException(400, "Maximum of 2 parish memberships allowed")
    existing = await db.parish_memberships.find_one({"user_id": user["id"], "parish_id": body.parish_id, "status": {"$in": ["pending", "approved"]}})
    if existing:
        raise HTTPException(400, "Already requested or member")
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "parish_id": body.parish_id,
        "status": "pending",
        "note": body.note,
        "created_at": iso(now_utc()),
    }
    await db.parish_memberships.insert_one(doc)
    doc.pop("_id", None)
    return doc


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
    active = await db.parish_memberships.count_documents({"user_id": m["user_id"], "status": "approved"})
    if active >= 2:
        raise HTTPException(400, "User already at 2 parish memberships")
    await db.parish_memberships.update_one({"id": mid}, {"$set": {"status": "approved", "approved_at": iso(now_utc())}})
    await db.notifications.insert_one({
        "id": new_id(), "user_id": m["user_id"], "title": "Parish membership approved",
        "body": "You have been approved to join the parish.", "category": "membership",
        "read": False, "created_at": iso(now_utc()),
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
    items = await db.feed_posts.find(flt, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return items


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
        return {"ok": True}
    await db.event_attendance.insert_one({"id": new_id(), "event_id": eid, "user_id": user["id"], "user_name": user.get("name"), "created_at": iso(now_utc())})
    return {"ok": True}


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
    msgs = await db.direct_messages.find({"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    convs: dict = {}
    for m in msgs:
        cid = m["conversation_id"]
        if cid not in convs:
            other_id = m["to_user_id"] if m["from_user_id"] == user["id"] else m["from_user_id"]
            convs[cid] = {"conversation_id": cid, "other_user_id": other_id, "last": m, "messages": []}
        convs[cid]["messages"].append(m)
    return list(convs.values())


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
async def admin_update_user(uid: str, body: dict, user: dict = Depends(require_roles("super_admin"))):
    body.pop("password_hash", None); body.pop("_id", None); body.pop("id", None)
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


# ---------------- Audit Log ----------------
@api.get("/admin/audit-logs")
async def audit_logs(actor: dict = Depends(require_roles("super_admin"))):
    return await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)


@api.get("/admin/parish-suggestions")
async def parish_suggestions(user: dict = Depends(require_roles("super_admin"))):
    return await db.parish_suggestions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ---------------- Home Stats ----------------
@api.get("/stats/home")
async def home_stats():
    return {
        "parishes": await db.parishes.count_documents({}),
        "members": await db.users.count_documents({}),
        "prayers": await db.prayer_requests.count_documents({}),
        "events": await db.events.count_documents({}),
    }


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

SAMPLE_PARISHES = [
    {"name": "CCC Bethel Parish, Lagos", "country": "Nigeria", "city": "Lagos", "address": "12 Surulere Avenue, Lagos", "shepherd_name": "Snr Evang. Adekunle", "phone": "+234 800 000 0001", "service_times": "Sun 9am, Wed 6pm", "description": "A vibrant parish in central Lagos."},
    {"name": "CCC Mount of Mercy Parish, Abuja", "country": "Nigeria", "city": "Abuja", "address": "5 Wuse II Road, Abuja", "shepherd_name": "Shepherd Ola", "phone": "+234 800 000 0002", "service_times": "Sun 9am, Fri 7pm", "description": "Calm worship community in the capital."},
    {"name": "CCC Cotonou Central Parish", "country": "Benin", "city": "Cotonou", "address": "Avenue Steinmetz, Cotonou", "shepherd_name": "Evang. Houngbedji", "phone": "+229 21 00 00 03", "service_times": "Sun 9am", "description": "Historic parish near the founding city of CCC."},
    {"name": "CCC Brooklyn Parish", "country": "United States", "city": "New York", "address": "Atlantic Ave, Brooklyn, NY", "shepherd_name": "Snr Shep. Bamidele", "phone": "+1 718 000 0004", "service_times": "Sun 10am", "description": "Diaspora parish in the heart of Brooklyn."},
    {"name": "CCC Peckham Parish", "country": "United Kingdom", "city": "London", "address": "Rye Lane, Peckham, London", "shepherd_name": "Shep. Akinwale", "phone": "+44 20 0000 0005", "service_times": "Sun 11am", "description": "Long-established UK parish."},
    {"name": "CCC Toronto Parish", "country": "Canada", "city": "Toronto", "address": "Eglinton Ave W, Toronto", "shepherd_name": "Evang. Adebayo", "phone": "+1 416 000 0006", "service_times": "Sun 10am", "description": "Welcoming Canadian parish for diaspora."},
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
        return existing["id"]
    pid = new_id()
    doc = {**p, "id": pid, "status": "active", "livestream_url": "", "created_at": iso(now_utc()), "created_by": "seed"}
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

    # seed parishes
    parish_ids = []
    for p in SAMPLE_PARISHES:
        pid = await _ensure_parish(p)
        parish_ids.append(pid)

    # seed users
    admin_email = os.environ["ADMIN_EMAIL"]
    admin_password = os.environ["ADMIN_PASSWORD"]
    admin_name = os.environ.get("ADMIN_NAME", "Super Admin")
    await _ensure_user(admin_email, admin_password, admin_name, "super_admin", ccc_rank="Senior Shepherd", country="Nigeria", city="Lagos", summary="Platform administrator.")

    pa_id = await _ensure_user("parishadmin@celestialpeoplemeeet.com", "Parish@2026", "Adekunle Bamidele", "parish_admin", ccc_rank="Shepherd", country="Nigeria", city="Lagos", summary="Shepherd in charge of Bethel Parish, Lagos.")
    member_id = await _ensure_user("member@celestialpeoplemeeet.com", "Member@2026", "Joy Adewale", "member", ccc_rank="Sister", country="Nigeria", city="Lagos", choir=True, summary="Choir soprano. Loves prayer and worship.")

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

    log.info("CelestialPeopleMeeet startup complete: %d parishes, settings seeded", len(parish_ids))


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

# CORS configuration — single middleware, reflects origin for credentials
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "celestialpeoplemeeet"}
