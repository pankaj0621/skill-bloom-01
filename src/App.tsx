import { useState, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import SuspendedScreen from "@/components/SuspendedScreen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import PageTransition from "@/components/PageTransition";
import SplashScreen from "./components/SplashScreen";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import NetworkStatus from "@/components/NetworkStatus";
import useServiceWorkerUpdate from "@/hooks/useServiceWorkerUpdate";
import Navbar from "@/components/Navbar";

const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const ProgressPage = lazy(() => import("./pages/Progress"));
const Profile = lazy(() => import("./pages/Profile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Community = lazy(() => import("./pages/Community"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FeedbackPage = lazy(() => import("./pages/Feedback"));
const CareerAdvisor = lazy(() => import("./pages/CareerAdvisor"));
const SkillGapAnalyzer = lazy(() => import("./pages/SkillGapAnalyzer"));
const AIMentor = lazy(() => import("./pages/AIMentor"));
const AIHub = lazy(() => import("./pages/AIHub"));

// QueryClient — cache for speed, but refetch on focus/mount so the UI feels live
// without manual refreshes. Realtime subscriptions also invalidate keys on change.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,               // 30 s — quickly considered stale
      gcTime: 1000 * 60 * 60 * 24,        // 24 hr in memory/storage
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,         // Refresh when user returns to tab
      refetchOnMount: true,               // Refresh stale data on navigation
      refetchOnReconnect: true,           // Refetch when back online
    },
  },
});

// Persist cache to localStorage so data survives page reloads
const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "spct-query-cache",
  throttleTime: 1000,
});

// Prefetch critical routes on idle
const prefetchRoutes = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import("./pages/Dashboard");
      import("./pages/Roadmap");
    });
  }
};

const RouteLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user, isSuspended } = useAuth();
  // Navbar sirf authenticated app shell pe — auth flows, onboarding, aur immersive
  // full-screen views (AI mentor chat, 404) pe hide. Naya route add karte waqt yahin update karo.
  const hideNavbarRoutes = [
    "/auth",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
    "/ai-mentor",
  ];
  const showNavbar =
    !!user &&
    !isSuspended &&
    !hideNavbarRoutes.includes(location.pathname) &&
    location.pathname !== "/" &&
    !location.pathname.startsWith("/auth/");

  if (user && isSuspended) {
    return <SuspendedScreen />;
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar outside of page transitions - always fixed */}
      {showNavbar && <Navbar />}
      
      <Suspense fallback={<RouteLoadingFallback />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
            <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path="/onboarding" element={<ProtectedRoute><PageTransition><Onboarding /></PageTransition></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
            <Route path="/roadmap" element={<ProtectedRoute><PageTransition><Roadmap /></PageTransition></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><PageTransition><ProgressPage /></PageTransition></ProtectedRoute>} />
            <Route path="/peers" element={<Navigate to="/leaderboard" replace />} />
            <Route path="/leaderboard" element={<ProtectedRoute><PageTransition><Leaderboard /></PageTransition></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><PageTransition><Community /></PageTransition></ProtectedRoute>} />
            <Route path="/user/:userId" element={<ProtectedRoute><PageTransition><UserProfile /></PageTransition></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><PageTransition><Analytics /></PageTransition></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><PageTransition><AdminDashboard /></PageTransition></AdminRoute></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><PageTransition><FeedbackPage /></PageTransition></ProtectedRoute>} />
            <Route path="/ai-hub" element={<ProtectedRoute><PageTransition><AIHub /></PageTransition></ProtectedRoute>} />
            <Route path="/career-advisor" element={<ProtectedRoute><PageTransition><CareerAdvisor /></PageTransition></ProtectedRoute>} />
            <Route path="/skill-gap" element={<ProtectedRoute><PageTransition><SkillGapAnalyzer /></PageTransition></ProtectedRoute>} />
            <Route path="/ai-mentor" element={<ProtectedRoute><PageTransition><AIMentor /></PageTransition></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  );
};

const ServiceWorkerUpdater = () => {
  useServiceWorkerUpdate();
  return null;
};

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
    prefetchRoutes();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hr
        buster: "v1",
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <NetworkStatus />
            <ServiceWorkerUpdater />
            {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
            <PwaInstallPrompt />
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
