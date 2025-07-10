import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { usePersistentRoute } from "@/hooks/use-persistent-route";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import StyleTransfer from "./pages/StyleTransfer";
import ResearchAnswer from "./pages/ResearchAnswer";
import MyDocuments from "./pages/MyDocuments";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import AuthenticatedLayout from "./components/AuthenticatedLayout";

const queryClient = new QueryClient();

function AuthGate() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const navigate = useNavigate();
  
  // Use persistent route hook
  usePersistentRoute();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Check onboarding status when user changes
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        // Check if user has any documents
        const { data: docs, error: docsError } = await supabase
          .from("documents")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        
        setHasDocuments(docs && docs.length > 0);

        // Check if user has completed onboarding by looking at user_profiles table
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error checking user profile:', profileError);
        }
        
        setHasCompletedOnboarding(profile?.onboarding_completed || false);
      }
    };
    checkOnboardingStatus();
  }, [user]);

  // Improved redirect logic
  useEffect(() => {
    if (!loading && user) {
      const path = window.location.pathname;
      
      // If user has never completed onboarding, send to onboarding
      if (!hasCompletedOnboarding && path !== "/onboarding") {
        navigate("/onboarding", { replace: true });
      } else if (hasCompletedOnboarding && path === "/onboarding") {
        navigate("/", { replace: true });
      }
      // Never redirect from /onboarding if not onboarded
    }
  }, [loading, user, hasCompletedOnboarding, navigate]);

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<Landing user={user} />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/demo" element={<Index />} />
      
      {/* Authenticated Routes */}
      <Route path="/" element={
        user ? (
          <AuthenticatedLayout>
            <Dashboard hasDocuments={hasDocuments} hasCompletedOnboarding={hasCompletedOnboarding} />
          </AuthenticatedLayout>
        ) : (
          <Landing user={user} />
        )
      } />
      <Route path="/style-transfer" element={
        user ? (
          <AuthenticatedLayout>
            <StyleTransfer />
          </AuthenticatedLayout>
        ) : (
          <Landing user={user} />
        )
      } />
      <Route path="/research-answer" element={
        user ? (
          <AuthenticatedLayout>
            <ResearchAnswer />
          </AuthenticatedLayout>
        ) : (
          <Landing user={user} />
        )
      } />
      <Route path="/my-documents" element={
        user ? (
          <AuthenticatedLayout>
            <MyDocuments hasCompletedOnboarding={hasCompletedOnboarding} />
          </AuthenticatedLayout>
        ) : (
          <Landing user={user} />
        )
      } />
      <Route path="/history" element={
        user ? (
          <AuthenticatedLayout>
            <History />
          </AuthenticatedLayout>
        ) : (
          <Landing user={user} />
        )
      } />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
