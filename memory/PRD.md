# CelestialPeopleMeeet — PRD

## Original Problem Statement
Build a production-ready web-first, mobile-optimized church community platform called CelestialPeopleMeeet for the worldwide Celestial Church of Christ family. Not a directory — a parish engagement platform with parish discovery, verified identity, parish-only feeds, global feeds, livestreams, choir organization, careers, prayer wall, testimonies, service teams, and role-based administration. Nothing configurable is hardcoded — admin settings drive ranks, badges, categories, parishes, AND integration secrets. M365-style enterprise-clean UI; simple for older members, clear for youth; PWA-ready for future mobile packaging.

## Architecture
- **Backend**: FastAPI + Motor + MongoDB. Single `server.py` (~1640 lines). All REST routes prefixed `/api`. WebSocket at `/api/ws/chat`. JWT in httpOnly cookies (Bearer fallback). bcrypt. Role-based access. Auto-seed on startup. Integrations stored in `admin_settings` collection (no env hardcoding).
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn. AuthContext + ProtectedRoute. AppLayout with sidebar + topbar + mobile bottom nav. Service worker for push notifications.
- **Design**: Ivory `#FDFBF7`, navy `#0F1E38`, gold `#C5A028`. Cormorant Garamond + Manrope. PWA manifest installed.

## Roles
super_admin · parish_admin · shepherd (auto-set on endorsement) · moderator · member · verified_choir · choir_director

## Implemented Modules
### Core (iteration 1-2)
- ✅ Auth: register, login, logout, /me, /refresh, JWT cookie + Bearer fallback
- ✅ Conversational 10-step onboarding + 2-step sign-in
- ✅ Admin Settings (8 catalogs, seeded): ccc_ranks, badges, event_categories, service_types, prayer_categories, job_categories, report_reasons, **integration_config**, **livestream_providers**
- ✅ Parish Directory + Memberships (hard 2-max)
- ✅ Parish Feed + Global Feed + comments + reactions + reports
- ✅ Prayer Wall (parish + global, anonymous, idempotent "I prayed")
- ✅ Testimonies, Events + RSVP + livestream URL
- ✅ Choir (verify → director, max 2)
- ✅ Service teams, Member discovery + Follow + Messaging
- ✅ Careers, Notifications, Profile
- ✅ Admin Console (Settings, Parishes, Approvals, Users & Roles, Moderation, Audit Log)
- ✅ PWA manifest

### Iteration 4 — Production Hardening
- ✅ **Integration config layer** — admin manages Resend, Google Maps, Cloudflare R2, VAPID secrets through Admin → Integrations tab. Auto-generate VAPID. Public/secret labeling with masking. Test buttons.
- ✅ **Password Reset Flow** — `/auth/forgot-password` + `/auth/reset-password`. Email sent via Resend if configured (else logged to backend). Origin validated against CORS allowlist (prevents open redirect via email).
- ✅ **Verified Shepherd Endorsement** — admin/parish_admin endorses a member → auto-promotes role, adds Shepherd badge, links parish, audit-logged. Parish detail page renders gold-bordered "Verified Shepherds" cards.
- ✅ **Multi-Parish Admin Assignment** — assign `managed_parish_ids` array to parish admins
- ✅ **Real-time WebSocket Chat** — `/api/ws/chat?token=…`, falls back to REST. Push notifications fanned out on incoming messages.
- ✅ **Object Storage** — `/api/uploads` posts to Cloudflare R2 when configured (filename sanitized, 25MB max), else inline data URL (5MB cap)
- ✅ **Push Notifications** — VAPID keypair auto-generated. Service worker `/sw.js`. `/api/push/subscribe` + push fanout on new messages.
- ✅ **Tightened CORS** — explicit allowlist (celestialpeoplemeeet.com + www + preview + localhost). Wildcard mode only if `*` in env.
- ✅ **Refresh-Token Rotation** — `/api/auth/refresh` issues fresh token and updates cookie
- ✅ **Map Embed** — parish detail uses Google Maps embed when key configured; falls back to free OSM-Google embed otherwise
- ✅ **Livestream Providers** — admin catalog key `livestream_providers` for provider list

## Seed Data
- 6 sample parishes (Lagos, Abuja, Cotonou, NYC, London, Toronto)
- 17 CCC ranks, 6 badges, 8 each event/service/prayer/job categories, 6 report reasons
- VAPID keypair auto-generated on first admin login → "Generate VAPID"
- Primary super admin: `sunday@isunday.me / Gpiner0@12`
- Legacy admin: `superadmin@celestialpeoplemeeet.com / Celestial@2026`
- Parish admin: `parishadmin@celestialpeoplemeeet.com / Parish@2026`
- Member: `member@celestialpeoplemeeet.com / Member@2026` (auto-approved to Bethel Lagos)

## Test Results
- Backend: **83/83 tests passing** (iteration_4.json — 58 core + 25 new)
- Frontend E2E: **28/29 passing** from iteration_3 (lint clean after iteration 4)

## Prioritized Backlog (Post-Iteration-4)
- **P1**: i18n (Yoruba/French via react-i18next), accessibility audit (focus rings, aria-labels, keyboard traps)
- **P1**: Encrypt VAPID private PEM at rest; rate-limit /auth/forgot-password
- **P2**: Refactor server.py into routers (auth, parishes, admin, integrations, ws)
- **P2**: Direct image upload UI (using /api/uploads → image fields in profile/posts/parishes)
- **P3**: Native mobile build (Expo wrapper or Capacitor) leveraging existing PWA
- **P3**: Email digest (weekly parish summary), Discord/Telegram bridge

## Deployment Readiness
- Production domain: `celestialpeoplemeeet.com`
- CORS configured. JWT secret in `.env`. MongoDB connection via `MONGO_URL`. All integration secrets are runtime-managed by admin — no rebuild needed to add Resend, Maps, R2, or push.
- PWA installable. Service worker registered on app load.
- Login + register + reset password + WS chat + push all tested in iteration 4.
