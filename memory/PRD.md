# CelestialPeopleMeeet — PRD

## Original Problem Statement
Build a production-ready web-first, mobile-optimized church community platform called CelestialPeopleMeeet for the worldwide Celestial Church of Christ family. Not a directory — a parish engagement platform with parish discovery, verified identity, parish-only feeds, global feeds, livestreams, choir organization, careers, prayer wall, testimonies, service teams, and role-based administration. Nothing configurable is hardcoded — admin settings drive ranks, badges, categories, parishes. M365-style enterprise-clean UI; simple for older members, clear for youth; PWA-ready for future mobile packaging.

## Architecture
- **Backend**: FastAPI + Motor + MongoDB. Single `server.py` (1.2k lines). All routes prefixed `/api`. JWT in httpOnly cookies (Bearer fallback). bcrypt password hashing. Role-based access with `require_roles(...)` dependency. Auto-seed on startup.
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI. AuthContext + ProtectedRoute. AppLayout with sidebar + topbar + mobile bottom nav. Pages organized under `/app/*`.
- **Design**: Ivory/cream `#FDFBF7`, deep navy `#0F1E38`, warm gold `#C5A028`. Cormorant Garamond (display) + Manrope (body). PWA manifest installed.

## Roles
super_admin · parish_admin · shepherd · moderator · member · verified_choir · choir_director

## Implemented Modules (May 2026)
- ✅ Authentication: register, login, logout, /me, /refresh, JWT cookie + Bearer fallback
- ✅ Conversational onboarding (10 steps) + conversational sign-in (2 steps)
- ✅ Admin Settings (7 catalogs, seeded): ccc_ranks, badges, event_categories, service_types, prayer_categories, job_categories, report_reasons
- ✅ Parish Directory: CRUD, search (q/country/city), `/nearby` suggestion
- ✅ Parish Memberships with hard 2-max enforcement + approval workflow
- ✅ Parish Feed (private, requires approved membership) + Global Feed
- ✅ Comments, reactions (Amen), report button
- ✅ Prayer Wall (parish + global, anonymous flag, "I prayed" idempotent reactions)
- ✅ Testimonies & Harvest Highlights
- ✅ Events + Livestream URL + RSVP (role-gated creation: shepherd/parish_admin/super_admin)
- ✅ Choir: join → verify (admin) → promote to director (max 2 per parish, requires verified)
- ✅ Service/Volunteer teams with approval workflow
- ✅ Member discovery (country filter) + Follow + Direct messaging
- ✅ Careers/jobs board + applications
- ✅ Notifications (auto-created on membership approval, messages)
- ✅ Admin Console (6 tabs): Settings, Parishes, Approvals, Users & Roles, Moderation, Audit Log
- ✅ Reports + moderation actions (dismiss/hide/delete) with audit log
- ✅ Role assignment + parish assignment for parish_admin
- ✅ Profile view + edit
- ✅ PWA manifest

## Seed Data
- 6 sample parishes (Lagos, Abuja, Cotonou, NYC, London, Toronto)
- 17 CCC ranks, 6 badges, 8 event/service/prayer/job categories, 6 report reasons
- Super admin: `superadmin@celestialpeoplemeeet.com / Celestial@2026`
- Parish admin: `parishadmin@celestialpeoplemeeet.com / Parish@2026`
- Member: `member@celestialpeoplemeeet.com / Member@2026` (auto-approved to CCC Bethel Parish, Lagos)

## Test Results
- Backend: **58/58 passing** (iteration_2.json)
- Frontend E2E: **28/29 passing** (iteration_3.json) — one flaky timing assertion only

## Prioritized Backlog (Post-MVP)
- **P1**: Email delivery for notifications (Resend), 2FA, password reset flow, audit log filtering UI
- **P1**: Object storage for media (currently base64) — Cloudflare R2 / Emergent storage
- **P1**: Real-time chat with WebSocket; presence indicators
- **P2**: Google Maps integration for parish location + nearby (currently text-based)
- **P2**: Livestream provider abstractions (YouTube/Vimeo embed picker), schedule reminders, replay archive
- **P2**: Multi-parish admin: assign one parish_admin to multiple parishes via assignment table
- **P2**: Push notifications via service worker; full PWA installability w/ icons
- **P3**: i18n (Yoruba, French for francophone parishes), accessibility audit, audit log export

## Next Tasks
- Smoke test deployment with production domain (`celestialpeoplemeeet.com`)
- Resolve action item: tighten CORS in production from `allow_origin_regex='.*'` to explicit origins
- Optional hardening: rate-limit /auth/login, password complexity, refresh-token rotation
