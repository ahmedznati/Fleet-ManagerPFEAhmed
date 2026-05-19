import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { 
  LayoutDashboard, 
  Map, 
  Car, 
  Settings, 
  LogOut, 
  Menu,
  ShieldCheck,
  Shield,
  Users,
  UserCircle,
  ClipboardList,
  BarChart3,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocation as useWouterLocation } from "wouter";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useWouterLocation();
  const { user, isSuperAdmin, isOperateur, isChauffeur, isAdmin } = useUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const base = import.meta.env.PROD ? "/Fleet-Manager" : "";
    window.location.href = `${base}/login`;
  };

  // Build nav items based on role
  const navItems = (() => {
    if (isSuperAdmin) {
      return [
        { href: "/dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
        { href: "/map", label: "Carte en Direct", icon: Map },
        { href: "/vehicles", label: "Flotte", icon: Car },
        { href: "/drivers", label: "Chauffeurs", icon: UserCircle },
        { href: "/users", label: "Gestion Utilisateurs", icon: Users },
        { href: "/reports", label: "Rapports", icon: BarChart3 },
        { href: "/settings", label: "Paramètres", icon: Settings },
      ];
    }
    if (isOperateur) {
      return [
        { href: "/dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
        { href: "/map", label: "Suivi GPS", icon: Map },
        { href: "/vehicles", label: "Flotte", icon: Car },
        { href: "/drivers", label: "Chauffeurs", icon: UserCircle },
        { href: "/missions", label: "Missions", icon: ClipboardList },
        { href: "/reports", label: "Rapports", icon: BarChart3 },
        { href: "/settings", label: "Paramètres", icon: Settings },
      ];
    }
    // chauffeur
    return [
      { href: "/missions", label: "Mes Missions", icon: ClipboardList },
      { href: "/profile", label: "Mon Profil", icon: User },
    ];
  })();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white">
      <div className="p-6 border-b border-gold-900/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-gradient-to-br from-crimson-500 to-crimson-700 p-2 rounded-full shadow-lg shadow-crimson-500/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gold-500 rounded-full"></div>
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-cream-200 bg-clip-text text-transparent">FleetGuard</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-gradient-to-r from-crimson-600 to-crimson-700 text-white shadow-lg shadow-crimson-500/25 font-semibold" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )} onClick={() => setIsMobileOpen(false)}>
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                isActive ? "text-white" : "text-gray-500 group-hover:text-gold-400"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gold-900/30 bg-gray-950/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="User" className="w-10 h-10 rounded-full border-2 border-gold-500/50" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-crimson-600 to-crimson-700 flex items-center justify-center border-2 border-gold-500/30 shadow-lg">
              <span className="font-bold text-white">{user?.firstName?.[0] || user?.username?.[0]?.toUpperCase() || "U"}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName || user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate font-mono">{user?.matricule || user?.email}</p>
            {isAdmin && (
              <Badge className="mt-1 text-xs bg-gradient-to-r from-gold-500 to-gold-600 text-gray-900 border-0">
                <Shield className="w-3 h-3 mr-1" />
                {isSuperAdmin ? "Super Admin" : "Opérateur"}
              </Badge>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-crimson-800/50 text-gray-300 hover:text-white hover:bg-crimson-600/20 hover:border-crimson-600/50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 to-cream-200 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50 shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur shadow-lg">
            <Menu className="w-6 h-6 text-gray-700" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-gray-900 border-r-gray-800">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>
    </div>
  );
}
