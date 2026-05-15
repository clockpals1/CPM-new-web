import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home, Church, Users, HandHelping, Calendar, Music, Briefcase,
  Heart, MessageSquare, Bell, Shield, LogOut, Sparkles, Search, Globe2, UserCircle
} from "lucide-react";

const NAV = [
  { to: "/app", label: "Home", icon: Home, end: true, testid: "nav-home" },
  { to: "/app/parishes", label: "Parishes", icon: Church, testid: "nav-parishes" },
  { to: "/app/my-parish", label: "My Parish", icon: Sparkles, testid: "nav-myparish" },
  { to: "/app/feed", label: "Global Feed", icon: Globe2, testid: "nav-feed" },
  { to: "/app/prayer", label: "Prayer Wall", icon: Heart, testid: "nav-prayer" },
  { to: "/app/testimonies", label: "Testimonies", icon: Sparkles, testid: "nav-testimonies" },
  { to: "/app/events", label: "Events", icon: Calendar, testid: "nav-events" },
  { to: "/app/choir", label: "Choir", icon: Music, testid: "nav-choir" },
  { to: "/app/service", label: "Service", icon: HandHelping, testid: "nav-service" },
  { to: "/app/meet", label: "Meet People", icon: Users, testid: "nav-meet" },
  { to: "/app/careers", label: "Careers", icon: Briefcase, testid: "nav-careers" },
  { to: "/app/messages", label: "Messages", icon: MessageSquare, testid: "nav-messages" },
  { to: "/app/notifications", label: "Notifications", icon: Bell, testid: "nav-notifications" },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && (user.role === "super_admin" || user.role === "parish_admin");

  return (
    <div className="min-h-screen flex bg-[var(--bg-default)]">
      {/* Sidebar */}
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

      {/* Main */}
      <div className="flex-1 md:ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 glass border-b border-[var(--border-default)]">
          <div className="flex items-center justify-between px-4 md:px-8 h-14">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
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
              <Link to="/app/profile" data-testid="topbar-avatar" className="w-9 h-9 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-sm font-medium hover:ring-2 hover:ring-[var(--brand-accent)] transition">
                {(user?.name || "U").slice(0, 1).toUpperCase()}
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--border-default)] flex justify-around py-1">
          {NAV.slice(0, 5).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={`mobile-${n.testid}`}
              className={({ isActive }) =>
                `flex flex-col items-center text-[10px] px-2 py-1 ${isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)]"}`
              }
            >
              <n.icon size={20} strokeWidth={1.7} />
              <span className="mt-0.5">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
