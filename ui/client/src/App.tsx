import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Deprecated from "./pages/Deprecated";
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
      <Route path="/deprecated" component={Deprecated} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
