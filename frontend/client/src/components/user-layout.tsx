import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { 
  Shield,
  ClipboardList,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const base = import.meta.env.PROD ? "/Fleet-Manager" : "";
    window.location.href = `${base}/login`;
  };

  const navItems = [
    { href: "/dashboard", label: "Accueil", icon: Home },
    { href: "/missions", label: "Mes Missions", icon: ClipboardList },
    { href: "/profile", label: "Profil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 to-cream-200 font-sans">
      {/* Top Navbar - Similar to Landing Page */}
      <nav className="fixed w-full z-50 bg-cream-50/90 backdrop-blur-md border-b border-gold-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-crimson-500 to-crimson-700 p-2 rounded-full shadow-lg shadow-crimson-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gold-500 rounded-full"></div>
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-crimson-600 to-crimson-800 bg-clip-text text-transparent">FleetGuard</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "gap-2 rounded-full px-5",
                      isActive 
                        ? "bg-gradient-to-r from-crimson-500 to-crimson-600 text-white shadow-lg shadow-crimson-500/25" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gold-50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Info & Logout - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-crimson-500 to-crimson-600 flex items-center justify-center border-2 border-gold-300/50 shadow-lg">
                <span className="font-bold text-white text-sm">{user?.firstName?.[0] || "U"}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500">Chauffeur</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 rounded-full border-crimson-200 text-crimson-600 hover:text-white hover:bg-crimson-500 hover:border-crimson-500"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-cream-50 border-t border-gold-200/50 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {/* User Info - Mobile */}
              <div className="flex items-center gap-3 pb-4 mb-2 border-b border-gold-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-crimson-500 to-crimson-600 flex items-center justify-center border-2 border-gold-300/50">
                  <span className="font-bold text-white">{user?.firstName?.[0] || "U"}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">Chauffeur</p>
                </div>
              </div>

              {/* Nav Items - Mobile */}
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                        isActive 
                          ? "bg-gradient-to-r from-crimson-500 to-crimson-600 text-white" 
                          : "text-gray-600 hover:bg-gold-50"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}

              {/* Logout - Mobile */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-crimson-600 hover:bg-crimson-50 w-full text-left mt-2"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content - Vertical Flow */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="bg-gradient-to-br from-crimson-500 to-crimson-600 p-1.5 rounded-full">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white">FleetGuard</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 text-gold-500 fill-gold-500" />
            ))}
          </div>
          <p className="text-sm mt-4 md:mt-0">© 2026 FleetGuard. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
