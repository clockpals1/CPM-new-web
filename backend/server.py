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
    "integration_config", "livestream_providers",
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
        masked = v if it["label"] in {"resend_from_email", "google_maps_api_key_public", "vapid_public_key", "cloudflare_r2_public_url", "cloudflare_r2_bucket"} else (("…" + v[-4:]) if v else "")
        it["masked_value"] = masked
        it["has_value"] = bool(v)
        # remove raw value from response unless it's a public field
        if it["label"] not in {"resend_from_email", "google_maps_api_key_public", "vapid_public_key", "cloudflare_r2_public_url", "cloudflare_r2_bucket"}:
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
    from_addr = await get_config("resend_from_email") or "CelestialPeopleMeeet <noreply@celestialpeoplemeeet.com>"
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
    claims = {"sub": "mailto:noreply@celestialpeoplemeeet.com"}
    for s in subs:
        try:
            webpush(subscription_info=s["subscription"], data=payload, vapid_private_key=priv_pem, vapid_claims=claims)
            sent += 1
        except Exception as e:
            log.warning("push failed: %s", e)
    return sent


@app.on_event("startup")
async def on_startup():
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

# CORS configuration — explicit production origins + preview + localhost
CORS_DEFAULT = "https://celestialpeoplemeeet.com,https://www.celestialpeoplemeeet.com,https://3b978f91-ae08-4645-8ab8-6873e3146af0.preview.emergentagent.com,http://localhost:3000"
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
