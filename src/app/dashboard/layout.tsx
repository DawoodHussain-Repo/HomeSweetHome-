"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LanguageProvider } from "@/context/LanguageContext";
import { PageLoader } from "@/components/shared/LoadingStates";
import { getAuthState } from "@/services/auth.service";

interface User {
  id: string;
  email: string;
  name?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check unified auth state
    const authState = getAuthState();

    if (authState?.isAuthenticated) {
      setUser({
        id: authState.userId,
        email: authState.email,
        name: authState.name,
      });
    } else {
      // Fallback to old storage for backwards compatibility
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } catch {
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <LanguageProvider>
      <div className="flex h-screen bg-background selection:bg-primary selection:text-primary-foreground">
        <Sidebar user={{ email: user.email, name: user.name }} />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto scrollbar-thin pb-20 lg:pb-0">
            <div className="min-h-full page-content">{children}</div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </LanguageProvider>
  );
}
