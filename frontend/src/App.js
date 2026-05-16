import React, { useEffect, Component } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import Music from "./pages/Music";
import GlobalFeed from "./pages/GlobalFeed";
import ParishFeed from "./pages/ParishFeed";
import ParishAdminRequest from "./pages/ParishAdminRequest";
import { ForgotPassword, ResetPassword } from "./pages/PasswordReset";
import { ensureServiceWorker } from "./lib/push";

function Loader() {
  return (
    <div className="min-h-screen grid place-items-center" style={{ background: "#FDFBF7" }}>
      <div style={{ fontFamily: "serif", fontSize: "1.4rem", color: "#0F1E38", opacity: 0.7 }}>Preparing your space…</div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen grid place-items-center" style={{ background: "#FDFBF7", padding: "2rem", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✞</div>
            <div style={{ fontFamily: "serif", fontSize: "1.4rem", color: "#0F1E38", marginBottom: "0.5rem" }}>Something went wrong</div>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Please refresh the page or go back to continue.</p>
            <button onClick={() => { window.location.hash = "/app"; window.location.reload(); }} style={{ background: "#0F1E38", color: "white", border: "none", padding: "0.6rem 1.5rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>Go Home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Protected({ children }) {
  const { user, loading, verifying } = useAuth();
  const location = useLocation();
  // Wait while initial verify (or refresh) is in progress so we don't
  // redirect mobile users who have a cached session but no response yet.
  if (loading || (verifying && user === null)) return <Loader />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
}

function AdminGate({ children }) {
  const { user, loading, verifying } = useAuth();
  if (loading || (verifying && user === null)) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "super_admin" && user.role !== "parish_admin") return <Navigate to="/app" replace />;
  return children;
}

function App() {
  useEffect(() => { ensureServiceWorker(); }, []);
  return (
    <ErrorBoundary>
    <AuthProvider>
      <HashRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<ConversationalAuth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/app/parish-feed" element={<Protected><AppLayout><ParishFeed /></AppLayout></Protected>} />
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
          <Route path="/app/parish-admin-request" element={<Protected><AppLayout><ParishAdminRequest /></AppLayout></Protected>} />
          <Route path="/app/music" element={<Protected><AppLayout><Music /></AppLayout></Protected>} />
          <Route path="/app/admin" element={<AdminGate><AppLayout><Admin /></AppLayout></AdminGate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
