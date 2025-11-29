/**
 * useAuth Hook
 * Provides authentication state and actions throughout the application
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthState,
  login as loginService,
  logout as logoutService,
  register as registerService,
} from "@/services/auth.service";
import { AUTH_CONFIG } from "@/config/constants";
import type { AuthState, User } from "@/types";

interface UseAuthReturn {
  user: AuthState | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check auth state on mount
  useEffect(() => {
    const authState = getAuthState();
    setUser(authState);
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await loginService(email, password);

        if (result.success && result.user) {
          const authState: AuthState = {
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
            isAuthenticated: true,
          };
          setUser(authState);
          router.push(AUTH_CONFIG.routes.dashboard);
          router.refresh();
          return { success: true };
        }

        return { success: false, error: result.error };
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    logoutService();
    setUser(null);
    router.push(AUTH_CONFIG.routes.login);
    router.refresh();
  }, [router]);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsLoading(true);
      try {
        const result = await registerService({ email, password, name });

        if (result.success) {
          // Auto-login after registration
          return await login(email, password);
        }

        return { success: false, error: result.error };
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  return {
    user,
    isLoading,
    isAuthenticated: !!user?.isAuthenticated,
    login,
    logout,
    register,
  };
}
