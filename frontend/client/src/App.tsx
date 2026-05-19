import { Router as WouterRouter, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import LogoutPage from "@/pages/logout";
import Dashboard from "@/pages/dashboard";
import DriverDashboard from "@/pages/driver-dashboard";
import VehiclesPage from "@/pages/vehicles";
import LiveMapPage from "@/pages/live-map";
import VehicleDetailsPage from "@/pages/vehicle-details";
import DriversPage from "@/pages/drivers";
import MissionsPage from "@/pages/missions";
import ReportsPage from "@/pages/reports";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import UsersPage from "@/pages/users";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

type AllowedRole = "superadmin" | "operateur" | "chauffeur";

function normalizeRole(role?: string): AllowedRole {
  if (!role) return "chauffeur";
  if (role === "admin") return "superadmin";
  if (role === "user" || role === "driver") return "chauffeur";
  return role as AllowedRole;
}

function ProtectedRoute({ 
  component: Component, 
  allowedRoles,
}: { 
  component: React.ComponentType;
  allowedRoles?: AllowedRole[];
}) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  
  if (!token) {
    return <LoginPage />;
  }

  if (userStr) {
    const user = JSON.parse(userStr);
    const role = normalizeRole(user.role);
    
    // If role restrictions are specified, check them
    if (allowedRoles && !allowedRoles.includes(role)) {
      // Chauffeurs always go to their dashboard
      if (role === "chauffeur") {
        return <DriverDashboard />;
      }
      // Superadmin trying to access operateur-only → redirect to dashboard
      return <Dashboard />;
    }
    
    // Drivers accessing dashboard → driver dashboard
    if (role === "chauffeur" && Component === Dashboard) {
      return <DriverDashboard />;
    }
  }

  return <Component />;
}

function AppRouter() {
  const base = import.meta.env.PROD ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';
  return (
    <WouterRouter base={base}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/logout" component={LogoutPage} />
        <Route path="/api/logout" component={LogoutPage} />
        
        {/* Dashboard — superadmin & operateur see admin dashboard; chauffeur sees driver dashboard */}
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} allowedRoles={["superadmin", "operateur"]} />} />
        
        {/* GPS Live Map — operateur + superadmin */}
        <Route path="/map" component={() => <ProtectedRoute component={LiveMapPage} allowedRoles={["superadmin", "operateur"]} />} />
        
        {/* Vehicles — operateur manages, superadmin views */}
        <Route path="/vehicles" component={() => <ProtectedRoute component={VehiclesPage} allowedRoles={["superadmin", "operateur"]} />} />
        <Route path="/vehicles/:id" component={() => <ProtectedRoute component={VehicleDetailsPage} allowedRoles={["superadmin", "operateur"]} />} />
        
        {/* Drivers — operateur manages, superadmin views */}
        <Route path="/drivers" component={() => <ProtectedRoute component={DriversPage} allowedRoles={["superadmin", "operateur"]} />} />
        
        {/* Missions — everyone can see but only operateur can create/edit */}
        <Route path="/missions" component={() => <ProtectedRoute component={MissionsPage} />} />
        
        {/* Reports — operateur + superadmin */}
        <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} allowedRoles={["superadmin", "operateur"]} />} />
        
        {/* User management — superadmin only */}
        <Route path="/users" component={() => <ProtectedRoute component={UsersPage} allowedRoles={["superadmin"]} />} />
        
        {/* Profile & Settings — everyone */}
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
        
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
