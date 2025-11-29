"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      const supabase = createClient();
      const { data: user, error: queryError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("password_hash", password)
        .single();

      console.log("Login attempt:", {
        email: email.toLowerCase(),
        queryError,
        user,
      });

      if (queryError || !user) {
        setError(queryError?.message || "Invalid email or password");
      } else {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("user_id", user.id);
        router.push("/dashboard");
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

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          label="Password"
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-primary hover:underline font-medium"
        >
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
