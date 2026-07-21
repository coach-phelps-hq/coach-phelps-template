import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Workouts from "./pages/Workouts";
import WorkoutTimer from "./pages/workout-timer";
import RunAnalytics from "./pages/RunAnalytics";
import MonthlyAnalytics from "./pages/MonthlyAnalytics";
import BadmintonAnalytics from "./pages/BadmintonAnalytics";
import BadmintonMatchAnalytics from "./pages/BadmintonMatchAnalytics";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/workouts" component={Workouts} />
      <Route path="/workouts/:id" component={WorkoutTimer} />
      <Route path="/run" component={RunAnalytics} />
      <Route path="/monthly" component={MonthlyAnalytics} />
      <Route path="/badminton" component={BadmintonAnalytics} />
      <Route path="/badminton-match-analytics" component={BadmintonMatchAnalytics} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Gate — on the hosted multi-tenant deployment, blocks the dashboard behind
 * GitHub sign-in and repo resolution. On local `npm run dev` (no /api routes
 * served), AuthContext resolves to "local" immediately and this is a no-op.
 */
function Gate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.status === "loading") return null;
  if (auth.status === "unauthenticated") return <Login />;
  if (auth.status === "onboarding") return <Onboarding />;
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <Gate>
              <Router />
            </Gate>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
