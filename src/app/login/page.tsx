"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { login } from "@/services/auth.service";
import { AUTH_CONFIG } from "@/config/constants";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthError, PasswordInput } from "@/components/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || "Invalid email or password");
      } else {
        router.push(AUTH_CONFIG.routes.dashboard);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="حساب کتاب"
      subtitle="Hisaab Kitaab - Accounting System"
      footer="Home Sweet Home Accounting System"
    >
      <AuthError message={error} />

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300 text-sm font-medium">
            Email Address
          </Label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full h-11 px-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all"
          />
        </div>

        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          label="Password"
          required
        />

        <button
          type="submit"
          className="w-full h-11 bg-white text-zinc-900 rounded-xl font-semibold hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign In
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-400 mt-4">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-white hover:underline font-medium"
        >
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
