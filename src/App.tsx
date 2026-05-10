import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

const DossierDetail = lazy(() => import("./pages/DossierDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Signup = lazy(() => import("./pages/Signup"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Dossiers = lazy(() => import("./pages/Dossiers"));
const Mandataires = lazy(() => import("./pages/Mandataires"));
const Conseillers = lazy(() => import("./pages/Conseillers"));
const Facturation = lazy(() => import("./pages/Facturation"));
const Alertes = lazy(() => import("./pages/Alertes"));
const Biens = lazy(() => import("./pages/Biens"));
const Chantiers = lazy(() => import("./pages/Chantiers"));
const Parametres = lazy(() => import("./pages/Parametres"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Prospects = lazy(() => import("./pages/Prospects"));
const Partenaires = lazy(() => import("./pages/Partenaires"));
const Messagerie = lazy(() => import("./pages/Messagerie"));
const ExportComptable = lazy(() => import("./pages/ExportComptable"));
const Login = lazy(() => import("./pages/Login"));

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/prospects" element={<ProtectedRoute><Prospects /></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
              <Route path="/dossiers" element={<ProtectedRoute><Dossiers /></ProtectedRoute>} />
              <Route path="/dossiers/:id" element={<ProtectedRoute><DossierDetail /></ProtectedRoute>} />
              <Route path="/biens" element={<ProtectedRoute><Biens /></ProtectedRoute>} />
              <Route path="/mandataires" element={<ProtectedRoute requiredRole="super_admin"><Mandataires /></ProtectedRoute>} />
              <Route path="/conseillers" element={<ProtectedRoute requiredRole="super_admin"><Conseillers /></ProtectedRoute>} />
              <Route path="/partenaires" element={<ProtectedRoute><Partenaires /></ProtectedRoute>} />
              <Route path="/chantiers" element={<ProtectedRoute><Chantiers /></ProtectedRoute>} />
              <Route path="/facturation" element={<ProtectedRoute requiredRole="super_admin"><Facturation /></ProtectedRoute>} />
              <Route path="/export-comptable" element={<ProtectedRoute requiredRole="super_admin"><ExportComptable /></ProtectedRoute>} />
              <Route path="/alertes" element={<ProtectedRoute><Alertes /></ProtectedRoute>} />
              <Route path="/messagerie" element={<ProtectedRoute><Messagerie /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
              <Route path="/client/:token" element={<ClientPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
