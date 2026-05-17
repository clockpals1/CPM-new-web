import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatBot from "./ChatBot";
import {
  Home, Church, Users, HandHelping, Calendar, Music, Music2, Briefcase,
  Heart, MessageSquare, Bell, Shield, LogOut, Sparkles, Search, Globe,
  MessageCircle, Menu, X, ChevronRight, User, UserCog,
} from "lucide-react";

const NAV = [
  { to: "/app",             label: "Home",          icon: Home,         end: true, testid: "nav-home" },
  { to: "/app/parishes",    label: "Parishes",      icon: Church,                 testid: "nav-parishes" },
  { to: "/app/my-parish",   label: "My Parish",     icon: Sparkles,               testid: "nav-myparish" },
  { to: "/app/parish-feed", label: "Parish Feed",   icon: MessageCircle,          testid: "nav-parish-feed" },
  { to: "/app/feed",        label: "Global Feed",   icon: Globe,                  testid: "nav-feed" },
  { to: "/app/prayer",      label: "Prayer Wall",   icon: Heart,                  testid: "nav-prayer" },
  { to: "/app/testimonies", label: "Testimonies",   icon: Sparkles,               testid: "nav-testimonies" },
  { to: "/app/events",      label: "Events",        icon: Calendar,               testid: "nav-events" },
  { to: "/app/choir",       label: "Choir",         icon: Music,                  testid: "nav-choir" },
  { to: "/app/service",     label: "Service",       icon: HandHelping,            testid: "nav-service" },
  { to: "/app/meet",        label: "Meet People",   icon: Users,                  testid: "nav-meet" },
  { to: "/app/careers",     label: "Careers",       icon: Briefcase,              testid: "nav-careers" },
  { to: "/app/messages",    label: "Messages",      icon: MessageSquare,          testid: "nav-messages" },
  { to: "/app/notifications",label: "Notifications",icon: Bell,                   testid: "nav-notifications" },
  { to: "/app/music",       label: "CPM Wave",      icon: Music2,                 testid: "nav-music" },
];

const BOTTOM_PRIMARY = [
  { to: "/app",           label: "Home",     icon: Home,         end: true },
  { to: "/app/my-parish", label: "Parish",   icon: Church },
  { to: "/app/meet",      label: "Discover", icon: Users },
  { to: "/app/messages",  label: "Messages", icon: MessageSquare },
];

const MORE_SECTIONS = [
  {
    label: "Community",
    items: [
      { to: "/app/feed",         label: "Global Feed",  icon: Globe },
      { to: "/app/parish-feed",  label: "Parish Feed",  icon: MessageCircle },
      { to: "/app/prayer",       label: "Prayer Wall",  icon: Heart },
      { to: "/app/testimonies",  label: "Testimonies",  icon: Sparkles },
    ],
  },
  {
    label: "Worship & Serve",
    items: [
      { to: "/app/events",  label: "Events",   icon: Calendar },
      { to: "/app/choir",   label: "Choir",    icon: Music },
      { to: "/app/service", label: "Service",  icon: HandHelping },
      { to: "/app/music",   label: "CPM Wave", icon: Music2 },
    ],
  },
  {
    label: "Connect",
    items: [
      { to: "/app/parishes",      label: "Parishes",       icon: Church },
      { to: "/app/notifications", label: "Notifications",  icon: Bell },
      { to: "/app/careers",       label: "Careers",        icon: Briefcase },
      { to: "/app/profile",       label: "My Profile",     icon: User },
    ],
  },
];

function MobileMoreSheet({ open, onClose, user, isAdmin, onLogout }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-up sheet */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-paper)] rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "88vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 w-8 h-8 rounded-full bg-[var(--bg-subtle)] grid place-items-center text-[var(--text-tertiary)]"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto pb-8" style={{ maxHeight: "calc(88vh - 32px)" }}>
          {/* User identity card */}
          <div className="mx-4 mb-5 mt-2 flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[var(--brand-primary)]/5 to-[var(--brand-accent)]/5 border border-[var(--border-default)]">
            <Link to="/app/profile" onClick={onClose}
              className="w-13 h-13 w-[52px] h-[52px] rounded-2xl overflow-hidden bg-[var(--brand-primary)] text-white grid place-items-center text-xl font-display shrink-0 ring-2 ring-[var(--brand-accent)]/30">
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : (user?.name || "U")[0]}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--brand-primary)] truncate">{user?.name}</div>
              <div className="text-xs text-[var(--text-tertiary)] truncate">{user?.ccc_rank || user?.role}</div>
            </div>
            <Link to="/app/notifications" onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-default)] grid place-items-center shrink-0 hover:border-[var(--brand-primary)] transition-colors">
              <Bell size={17} className="text-[var(--text-secondary)]" />
            </Link>
          </div>

          {/* Feature grid sections */}
          <div className="px-4 space-y-5">
            {MORE_SECTIONS.map((sec) => (
              <div key={sec.label}>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-[var(--text-tertiary)] mb-2.5 px-0.5">
                  {sec.label}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {sec.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all active:scale-95 ${
                          isActive
                            ? "bg-[var(--brand-primary)] text-white shadow-md"
                            : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-default)]"
                        }`
                      }
                    >
                      <item.icon size={20} strokeWidth={1.7} />
                      <span className="text-[10px] font-medium leading-tight text-center px-0.5">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            {/* Row-style action links */}
            <div className="space-y-2 pt-1 border-t border-[var(--border-default)]">
              <NavLink
                to="/app/parish-admin-request"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors ${
                    isActive
                      ? "bg-[var(--brand-primary)] text-white"
                      : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                  }`
                }
              >
                <UserCog size={18} strokeWidth={1.7} />
                <span className="flex-1 text-sm font-medium">Apply for Parish Admin</span>
                <ChevronRight size={14} className="opacity-40 shrink-0" />
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/app/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors ${
                      isActive
                        ? "bg-[var(--brand-accent)] text-white"
                        : "bg-amber-50 text-[var(--brand-accent)]"
                    }`
                  }
                >
                  <Shield size={18} strokeWidth={1.7} />
                  <span className="flex-1 text-sm font-semibold">Admin Console</span>
                  <ChevronRight size={14} className="opacity-40 shrink-0" />
                </NavLink>
              )}

              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-sm"
              >
                <LogOut size={18} strokeWidth={1.7} />
                <span className="flex-1 text-left font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && (user.role === "super_admin" || user.role === "parish_admin");
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogout = async () => {
    setSheetOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-default)]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 h-full bg-[var(--bg-paper)] border-r border-[var(--border-default)]">
        <div className="px-6 pt-6 pb-4">
          <Link to="/app" className="flex items-center gap-2" data-testid="sidebar-logo">
            <div className="w-9 h-9 rounded-md bg-[var(--brand-primary)] text-white grid place-items-center font-display text-xl">C</div>
            <div>
              <div className="font-display text-lg leading-tight text-[var(--brand-primary)]">Celestial</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">People Meeet</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 my-0.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--brand-primary)]"
                }`
              }
            >
              <n.icon size={18} strokeWidth={1.7} />
              <span>{n.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/app/admin"
              data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 my-0.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--brand-accent)] text-white"
                    : "text-[var(--brand-accent)] hover:bg-[var(--bg-subtle)]"
                }`
              }
            >
              <Shield size={18} strokeWidth={1.7} />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-[var(--border-default)]">
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            data-testid="btn-logout"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <LogOut size={18} strokeWidth={1.7} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <ChatBot />

        {/* Topbar */}
        <header className="sticky top-0 z-30 glass border-b border-[var(--border-default)]">
          <div className="flex items-center justify-between px-4 md:px-8 h-14">
            {/* Mobile brand */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] text-white grid place-items-center font-display text-base">C</div>
              <span className="font-display text-base text-[var(--brand-primary)]">Celestial</span>
            </div>
            {/* Desktop search */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl">
              <Search size={18} className="text-[var(--text-tertiary)]" />
              <input
                placeholder="Search parishes, people, prayers..."
                data-testid="topbar-search"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-sm font-medium text-[var(--text-primary)]" data-testid="topbar-user-name">{user?.name}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{user?.ccc_rank || user?.role}</div>
              </div>
              <Link to="/app/profile" data-testid="topbar-avatar"
                className="w-9 h-9 rounded-full overflow-hidden bg-[var(--brand-secondary)] text-white grid place-items-center text-sm font-medium hover:ring-2 hover:ring-[var(--brand-accent)] transition">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : (user?.name || "U").slice(0, 1).toUpperCase()}
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile bottom nav bar */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-paper)]/95 backdrop-blur-md border-t border-[var(--border-default)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex justify-around items-stretch h-16">
            {BOTTOM_PRIMARY.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                data-testid={`mobile-nav-${n.label.toLowerCase().replace(" ", "-")}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors ${
                    isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all ${isActive ? "bg-[var(--brand-primary)]/10" : ""}`}>
                      <n.icon size={21} strokeWidth={isActive ? 2.1 : 1.6} />
                    </div>
                    <span className="text-[10px] font-medium leading-none">{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* More / burger — visually distinct navy pill-tab */}
            <button
              onClick={() => setSheetOpen(true)}
              data-testid="mobile-nav-more"
              className="flex flex-col items-center justify-center gap-0.5 flex-1 text-[var(--brand-primary)] active:opacity-70 transition-opacity"
            >
              <div className="w-11 h-7 rounded-xl flex items-center justify-center bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/25">
                <Menu size={18} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-bold leading-none">More</span>
            </button>
          </div>
        </nav>

        {/* Mobile "More" slide-up sheet */}
        <MobileMoreSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          user={user}
          isAdmin={isAdmin}
          onLogout={handleLogout}
        />

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
