"use client";

import { useEffect, useRef } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    };

    card.addEventListener("mousemove", handleMouseMove);
    return () => card.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div
          ref={cardRef}
          className="spotlight-card bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-lg" />
              <div className="relative w-16 h-16 bg-zinc-800/80 backdrop-blur rounded-full flex items-center justify-center border border-white/10">
                <span className="text-3xl">📒</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight-custom mb-2">
              {title}
            </h1>
            {subtitle && <p className="text-zinc-400 text-sm">{subtitle}</p>}
          </div>

          {/* Content */}
          <div className="space-y-4">{children}</div>
        </div>

        {footer && (
          <p className="text-center text-zinc-500 text-sm mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
