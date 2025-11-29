"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Save, Building2, User, Globe } from "lucide-react";

export default function SettingsPage() {
  const [companyInfo, setCompanyInfo] = useState({
    company_name: "",
    company_name_urdu: "",
    address: "",
    phone_numbers: "",
    email: "",
    fiscal_year_start: "",
    fiscal_year_end: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const { t, language, setLanguage } = useLanguage();
  const supabase = createClient();

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    const { data } = await supabase.from("company_info").select("*").single();

    if (data) {
      setCompanyInfo({
        company_name: data.company_name || "",
        company_name_urdu: data.company_name_urdu || "",
        address: data.address || "",
        phone_numbers: data.phone_numbers || "",
        email: data.email || "",
        fiscal_year_start: data.fiscal_year_start || "",
        fiscal_year_end: data.fiscal_year_end || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "Not authenticated" });
      setSaving(false);
      return;
    }

    // Upsert company info
    const { error } = await supabase.from("company_info").upsert(
      {
        user_id: user.id,
        ...companyInfo,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Settings saved successfully!" });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("nav.settings")}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your company settings and preferences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg glass ${
            message.type === "success"
              ? "text-green-400 border border-green-500/30"
              : "text-red-400 border border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Company Information */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Company Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Company Name (English)
            </label>
            <input
              type="text"
              value={companyInfo.company_name}
              onChange={(e) =>
                setCompanyInfo({ ...companyInfo, company_name: e.target.value })
              }
              className="w-full px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground"
              placeholder="Your Company Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Company Name (اردو)
            </label>
            <input
              type="text"
              dir="rtl"
              value={companyInfo.company_name_urdu}
              onChange={(e) =>
                setCompanyInfo({
                  ...companyInfo,
                  company_name_urdu: e.target.value,
                })
              }
              className="w-full px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground font-urdu"
              placeholder="کمپنی کا نام"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Address
            </label>
            <textarea
              value={companyInfo.address}
              onChange={(e) =>
                setCompanyInfo({ ...companyInfo, address: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground"
              placeholder="Company Address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Phone Numbers
            </label>
            <input
              type="text"
              value={companyInfo.phone_numbers}
              onChange={(e) =>
                setCompanyInfo({
                  ...companyInfo,
                  phone_numbers: e.target.value,
                })
              }
              className="w-full px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground"
              placeholder="+92 XXX XXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={companyInfo.email}
              onChange={(e) =>
                setCompanyInfo({ ...companyInfo, email: e.target.value })
              }
              className="w-full px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground"
              placeholder="contact@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Fiscal Year Start
            </label>
            <input
              type="date"
              value={companyInfo.fiscal_year_start}
              onChange={(e) =>
                setCompanyInfo({
                  ...companyInfo,
                  fiscal_year_start: e.target.value,
                })
              }
              className="w-full px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Fiscal Year End
            </label>
            <input
              type="date"
              value={companyInfo.fiscal_year_end}
              onChange={(e) =>
                setCompanyInfo({
                  ...companyInfo,
                  fiscal_year_end: e.target.value,
                })
              }
              className="w-full px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Globe className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Language & Display
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Interface Language
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setLanguage("en")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  language === "en"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 glass hover:border-primary/50"
                }`}
              >
                <div className="font-medium">English</div>
                <div className="text-sm text-muted-foreground">
                  Left to Right
                </div>
              </button>
              <button
                onClick={() => setLanguage("ur")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  language === "ur"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 glass hover:border-primary/50"
                }`}
              >
                <div className="font-medium font-urdu">اردو</div>
                <div className="text-sm text-muted-foreground">
                  Right to Left
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
