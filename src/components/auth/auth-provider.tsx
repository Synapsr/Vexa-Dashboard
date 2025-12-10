"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

// Routes that don't require authentication
const publicRoutes = ["/login"];

// Routes that require admin privileges (optional - for future use)
const adminRoutes = ["/admin"];

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Check if current route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If on a public route, just render children
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated and not on public route, redirect to login
  if (!isAuthenticated) {
    // Use useEffect to avoid render loop
    if (typeof window !== "undefined") {
      router.push("/login");
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}
