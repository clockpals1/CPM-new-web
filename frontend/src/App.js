import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import ConversationalAuth from "./pages/ConversationalAuth";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Parishes from "./pages/Parishes";
import ParishDetail from "./pages/ParishDetail";
import MyParish from "./pages/MyParish";
import PrayerWall from "./pages/PrayerWall";
import Events from "./pages/Events";
import Choir from "./pages/Choir";
import Service from "./pages/Service";
import MeetPeople from "./pages/MeetPeople";
import Careers from "./pages/Careers";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import Testimonies from "./pages/Testimonies";
import Profile from "./pages/Profile";
import GlobalFeed from "./pages/GlobalFeed";

function Loader() {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-default)]">
      <div className="font-display text-2xl text-[var(--brand-primary)]">Preparing your space…</div>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
}

function AdminGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "super_admin" && user.role !== "parish_admin") return <Navigate to="/app" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<ConversationalAuth />} />
          <Route
            path="/app"
            element={
              <Protected>
                <AppLayout><Home /></AppLayout>
              </Protected>
            }
          />
          <Route path="/app/parishes" element={<Protected><AppLayout><Parishes /></AppLayout></Protected>} />
          <Route path="/app/parishes/:id" element={<Protected><AppLayout><ParishDetail /></AppLayout></Protected>} />
          <Route path="/app/my-parish" element={<Protected><AppLayout><MyParish /></AppLayout></Protected>} />
          <Route path="/app/prayer" element={<Protected><AppLayout><PrayerWall /></AppLayout></Protected>} />
          <Route path="/app/events" element={<Protected><AppLayout><Events /></AppLayout></Protected>} />
          <Route path="/app/choir" element={<Protected><AppLayout><Choir /></AppLayout></Protected>} />
          <Route path="/app/service" element={<Protected><AppLayout><Service /></AppLayout></Protected>} />
          <Route path="/app/meet" element={<Protected><AppLayout><MeetPeople /></AppLayout></Protected>} />
          <Route path="/app/careers" element={<Protected><AppLayout><Careers /></AppLayout></Protected>} />
          <Route path="/app/messages" element={<Protected><AppLayout><Messages /></AppLayout></Protected>} />
          <Route path="/app/notifications" element={<Protected><AppLayout><Notifications /></AppLayout></Protected>} />
          <Route path="/app/testimonies" element={<Protected><AppLayout><Testimonies /></AppLayout></Protected>} />
          <Route path="/app/feed" element={<Protected><AppLayout><GlobalFeed /></AppLayout></Protected>} />
          <Route path="/app/profile" element={<Protected><AppLayout><Profile /></AppLayout></Protected>} />
          <Route path="/app/admin" element={<AdminGate><AppLayout><Admin /></AppLayout></AdminGate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
