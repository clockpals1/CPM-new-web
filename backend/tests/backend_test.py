"""CelestialPeopleMeeet - comprehensive backend tests.

Run: pytest /app/backend/tests/backend_test.py -v --tb=short \
        --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

SUPER = ("superadmin@celestialpeoplemeet.com", "Celestial@2026")
PADMIN = ("parishadmin@celestialpeoplemeet.com", "Parish@2026")
MEMBER = ("member@celestialpeoplemeet.com", "Member@2026")


# ---------- helpers ----------
def login(email: str, password: str):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    body = r.json()
    # token may live in cookie 'access_token'
    cookie_tok = r.cookies.get("access_token")
    return body, cookie_tok


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"} if tok else {}


def assert_no_mongo_id(obj):
    """Recursively assert no '_id' key in obj."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leak found: {obj}"
        for v in obj.values():
            assert_no_mongo_id(v)
    elif isinstance(obj, list):
        for v in obj:
            assert_no_mongo_id(v)


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def super_tok():
    _, tok = login(*SUPER)
    return tok


@pytest.fixture(scope="session")
def padmin_tok():
    _, tok = login(*PADMIN)
    return tok


@pytest.fixture(scope="session")
def member_tok():
    _, tok = login(*MEMBER)
    return tok


@pytest.fixture(scope="session")
def parishes(super_tok):
    r = requests.get(f"{API}/parishes", headers=hdr(super_tok), timeout=20)
    assert r.status_code == 200
    return r.json()


# ===================== HEALTH =====================
class TestHealth:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True


# ===================== AUTH =====================
class TestAuth:
    def test_login_super(self):
        body, tok = login(*SUPER)
        assert body["role"] == "super_admin"
        assert body["email"] == SUPER[0]
        assert "password_hash" not in body
        assert "_id" not in body
        assert tok, "access_token cookie should be set"

    def test_login_parish_admin(self):
        body, tok = login(*PADMIN)
        assert body["role"] == "parish_admin"
        assert tok

    def test_login_member(self):
        body, tok = login(*MEMBER)
        assert body["role"] == "member"
        assert tok

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": SUPER[0], "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me_with_bearer(self, member_tok):
        r = requests.get(f"{API}/auth/me", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == MEMBER[0]
        assert "password_hash" not in d
        assert_no_mongo_id(d)

    def test_register_and_token(self):
        unique = uuid.uuid4().hex[:8]
        email = f"test_{unique}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Passw0rd!", "name": f"Test {unique}",
            "ccc_rank": "Brother", "country": "Nigeria", "city": "Lagos",
            "interested_in_choir": True,
        }, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == email
        assert "password_hash" not in body
        cookie_tok = r.cookies.get("access_token")
        assert cookie_tok, "access_token cookie required"
        # verify token works
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {cookie_tok}"}, timeout=10)
        assert me.status_code == 200

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": MEMBER[0], "password": "Passw0rd!", "name": "dup"
        }, timeout=10)
        assert r.status_code == 400

    def test_refresh(self, member_tok):
        r = requests.post(f"{API}/auth/refresh", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "access_token" in data
        # new token should work
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"}, timeout=10)
        assert me.status_code == 200

    def test_logout(self):
        r = requests.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200


# ===================== SETTINGS =====================
class TestSettings:
    def test_ccc_ranks_seeded(self):
        r = requests.get(f"{API}/settings/ccc_ranks", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 17, f"expected >=17 ranks, got {len(items)}"
        assert_no_mongo_id(items)

    @pytest.mark.parametrize("key", ["badges", "event_categories", "service_types", "prayer_categories", "job_categories", "report_reasons"])
    def test_other_settings_seeded(self, key):
        r = requests.get(f"{API}/settings/{key}", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_unknown_key(self):
        r = requests.get(f"{API}/settings/invalid_key", timeout=10)
        assert r.status_code == 400

    def test_settings_post_requires_super(self, member_tok):
        r = requests.post(f"{API}/settings", headers=hdr(member_tok), json={
            "key": "badges", "label": "Test"
        }, timeout=10)
        assert r.status_code == 403

    def test_settings_post_super_ok(self, super_tok):
        label = f"TEST_label_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/settings", headers=hdr(super_tok), json={
            "key": "badges", "label": label, "order": 99
        }, timeout=10)
        assert r.status_code == 200
        item = r.json()
        assert item["label"] == label
        # cleanup
        requests.delete(f"{API}/settings/{item['id']}", headers=hdr(super_tok), timeout=10)


# ===================== PARISHES =====================
class TestParishes:
    def test_list_seeded(self):
        r = requests.get(f"{API}/parishes", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 6, f"expected 6 seeded parishes, got {len(items)}"
        assert_no_mongo_id(items)

    def test_filter_country(self):
        r = requests.get(f"{API}/parishes", params={"country": "Nigeria"}, timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert all(p["country"].lower() == "nigeria" for p in items)

    def test_nearby_priority(self):
        r = requests.get(f"{API}/parishes/nearby", params={"country": "Nigeria", "city": "Lagos"}, timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        # first item should be Lagos
        assert items[0]["city"].lower() == "lagos"

    def test_get_one(self, parishes):
        pid = parishes[0]["id"]
        r = requests.get(f"{API}/parishes/{pid}", timeout=10)
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_create_requires_admin(self, member_tok):
        r = requests.post(f"{API}/parishes", headers=hdr(member_tok), json={
            "name": "TEST_X", "country": "Nigeria", "city": "Lagos"
        }, timeout=10)
        assert r.status_code == 403

    def test_create_and_delete(self, super_tok):
        name = f"TEST_parish_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/parishes", headers=hdr(super_tok), json={
            "name": name, "country": "Nigeria", "city": "TestCity"
        }, timeout=10)
        assert r.status_code == 200
        pid = r.json()["id"]
        r2 = requests.delete(f"{API}/parishes/{pid}", headers=hdr(super_tok), timeout=10)
        assert r2.status_code == 200

    def test_delete_member_forbidden(self, member_tok, parishes):
        r = requests.delete(f"{API}/parishes/{parishes[0]['id']}", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 403


# ===================== MEMBERSHIPS =====================
class TestMemberships:
    def test_request_duplicate(self, member_tok, parishes):
        # member is already approved to parishes[0] via seed - duplicate request -> 400
        r = requests.post(f"{API}/memberships/request", headers=hdr(member_tok), json={
            "parish_id": parishes[0]["id"]
        }, timeout=10)
        assert r.status_code == 400

    def test_two_max(self, member_tok, parishes):
        # request second parish - should succeed (now member has 2)
        r = requests.post(f"{API}/memberships/request", headers=hdr(member_tok), json={
            "parish_id": parishes[1]["id"]
        }, timeout=10)
        # could be 200 (first run) or 400 (already requested previously)
        assert r.status_code in (200, 400)
        # Try a 3rd -> must be 400
        if len(parishes) > 2:
            r3 = requests.post(f"{API}/memberships/request", headers=hdr(member_tok), json={
                "parish_id": parishes[2]["id"]
            }, timeout=10)
            assert r3.status_code == 400, f"expected 400 for 3rd membership, got {r3.status_code}: {r3.text}"

    def test_pending_admin_only(self, member_tok, padmin_tok):
        r = requests.get(f"{API}/memberships/pending", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 403
        r2 = requests.get(f"{API}/memberships/pending", headers=hdr(padmin_tok), timeout=10)
        assert r2.status_code == 200
        assert_no_mongo_id(r2.json())

    def test_approve_flow(self, super_tok, padmin_tok, parishes):
        # Create a fresh user, request membership, approve, verify notification
        unique = uuid.uuid4().hex[:8]
        email = f"test_app_{unique}@example.com"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Passw0rd!", "name": f"Approve {unique}",
        }, timeout=10)
        assert reg.status_code == 200
        tok = reg.cookies.get("access_token")
        # request second parish (parishes[1])
        req = requests.post(f"{API}/memberships/request", headers=hdr(tok), json={
            "parish_id": parishes[1]["id"]
        }, timeout=10)
        assert req.status_code == 200
        mid = req.json()["id"]
        # super approve
        ap = requests.post(f"{API}/memberships/{mid}/approve", headers=hdr(super_tok), timeout=10)
        assert ap.status_code == 200
        # notification visible
        notifs = requests.get(f"{API}/notifications", headers=hdr(tok), timeout=10).json()
        assert any(n.get("category") == "membership" for n in notifs)


# ===================== FEED POSTS =====================
class TestPosts:
    def test_member_parish_post(self, member_tok, parishes):
        body = {"body": "TEST post member", "scope": "parish", "parish_id": parishes[0]["id"]}
        r = requests.post(f"{API}/posts", headers=hdr(member_tok), json=body, timeout=10)
        assert r.status_code == 200, r.text
        assert_no_mongo_id(r.json())

    def test_member_non_member_parish_forbidden(self, member_tok, parishes):
        # member not approved at parishes[3]
        non_member_parish = parishes[3]["id"]
        body = {"body": "Should be denied", "scope": "parish", "parish_id": non_member_parish}
        r = requests.post(f"{API}/posts", headers=hdr(member_tok), json=body, timeout=10)
        assert r.status_code == 403

    def test_global_post(self, member_tok):
        r = requests.post(f"{API}/posts", headers=hdr(member_tok), json={
            "body": "TEST global post", "scope": "global"
        }, timeout=10)
        assert r.status_code == 200

    def test_list_posts(self, member_tok):
        r = requests.get(f"{API}/posts", headers=hdr(member_tok), params={"scope": "global"}, timeout=10)
        assert r.status_code == 200
        assert_no_mongo_id(r.json())

    def test_comments_and_reactions(self, member_tok):
        # create a post
        cr = requests.post(f"{API}/posts", headers=hdr(member_tok), json={"body": "react test", "scope": "global"}, timeout=10)
        pid = cr.json()["id"]
        rxn = requests.post(f"{API}/posts/{pid}/react", headers=hdr(member_tok), json={"reaction": "amen"}, timeout=10)
        assert rxn.status_code == 200
        cm = requests.post(f"{API}/posts/{pid}/comments", headers=hdr(member_tok), json={"body": "amen!"}, timeout=10)
        assert cm.status_code == 200


# ===================== PRAYERS =====================
class TestPrayers:
    def test_create_global(self, member_tok):
        r = requests.post(f"{API}/prayers", headers=hdr(member_tok), json={
            "title": "TEST prayer", "body": "pray for me", "scope": "global"
        }, timeout=10)
        assert r.status_code == 200, r.text
        assert_no_mongo_id(r.json())

    def test_create_parish_non_member_forbidden(self, member_tok, parishes):
        r = requests.post(f"{API}/prayers", headers=hdr(member_tok), json={
            "title": "x", "body": "y", "scope": "parish", "parish_id": parishes[3]["id"]
        }, timeout=10)
        assert r.status_code == 403

    def test_prayed_idempotent(self, member_tok):
        cr = requests.post(f"{API}/prayers", headers=hdr(member_tok), json={"title": "p", "body": "b", "scope": "global"}, timeout=10)
        pid = cr.json()["id"]
        r1 = requests.post(f"{API}/prayers/{pid}/prayed", headers=hdr(member_tok), timeout=10)
        r2 = requests.post(f"{API}/prayers/{pid}/prayed", headers=hdr(member_tok), timeout=10)
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r2.json().get("already") is True


# ===================== TESTIMONIES =====================
class TestTestimonies:
    def test_create_and_list(self, member_tok):
        cr = requests.post(f"{API}/testimonies", headers=hdr(member_tok), json={
            "title": "TEST testimony", "body": "praise", "scope": "global"
        }, timeout=10)
        assert cr.status_code == 200
        lr = requests.get(f"{API}/testimonies", params={"scope": "global"}, timeout=10)
        assert lr.status_code == 200
        assert_no_mongo_id(lr.json())


# ===================== EVENTS =====================
class TestEvents:
    def test_member_cannot_create(self, member_tok, parishes):
        r = requests.post(f"{API}/events", headers=hdr(member_tok), json={
            "title": "x", "category": "Sunday Worship", "starts_at": "2030-01-01T10:00:00Z",
            "scope": "parish", "parish_id": parishes[0]["id"],
        }, timeout=10)
        assert r.status_code == 403

    def test_admin_create_and_rsvp(self, padmin_tok, member_tok, parishes):
        cr = requests.post(f"{API}/events", headers=hdr(padmin_tok), json={
            "title": "TEST event", "category": "Bible Class", "starts_at": "2030-01-01T10:00:00Z",
            "scope": "parish", "parish_id": parishes[0]["id"],
        }, timeout=10)
        assert cr.status_code == 200, cr.text
        eid = cr.json()["id"]
        rsvp = requests.post(f"{API}/events/{eid}/rsvp", headers=hdr(member_tok), timeout=10)
        assert rsvp.status_code == 200


# ===================== CHOIR =====================
class TestChoir:
    def test_join_requires_parish_membership(self, parishes):
        # fresh user not member of any parish
        unique = uuid.uuid4().hex[:8]
        reg = requests.post(f"{API}/auth/register", json={
            "email": f"test_choir_{unique}@example.com", "password": "Passw0rd!", "name": "ChoirUser"
        }, timeout=10)
        tok = reg.cookies.get("access_token")
        r = requests.post(f"{API}/choir/join", headers=hdr(tok), json={
            "parish_id": parishes[0]["id"], "voice_part": "Soprano"
        }, timeout=10)
        assert r.status_code == 403

    def test_member_can_join_and_verify_promote(self, super_tok, padmin_tok, parishes):
        # Use a fresh user to avoid persisted state across runs.
        pid = parishes[0]["id"]
        unique = uuid.uuid4().hex[:8]
        reg = requests.post(f"{API}/auth/register", json={
            "email": f"test_choir2_{unique}@example.com", "password": "Passw0rd!", "name": "C2"
        }, timeout=10)
        tok = reg.cookies.get("access_token")
        # approve parish membership
        req = requests.post(f"{API}/memberships/request", headers=hdr(tok), json={"parish_id": pid}, timeout=10)
        mid = req.json()["id"]
        requests.post(f"{API}/memberships/{mid}/approve", headers=hdr(super_tok), timeout=10)
        # join choir
        r = requests.post(f"{API}/choir/join", headers=hdr(tok), json={
            "parish_id": pid, "voice_part": "Soprano"
        }, timeout=10)
        assert r.status_code == 200, r.text
        c = r.json()
        # No _id should leak even though returns existing dict on re-join
        assert "_id" not in c
        cid = c["id"]
        # promote before verify -> 400
        p_before = requests.post(f"{API}/choir/{cid}/promote", headers=hdr(super_tok), timeout=10)
        assert p_before.status_code == 400
        # verify
        v = requests.post(f"{API}/choir/{cid}/verify", headers=hdr(padmin_tok), timeout=10)
        assert v.status_code == 200

    def test_max_two_directors(self, super_tok, padmin_tok, parishes):
        """Insert two directors then attempt third user."""
        pid = parishes[0]["id"]
        # create three fresh users, approve membership, join choir, verify, promote
        cids = []
        tokens = []
        for i in range(3):
            unique = uuid.uuid4().hex[:8]
            reg = requests.post(f"{API}/auth/register", json={
                "email": f"test_dir_{unique}@example.com", "password": "Passw0rd!", "name": f"Dir{i}"
            }, timeout=10)
            tok = reg.cookies.get("access_token")
            tokens.append(tok)
            # request approval and let super approve
            req = requests.post(f"{API}/memberships/request", headers=hdr(tok), json={"parish_id": pid}, timeout=10)
            mid = req.json()["id"]
            requests.post(f"{API}/memberships/{mid}/approve", headers=hdr(super_tok), timeout=10)
            # join choir
            cj = requests.post(f"{API}/choir/join", headers=hdr(tok), json={"parish_id": pid, "voice_part": "Tenor"}, timeout=10)
            cid = cj.json()["id"]
            cids.append(cid)
            requests.post(f"{API}/choir/{cid}/verify", headers=hdr(super_tok), timeout=10)
        # promote first two
        p1 = requests.post(f"{API}/choir/{cids[0]}/promote", headers=hdr(super_tok), timeout=10)
        p2 = requests.post(f"{API}/choir/{cids[1]}/promote", headers=hdr(super_tok), timeout=10)
        # third promote should fail (>=2 dirs)
        p3 = requests.post(f"{API}/choir/{cids[2]}/promote", headers=hdr(super_tok), timeout=10)
        # we don't strictly know prior director count, but combined p1/p2/p3 should hit 400 at some point if a third would exceed 2
        # The system has max 2 directors per parish — so at least one of the three promote calls must fail with 400.
        statuses = [p1.status_code, p2.status_code, p3.status_code]
        assert 400 in statuses, f"max-2-directors not enforced: {statuses}"


# ===================== SERVICE =====================
class TestService:
    def test_service_flow(self, member_tok, padmin_tok, parishes):
        cr = requests.post(f"{API}/service/join", headers=hdr(member_tok), json={
            "parish_id": parishes[0]["id"], "service_type": "Ushering"
        }, timeout=10)
        assert cr.status_code == 200
        sid = cr.json()["id"]
        # member cannot approve
        deny = requests.post(f"{API}/service/{sid}/approve", headers=hdr(member_tok), timeout=10)
        assert deny.status_code == 403
        ok = requests.post(f"{API}/service/{sid}/approve", headers=hdr(padmin_tok), timeout=10)
        assert ok.status_code == 200


# ===================== MEMBERS / FOLLOW =====================
class TestMembers:
    def test_list_hides_email(self, member_tok):
        r = requests.get(f"{API}/members", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 200
        items = r.json()
        for u in items:
            assert "email" not in u, f"email leaked: {u}"
            assert "password_hash" not in u
            assert "_id" not in u

    def test_follow_idempotent(self, member_tok, super_tok):
        # member follows super_admin user id
        me = requests.get(f"{API}/auth/me", headers=hdr(super_tok), timeout=10).json()
        target = me["id"]
        r1 = requests.post(f"{API}/members/{target}/follow", headers=hdr(member_tok), timeout=10)
        r2 = requests.post(f"{API}/members/{target}/follow", headers=hdr(member_tok), timeout=10)
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r2.json().get("already") is True


# ===================== MESSAGES =====================
class TestMessages:
    def test_send_and_inbox(self, member_tok, super_tok):
        target = requests.get(f"{API}/auth/me", headers=hdr(super_tok), timeout=10).json()["id"]
        r = requests.post(f"{API}/messages", headers=hdr(member_tok), json={"to_user_id": target, "body": "hello"}, timeout=10)
        assert r.status_code == 200
        inbox = requests.get(f"{API}/messages/inbox", headers=hdr(member_tok), timeout=10)
        assert inbox.status_code == 200
        assert_no_mongo_id(inbox.json())


# ===================== JOBS =====================
class TestJobs:
    def test_jobs(self, member_tok):
        cr = requests.post(f"{API}/jobs", headers=hdr(member_tok), json={
            "title": "TEST job", "description": "do stuff", "location": "Lagos", "remote": True
        }, timeout=10)
        assert cr.status_code == 200
        ls = requests.get(f"{API}/jobs", params={"q": "TEST"}, timeout=10)
        assert ls.status_code == 200
        jid = cr.json()["id"]
        ap = requests.post(f"{API}/jobs/{jid}/apply", headers=hdr(member_tok), json={"message": "hire me"}, timeout=10)
        assert ap.status_code == 200


# ===================== NOTIFICATIONS =====================
class TestNotifications:
    def test_list_and_read(self, member_tok):
        r = requests.get(f"{API}/notifications", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 200
        items = r.json()
        if items:
            nid = items[0]["id"]
            mk = requests.post(f"{API}/notifications/{nid}/read", headers=hdr(member_tok), timeout=10)
            assert mk.status_code == 200


# ===================== ADMIN =====================
class TestAdmin:
    def test_users_super_only(self, member_tok, super_tok):
        r = requests.get(f"{API}/admin/users", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 403
        r2 = requests.get(f"{API}/admin/users", headers=hdr(super_tok), timeout=10)
        assert r2.status_code == 200
        for u in r2.json():
            assert "password_hash" not in u
            assert "_id" not in u

    def test_set_role(self, super_tok, parishes):
        # create fresh user
        unique = uuid.uuid4().hex[:8]
        reg = requests.post(f"{API}/auth/register", json={
            "email": f"test_role_{unique}@example.com", "password": "Passw0rd!", "name": "RoleUser"
        }, timeout=10)
        uid = reg.json()["id"]
        r = requests.post(f"{API}/admin/users/{uid}/role", headers=hdr(super_tok), json={
            "role": "moderator", "parish_id": parishes[0]["id"]
        }, timeout=10)
        assert r.status_code == 200
        # invalid role
        bad = requests.post(f"{API}/admin/users/{uid}/role", headers=hdr(super_tok), json={"role": "wizard"}, timeout=10)
        assert bad.status_code == 400

    def test_badge_audit(self, super_tok):
        # create user, award badge, then check audit-logs reflects it
        unique = uuid.uuid4().hex[:8]
        reg = requests.post(f"{API}/auth/register", json={
            "email": f"test_badge_{unique}@example.com", "password": "Passw0rd!", "name": "BadgeUser"
        }, timeout=10)
        uid = reg.json()["id"]
        r = requests.post(f"{API}/admin/users/{uid}/badge", headers=hdr(super_tok), json={"badge": "evangelist"}, timeout=10)
        assert r.status_code == 200
        # audit logs
        al = requests.get(f"{API}/admin/audit-logs", headers=hdr(super_tok), timeout=10)
        assert al.status_code == 200
        assert any(x.get("action") == "award_badge" and x.get("target") == uid for x in al.json())

    def test_audit_logs_super_only(self, member_tok):
        r = requests.get(f"{API}/admin/audit-logs", headers=hdr(member_tok), timeout=10)
        assert r.status_code == 403

    def test_reports_flow(self, member_tok, super_tok):
        # create report
        cr = requests.post(f"{API}/reports", headers=hdr(member_tok), json={
            "target_type": "post", "target_id": "fake", "reason": "Spam", "note": "TEST"
        }, timeout=10)
        assert cr.status_code == 200
        rid = cr.json()["id"]
        # non admin cannot list reports
        d = requests.get(f"{API}/admin/reports", headers=hdr(member_tok), timeout=10)
        assert d.status_code == 403
        # admin can list
        ls = requests.get(f"{API}/admin/reports", headers=hdr(super_tok), timeout=10)
        assert ls.status_code == 200
        # resolve
        rs = requests.post(f"{API}/admin/reports/{rid}/resolve", headers=hdr(super_tok), json={"action": "dismiss"}, timeout=10)
        assert rs.status_code == 200


# ===================== HOME STATS =====================
class TestStats:
    def test_home(self):
        r = requests.get(f"{API}/stats/home", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("parishes", "members", "prayers", "events"):
            assert k in d
        assert d["parishes"] >= 6
