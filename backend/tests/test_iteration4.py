"""Iteration 4 - new backend endpoints regression tests.

Covers:
- Integrations (super_admin only + public)
- Password reset (forgot/reset)
- Shepherd endorsement + revoke
- Multi-parish admin assignment
- Uploads (inline fallback when R2 not configured)
- Push (subscribe + test)
- WebSocket chat (/api/ws/chat)
- CORS explicit origins behavior

Run: pytest /app/backend/tests/test_iteration4.py -v --tb=short
"""
import os
import json
import asyncio
import base64
import time
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")

SUPER = ("sunday@isunday.me", "Gpiner0@12")
PADMIN = ("parishadmin@celestialpeoplemeeet.com", "Parish@2026")
MEMBER = ("member@celestialpeoplemeeet.com", "Member@2026")


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json(), r.cookies.get("access_token")


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"} if tok else {}


def assert_no_id(obj):
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leak: {obj}"
        for v in obj.values():
            assert_no_id(v)
    elif isinstance(obj, list):
        for v in obj:
            assert_no_id(v)


@pytest.fixture(scope="module")
def super_tok():
    _, t = login(*SUPER)
    return t


@pytest.fixture(scope="module")
def padmin_tok():
    _, t = login(*PADMIN)
    return t


@pytest.fixture(scope="module")
def member_tok():
    _, t = login(*MEMBER)
    return t


@pytest.fixture(scope="module")
def super_user(super_tok):
    r = requests.get(f"{API}/auth/me", headers=hdr(super_tok), timeout=20)
    assert r.status_code == 200
    return r.json()


# ==================== SUPER ADMIN LOGIN ROLE ====================
class TestSuperAdminLogin:
    def test_sunday_super_admin_role(self):
        body, tok = login(*SUPER)
        assert body["role"] == "super_admin"
        assert body["email"] == "sunday@isunday.me"
        assert tok is not None


# ==================== INTEGRATIONS ====================
class TestIntegrations:
    def test_list_requires_super(self, member_tok):
        r = requests.get(f"{API}/integrations", headers=hdr(member_tok), timeout=15)
        assert r.status_code == 403

    def test_list_super(self, super_tok):
        r = requests.get(f"{API}/integrations", headers=hdr(super_tok), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert_no_id(data)
        # each item should have has_value + masked_value fields
        for it in data:
            assert "has_value" in it
            assert "masked_value" in it
            assert "label" in it

    def test_set_public_label_unmasked(self, super_tok):
        # Set public 'resend_from_email' value
        r = requests.post(
            f"{API}/integrations",
            json={"label": "resend_from_email", "value": "test@example.com", "description": "Test from address"},
            headers=hdr(super_tok),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # GET back should show has_value=true and full value (public label)
        r2 = requests.get(f"{API}/integrations", headers=hdr(super_tok), timeout=15)
        items = r2.json()
        match = next((i for i in items if i["label"] == "resend_from_email"), None)
        assert match is not None
        assert match["has_value"] is True
        # public label so meta.value is preserved (not blanked)
        assert match.get("meta", {}).get("value") == "test@example.com"
        assert match["masked_value"] == "test@example.com"

    def test_set_secret_label_masked(self, super_tok):
        # Set secret-ish 'resend_api_key' — should be masked in listing
        r = requests.post(
            f"{API}/integrations",
            json={"label": "resend_api_key", "value": "re_test_1234567890ABCD"},
            headers=hdr(super_tok),
            timeout=15,
        )
        assert r.status_code == 200
        r2 = requests.get(f"{API}/integrations", headers=hdr(super_tok), timeout=15)
        items = r2.json()
        match = next((i for i in items if i["label"] == "resend_api_key"), None)
        assert match is not None
        assert match["has_value"] is True
        assert match["masked_value"].endswith("ABCD")
        # raw value blanked in response
        assert match.get("meta", {}).get("value") == ""

    def test_public_integrations_unauth(self):
        r = requests.get(f"{API}/integrations/public", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "google_maps_api_key_public" in data
        assert "vapid_public_key" in data
        assert "cloudflare_r2_public_url" in data

    def test_vapid_auto_generate(self, super_tok):
        r = requests.post(f"{API}/integrations/test/vapid", json={}, headers=hdr(super_tok), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        # public key returned
        assert "public_key" in data and data["public_key"]
        pub = data["public_key"]
        # subsequent public endpoint exposes it
        r2 = requests.get(f"{API}/integrations/public", timeout=15)
        assert r2.json().get("vapid_public_key") == pub

    def test_resend_fallback_no_key(self, super_tok):
        # First, blank out the resend_api_key
        requests.post(
            f"{API}/integrations",
            json={"label": "resend_api_key", "value": ""},
            headers=hdr(super_tok),
            timeout=15,
        )
        r = requests.post(
            f"{API}/integrations/test/resend",
            json={"to": "test@example.com"},
            headers=hdr(super_tok),
            timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "logged" in data.get("message", "").lower()

    def test_resend_bad_key_fails(self, super_tok):
        # Set a bad key
        requests.post(
            f"{API}/integrations",
            json={"label": "resend_api_key", "value": "re_bogus_invalid_key"},
            headers=hdr(super_tok),
            timeout=15,
        )
        r = requests.post(
            f"{API}/integrations/test/resend",
            json={"to": "test@example.com"},
            headers=hdr(super_tok),
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is False

        # cleanup: clear bad key
        requests.post(
            f"{API}/integrations",
            json={"label": "resend_api_key", "value": ""},
            headers=hdr(super_tok),
            timeout=15,
        )


# ==================== PASSWORD RESET ====================
class TestPasswordReset:
    def test_forgot_unknown_email_silent(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "nonexistent_xyz_TEST@example.com"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_full_reset_flow(self, super_tok):
        # Create a throwaway user via /auth/register
        unique = f"test_pwreset_{int(time.time())}@example.com"
        original_pw = "OriginalPass1"
        new_pw = "NewSecurePass2"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": unique, "password": original_pw, "name": "PW Reset Test"},
            timeout=15,
        )
        assert r.status_code == 200, r.text

        # Request reset
        r2 = requests.post(f"{API}/auth/forgot-password", json={"email": unique}, timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("ok") is True

        # Fetch reset token from DB via mongo client
        from pymongo import MongoClient
        m = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = m[os.environ.get("DB_NAME", "celestialpeople_db")]
        user = db.users.find_one({"email": unique})
        assert user, "User not in DB"
        tok_rec = db.password_reset_tokens.find_one(
            {"user_id": user["id"], "used": False},
            sort=[("created_at", -1)],
        )
        assert tok_rec, "No reset token record"
        token = tok_rec["token"]
        m.close()

        # Reset password
        r3 = requests.post(
            f"{API}/auth/reset-password",
            json={"token": token, "password": new_pw},
            timeout=15,
        )
        assert r3.status_code == 200, r3.text
        assert r3.json().get("ok") is True

        # Old password should fail
        r4 = requests.post(f"{API}/auth/login", json={"email": unique, "password": original_pw}, timeout=15)
        assert r4.status_code == 401

        # New password should succeed
        r5 = requests.post(f"{API}/auth/login", json={"email": unique, "password": new_pw}, timeout=15)
        assert r5.status_code == 200

        # Token cannot be reused
        r6 = requests.post(
            f"{API}/auth/reset-password",
            json={"token": token, "password": "AnotherPass3"},
            timeout=15,
        )
        assert r6.status_code == 400

    def test_invalid_token(self):
        r = requests.post(
            f"{API}/auth/reset-password",
            json={"token": "totally-bogus-token-xyz", "password": "Whatever1"},
            timeout=15,
        )
        assert r.status_code == 400


# ==================== SHEPHERD ENDORSEMENT ====================
class TestShepherdEndorsement:
    def test_endorse_member(self, super_tok, padmin_tok):
        # Get a parish to use
        rp = requests.get(f"{API}/parishes", timeout=15)
        parishes = rp.json()
        assert parishes
        parish_id = parishes[0]["id"]

        # Create dedicated throwaway user
        unique = f"TEST_shep_{int(time.time())}@example.com"
        rr = requests.post(
            f"{API}/auth/register",
            json={"email": unique, "password": "ShepPass1", "name": "TEST Shepherd Candidate"},
            timeout=15,
        )
        assert rr.status_code == 200
        uid = rr.json()["id"]

        # Endorse
        r = requests.post(
            f"{API}/admin/users/{uid}/endorse-shepherd",
            json={"parish_id": parish_id, "note": "iteration4 test"},
            headers=hdr(super_tok),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        endorsement = r.json()
        assert_no_id(endorsement)
        assert endorsement["status"] == "active"
        assert endorsement["user_id"] == uid
        assert endorsement["parish_id"] == parish_id
        eid = endorsement["id"]

        # User's role updated + badge added
        ru = requests.get(f"{API}/admin/users", headers=hdr(super_tok), timeout=15)
        assert ru.status_code == 200
        users = ru.json()
        u = next((x for x in users if x["id"] == uid), None)
        assert u is not None, "User not in admin list"
        assert u["role"] == "shepherd"
        assert "Shepherd" in (u.get("badges") or [])

        # Parish updated
        rpid = requests.get(f"{API}/parishes/{parish_id}", timeout=15)
        assert rpid.status_code == 200
        p = rpid.json()
        # shepherd_user_id may be uid (most recent endorsement wins)
        # other endorsements may have run earlier in this test session; accept either
        # but we definitely expect shepherd_user_id is non-empty
        assert p.get("shepherd_user_id"), "shepherd_user_id not set on parish"

        # Public /shepherds list contains this endorsement
        rs = requests.get(f"{API}/shepherds?parish_id={parish_id}", timeout=15)
        assert rs.status_code == 200
        shepherds = rs.json()
        assert_no_id(shepherds)
        match = next((s for s in shepherds if s["id"] == eid), None)
        assert match is not None, "New endorsement not in /shepherds list"

        # Audit log entry created
        ra = requests.get(f"{API}/admin/audit-logs", headers=hdr(super_tok), timeout=15)
        assert ra.status_code == 200
        logs = ra.json()
        assert any(l.get("action") == "endorse_shepherd" and l.get("target") == uid for l in logs)

        # Revoke endorsement
        rd = requests.delete(f"{API}/admin/endorsements/{eid}", headers=hdr(super_tok), timeout=15)
        assert rd.status_code == 200
        assert rd.json().get("ok") is True

        # Revoked endorsement excluded from /shepherds
        rs2 = requests.get(f"{API}/shepherds?parish_id={parish_id}", timeout=15)
        shepherds2 = rs2.json()
        assert all(s["id"] != eid for s in shepherds2), "Revoked endorsement still in /shepherds"

        # Audit log includes revoke
        ra2 = requests.get(f"{API}/admin/audit-logs", headers=hdr(super_tok), timeout=15)
        logs2 = ra2.json()
        assert any(l.get("action") == "revoke_endorsement" and l.get("target") == eid for l in logs2)

    def test_revoke_requires_super(self, padmin_tok):
        # Forge an arbitrary id - should still be 403 before 404 if role check is first
        r = requests.delete(f"{API}/admin/endorsements/nonexistent", headers=hdr(padmin_tok), timeout=15)
        assert r.status_code == 403


# ==================== MULTI-PARISH ADMIN ASSIGNMENT ====================
class TestMultiParishAssignment:
    def test_assign_parishes(self, super_tok):
        # Create throwaway user
        unique = f"TEST_mpa_{int(time.time())}@example.com"
        rr = requests.post(
            f"{API}/auth/register",
            json={"email": unique, "password": "Mpa12345", "name": "TEST MPA"},
            timeout=15,
        )
        uid = rr.json()["id"]

        rp = requests.get(f"{API}/parishes", timeout=15)
        parishes = rp.json()
        assert len(parishes) >= 2
        pids = [parishes[0]["id"], parishes[1]["id"]]

        r = requests.post(
            f"{API}/admin/users/{uid}/parishes",
            json={"parish_ids": pids},
            headers=hdr(super_tok),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # Verify via direct DB
        from pymongo import MongoClient
        m = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = m[os.environ.get("DB_NAME", "celestialpeople_db")]
        user = db.users.find_one({"id": uid})
        assert user.get("managed_parish_ids") == pids
        m.close()

        # Audit log
        ra = requests.get(f"{API}/admin/audit-logs", headers=hdr(super_tok), timeout=15)
        logs = ra.json()
        assert any(l.get("action") == "assign_parishes" and l.get("target") == uid for l in logs)

    def test_assign_requires_super(self, padmin_tok):
        r = requests.post(
            f"{API}/admin/users/bogus/parishes",
            json={"parish_ids": []},
            headers=hdr(padmin_tok),
            timeout=15,
        )
        assert r.status_code == 403


# ==================== UPLOADS ====================
class TestUploads:
    def test_upload_inline_fallback(self, super_tok):
        # Ensure R2 not configured (clear bucket if any)
        # We don't clobber existing config — just check current state
        rconf = requests.get(f"{API}/integrations", headers=hdr(super_tok), timeout=15)
        items = rconf.json()
        r2_bucket = next((i for i in items if i["label"] == "cloudflare_r2_bucket"), None)
        r2_configured = r2_bucket and r2_bucket.get("has_value")

        payload = base64.b64encode(b"hello world").decode("utf-8")
        r = requests.post(
            f"{API}/uploads",
            json={"content_type": "text/plain", "filename": "hello.txt", "data": payload},
            headers=hdr(super_tok),
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        if not r2_configured:
            assert data.get("storage") == "inline"
            assert data["url"].startswith("data:text/plain;base64,")
        else:
            # R2 configured live — skip deep check
            assert "url" in data

    def test_upload_requires_auth(self):
        payload = base64.b64encode(b"x").decode()
        r = requests.post(
            f"{API}/uploads",
            json={"content_type": "text/plain", "filename": "x.txt", "data": payload},
            timeout=15,
        )
        assert r.status_code == 401

    def test_upload_bad_base64(self, super_tok):
        r = requests.post(
            f"{API}/uploads",
            json={"content_type": "text/plain", "filename": "bad.txt", "data": "@@@notb64@@@"},
            headers=hdr(super_tok),
            timeout=15,
        )
        assert r.status_code == 400


# ==================== PUSH ====================
class TestPush:
    def test_subscribe_and_test(self, member_tok):
        sub = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_endpoint_xyz",
            "keys": {"p256dh": "TEST_p256dh", "auth": "TEST_auth"},
        }
        r = requests.post(
            f"{API}/push/subscribe",
            json={"subscription": sub},
            headers=hdr(member_tok),
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Test push
        r2 = requests.post(f"{API}/push/test", headers=hdr(member_tok), timeout=20)
        assert r2.status_code == 200
        data = r2.json()
        # may be 0 sent (no real browser) or may attempt and fail — both acceptable
        assert "sent" in data
        assert "ok" in data

    def test_subscribe_requires_auth(self):
        r = requests.post(
            f"{API}/push/subscribe",
            json={"subscription": {"endpoint": "https://x", "keys": {}}},
            timeout=15,
        )
        assert r.status_code == 401


# ==================== WEBSOCKET ====================
class TestWebSocket:
    def test_ws_rejects_no_token(self):
        async def run():
            url = f"{WS_BASE}/api/ws/chat"
            try:
                async with websockets.connect(url, open_timeout=10) as ws:
                    await ws.recv()
                return None
            except websockets.exceptions.InvalidStatus as e:
                return e.response.status_code
            except websockets.exceptions.ConnectionClosed as e:
                return e.code
            except Exception as e:
                return str(e)

        code = asyncio.run(run())
        # Expect 4401 close code or HTTP 401/403 reject
        assert code in (4401, 401, 403), f"Unexpected close/status: {code}"

    def test_ws_connect_with_token_and_echo(self, member_tok, padmin_tok):
        async def run():
            url = f"{WS_BASE}/api/ws/chat?token={member_tok}"
            async with websockets.connect(url, open_timeout=10) as ws:
                # Get padmin user id to send a message to
                rme = requests.get(f"{API}/auth/me", headers=hdr(padmin_tok), timeout=10)
                to_uid = rme.json()["id"]
                msg = {"to_user_id": to_uid, "body": "TEST_ws_hello"}
                await ws.send(json.dumps(msg))
                # We should receive a broadcast on this connection (self-echo)
                received = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(received)
                return data

        data = asyncio.run(run())
        assert data["body"] == "TEST_ws_hello"
        assert data["to_user_id"] is not None
        assert "id" in data
        assert "conversation_id" in data


# ==================== CORS ====================
# NOTE: We test CORS against http://localhost:8001 directly because the
# preview-URL ingress overrides Access-Control-Allow-Origin to '*' (infra
# concern outside backend code). Backend's explicit-origin policy must be
# verified at the FastAPI layer.
LOCAL = "http://localhost:8001"


class TestCORS:
    def test_cors_allowed_origin(self):
        origin = "https://celestialpeoplemeeet.com"
        r = requests.get(
            f"{LOCAL}/api/health",
            headers={"Origin": origin},
            timeout=10,
        )
        assert r.status_code == 200
        acao = r.headers.get("access-control-allow-origin", "")
        assert acao == origin, f"Expected ACAO={origin}, got {acao!r}"

    def test_cors_disallowed_origin(self):
        r = requests.get(
            f"{LOCAL}/api/health",
            headers={"Origin": "https://evil.com"},
            timeout=10,
        )
        assert r.status_code == 200
        acao = r.headers.get("access-control-allow-origin", "")
        assert acao == "", f"Expected NO ACAO for evil.com, got {acao!r}"
