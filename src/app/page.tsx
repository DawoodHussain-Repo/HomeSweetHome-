import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Shield,
  Globe,
  Smartphone,
  BarChart3,
  FileText,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px]" />

      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700/50">
              <span className="text-xl">📒</span>
            </div>
            <div>
              <h1 className="font-bold text-zinc-100 tracking-tight">
                حساب کتاب
              </h1>
              <p className="text-xs text-zinc-500">Hisaab Kitaab</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              asChild
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-full px-6"
            >
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center pt-20 pb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-400 mb-8 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Modernized for the digital age</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-zinc-100">Modern Accounting</span>
            <br />
            <span className="bg-gradient-to-r from-zinc-400 via-zinc-300 to-zinc-400 bg-clip-text text-transparent">
              for Your Business
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            A bilingual (English/Urdu) accounting system built for Pakistani
            businesses. Manage vouchers, track accounts, and generate reports
            with ease.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-full px-8 text-base font-semibold shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              asChild
            >
              <Link href="/register" className="flex items-center gap-2">
                Start Free <ArrowRight size={18} strokeWidth={2} />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-full px-8 text-base"
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="spotlight-card rounded-2xl p-1 bg-zinc-900/50 border border-zinc-800">
            <div className="rounded-xl bg-zinc-900 p-4 md:p-8 space-y-4">
              {/* Mock Dashboard Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">
                    Total Balance
                  </div>
                  <div className="text-3xl font-bold text-zinc-100">
                    Rs. 1.2Cr
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
                    +12.5%
                  </div>
                </div>
              </div>

              {/* Mock Chart */}
              <div className="h-32 flex items-end justify-around gap-2 pt-4">
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div key={i} className="flex-1 flex gap-1 justify-center">
                    <div
                      className="w-full max-w-[20px] bg-emerald-500/50 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <div
                      className="w-full max-w-[20px] bg-red-500/50 rounded-t"
                      style={{ height: `${height * 0.7}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-20">
          <FeatureCard
            icon={BookOpen}
            title="Double Entry System"
            description="Complete double-entry bookkeeping with automatic balance verification."
            color="blue"
          />
          <FeatureCard
            icon={Shield}
            title="Secure & Private"
            description="Your data is encrypted and protected with row-level security."
            color="emerald"
          />
          <FeatureCard
            icon={Globe}
            title="Bilingual Support"
            description="Full English and Urdu support with RTL layout switching."
            color="purple"
          />
          <FeatureCard
            icon={Smartphone}
            title="Access Anywhere"
            description="Works on desktop, tablet, and mobile. Access your data from anywhere."
            color="amber"
          />
        </div>

        {/* Stats Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="spotlight-card rounded-2xl p-8 bg-zinc-900/30 border border-zinc-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-zinc-100 mb-1">
                  100+
                </div>
                <div className="text-sm text-zinc-500">Account Types</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-zinc-100 mb-1">4</div>
                <div className="text-sm text-zinc-500">Voucher Types</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-zinc-100 mb-1">∞</div>
                <div className="text-sm text-zinc-500">Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-zinc-100 mb-1">2</div>
                <div className="text-sm text-zinc-500">Languages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center text-zinc-100 mb-8">
            Everything you need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiniFeature icon={FileText} label="Cash Receipts" />
            <MiniFeature icon={FileText} label="Cash Payments" />
            <MiniFeature icon={FileText} label="Journal Entries" />
            <MiniFeature icon={BarChart3} label="Trial Balance" />
            <MiniFeature icon={BookOpen} label="Account Ledger" />
            <MiniFeature icon={Users} label="Chart of Accounts" />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-12">
          <p className="text-zinc-500">Built with ❤️ for Home Sweet Home</p>
          <p className="text-sm text-zinc-600 mt-2">
            Modernized from the original Access database by Sajjad
          </p>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: "blue" | "emerald" | "purple" | "amber";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="spotlight-card rounded-2xl p-6 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-all group">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${colors[color]}`}
      >
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
        {title}
      </h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function MiniFeature({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-all">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
      </div>
      <span className="text-zinc-300 text-sm font-medium">{label}</span>
    </div>
  );
}
