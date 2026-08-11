import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { recoverInvalidAuthSession } from "@/lib/authCleanup";
import Maintenance from "./pages/Maintenance";

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

const STUDENT_ROLES = ["student"] as const;
const ADMIN_ROLES = ["admin"] as const;
const TEACHER_ROLES = ["teacher", "admin"] as const;

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => { recoverInvalidAuthSession(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Maintenance />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;