import Link from "next/link";
import { ArrowRight, BookOpen, Shield, Globe, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-xl text-white">📒</span>
            </div>
            <div>
              <h1 className="font-bold text-foreground">حساب کتاب</h1>
              <p className="text-xs text-muted-foreground">Hisaab Kitaab</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Modern Accounting for
            <span className="text-primary"> Your Business</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A bilingual (English/Urdu) accounting system built for Pakistani
            businesses. Manage vouchers, track accounts, and generate reports
            with ease.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg" asChild>
              <Link href="/register" className="flex items-center gap-2">
                Start Free <ArrowRight size={20} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Double Entry System
              </h3>
              <p className="text-muted-foreground">
                Complete double-entry bookkeeping with automatic balance
                verification.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Secure & Private
              </h3>
              <p className="text-muted-foreground">
                Your data is encrypted and protected with row-level security.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Bilingual Support
              </h3>
              <p className="text-muted-foreground">
                Full English and Urdu support with RTL layout switching.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Access Anywhere
              </h3>
              <p className="text-muted-foreground">
                Works on desktop, tablet, and mobile. Access your data from
                anywhere.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-32 text-center">
          <p className="text-muted-foreground">
            Built with ❤️ for Home Sweet Home
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Modernized from the original Access database by Sajjad
          </p>
        </div>
      </main>
    </div>
  );
}
