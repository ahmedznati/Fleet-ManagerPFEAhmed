import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Clear authentication
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Redirect to login
      setTimeout(() => {
        const base = import.meta.env.PROD ? "/Fleet-Manager" : "";
        window.location.href = `${base}/login`;
    }, 500);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-slate-600">Logging out...</p>
      </div>
    </div>
  );
}
