import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ApexLayout from "./components/ApexLayout";

// Pages
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardLeader from "./pages/DashboardLeader";
import EvaluateNow from "./pages/EvaluateNow";
import Employees from "./pages/Employees";
import Evaluations from "./pages/Evaluations";
import Revenue from "./pages/Revenue";
import Settings from "./pages/Settings";
import CycleHistory from "./pages/CycleHistory";
import EmployeePanel from "./pages/EmployeePanel";
import Scoreboard from "./pages/Scoreboard";
import EvaluationHistory from "./pages/EvaluationHistory";
import Users from "./pages/Users";

function Router() {
  return (
    <ApexLayout>
      <Switch>
        {/* Admin Routes */}
        <Route path="/" component={DashboardAdmin} />
        <Route path="/employees" component={Employees} />
        <Route path="/revenue" component={Revenue} />
        <Route path="/cycles" component={CycleHistory} />
        <Route path="/settings" component={Settings} />
        <Route path="/users" component={Users} />
        
        {/* Leader/Captain Routes */}
        <Route path="/leader" component={DashboardLeader} />
        <Route path="/evaluate" component={EvaluateNow} />
        <Route path="/evaluations" component={Evaluations} />
        <Route path="/scoreboard" component={Scoreboard} />
        <Route path="/evaluation-history" component={EvaluationHistory} />
        
        {/* Employee Routes */}
        <Route path="/my-panel" component={EmployeePanel} />
        
        {/* Fallback */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ApexLayout>
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
