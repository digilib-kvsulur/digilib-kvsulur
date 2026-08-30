import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { recoverInvalidAuthSession } from "@/lib/authCleanup";
import { supabase } from "@/integrations/supabase/client";

import DeveloperMessagePopup from "@/components/global/DeveloperMessagePopup";

const queryClient = new QueryClient();
const Login = lazy(() => import("./pages/Login"));
const Index = lazy(() => import("./pages/Index"));
const Register = lazy(() => import("./pages/Register"));
const Catalog = lazy(() => import("./pages/Catalog"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const BookDetails = lazy(() => import("./pages/BookDetails"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Support = lazy(() => import("./pages/Support"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const PointsHistory = lazy(() => import("./pages/PointsHistory"));
const StudentPortfolio = lazy(() => import("./pages/StudentPortfolio"));

const Feedback = lazy(() => import("./pages/Feedback"));
const Download = lazy(() => import("./pages/Download"));

const STUDENT_ROLES = ["student"] as const;
const ADMIN_ROLES = ["admin"] as const;
const TEACHER_ROLES = ["teacher", "admin"] as const;

const PageLoader = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center animate-in fade-in duration-300">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

import { SplashScreen } from "@/components/global/SplashScreen";
import UpdateBanner from "@/components/global/UpdateBanner";

const isNative = navigator.userAgent.toLowerCase().includes('electron') || (window as any).Capacitor?.isNativePlatform?.();
const AppRouter = isNative ? HashRouter : BrowserRouter;

const DashboardRedirect = () => {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        supabase.from("profiles").select("role").eq("id", session.user.id).single()
          .then(({ data }) => {
            if (!mounted) return;
            if (data?.role === "admin") setRedirectTo("/admin-dashboard");
            else if (data?.role === "teacher") setRedirectTo("/teacher-dashboard");
            else setRedirectTo("/student-dashboard");
          });
      } else {
        setRedirectTo("/");
      }
    });
    return () => { mounted = false; };
  }, []);

  if (!redirectTo) return <PageLoader />;
  return <Navigate to={redirectTo} replace />;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(isNative); // only show splash in native apps by default

  useEffect(() => { recoverInvalidAuthSession(); }, []);

  // Check for Android updates after splash clears
  const handleSplashComplete = () => {
    setShowSplash(false);
    import('@/lib/androidUpdater').then(({ checkForAndroidUpdate }) => {
      checkForAndroidUpdate();
    });
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DeveloperMessagePopup />
        <Toaster />
        <Sonner position="top-right" richColors closeButton />
        <AppRouter>
          <UpdateBanner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/support" element={<Support />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/download" element={<Download />} />
              <Route
                path="/student-dashboard"
                element={(
                  <ProtectedRoute allowedRoles={STUDENT_ROLES}>
                    <StudentDashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/admin-dashboard"
                element={(
                  <ProtectedRoute allowedRoles={ADMIN_ROLES} requireApproval={false}>
                    <AdminDashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/points-history"
                element={(
                  <ProtectedRoute allowedRoles={STUDENT_ROLES}>
                    <PointsHistory />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/student-portfolio"
                element={(
                  <ProtectedRoute allowedRoles={STUDENT_ROLES}>
                    <StudentPortfolio embedded={false} />
                  </ProtectedRoute>
                )}
              />
              <Route path="/portfolio/:username" element={<StudentPortfolio embedded={false} />} />
              <Route
                path="/teacher-dashboard"
                element={(
                  <ProtectedRoute allowedRoles={TEACHER_ROLES}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                )}
              />
              <Route path="/book/:id" element={<BookDetails />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;