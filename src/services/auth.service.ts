/**
 * Authentication Service
 * Handles user authentication with localStorage persistence
 */

import { createClient } from "@/lib/supabase/client";
import { AUTH_CONFIG } from "@/config/constants";
import type { User, AuthState } from "@/types";

const supabase = createClient();

/**
 * Get current auth state from localStorage
 */
export function getAuthState(): AuthState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(AUTH_CONFIG.storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.userId && parsed.email) {
        return {
          userId: parsed.userId,
          email: parsed.email,
          name: parsed.name,
          isAuthenticated: true,
        };
      }
    }

    // Fallback to old storage key for backwards compatibility
    const oldStored = localStorage.getItem(AUTH_CONFIG.userStorageKey);
    if (oldStored) {
      const parsed = JSON.parse(oldStored);
      if (parsed.id && parsed.email) {
        // Migrate to new format
        const newState = {
          userId: parsed.id,
          email: parsed.email,
          name: parsed.name || parsed.email.split("@")[0],
        };
        localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(newState));
        return {
          ...newState,
          isAuthenticated: true,
        };
      }
    }
  } catch (error) {
    console.error("Error parsing auth state:", error);
    clearAuth();
  }

  return null;
}

/**
 * Get current user ID (quick accessor)
 */
export function getCurrentUserId(): string | null {
  const state = getAuthState();
  return state?.userId || null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthState()?.isAuthenticated ?? false;
}

/**
 * Login user with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("password_hash", password)
      .single();

    if (error || !user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Store auth state
    const authState = {
      userId: user.id,
      email: user.email,
      name: user.name || user.email.split("@")[0],
    };

    localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(authState));
    localStorage.setItem(AUTH_CONFIG.userStorageKey, JSON.stringify(user));
    localStorage.setItem("user_id", user.id);

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Register a new user
 */
export async function register(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Check if user exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", params.email.toLowerCase())
      .single();

    if (existing) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Create user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email: params.email.toLowerCase(),
        password_hash: params.password,
        name: params.name || params.email.split("@")[0],
      })
      .select()
      .single();

    if (error || !user) {
      return {
        success: false,
        error: error?.message || "Failed to create account",
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Logout user and clear auth state
 */
export function logout(): void {
  clearAuth();
}

/**
 * Clear all auth data from localStorage
 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(AUTH_CONFIG.storageKey);
  localStorage.removeItem(AUTH_CONFIG.userStorageKey);
  localStorage.removeItem("user_id");
}

/**
 * Get full user data from database
 */
export async function getCurrentUser(): Promise<User | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}
