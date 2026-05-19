import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * This page is no longer needed since password reset now uses a 5-digit code
 * entered directly on the login page. Redirect to login.
 */
export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);

  return null;
}
