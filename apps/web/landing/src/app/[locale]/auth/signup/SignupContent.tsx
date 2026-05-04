"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

type PlanType = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
type ModuleType = "hotel" | "shop" | "restaurant" | "beauty";

const moduleIcons: Record<ModuleType, string> = {
  hotel: "🏨",
  shop: "🛍️",
  restaurant: "🍽️",
  beauty: "💅",
};

const loginUrls: Record<ModuleType, string> = {
  hotel: process.env.NEXT_PUBLIC_HOTEL_URL || "https://saas-hotel.vercel.app",
  shop: process.env.NEXT_PUBLIC_STORE_URL || "https://shop.geobiz.app",
  restaurant: process.env.NEXT_PUBLIC_RESTAURANT_URL || "https://rest.geobiz.app",
  beauty: process.env.NEXT_PUBLIC_BEAUTY_URL || "https://beauty.geobiz.app",
};

const HOTEL_PMS_V2_URL =
  process.env.NEXT_PUBLIC_HOTEL_PMS_V2_URL ||
  "https://sastumro.com";

function getLoginUrl(module: ModuleType, plan: PlanType): string {
  if (module === "hotel" && (plan === "PROFESSIONAL" || plan === "ENTERPRISE")) {
    return HOTEL_PMS_V2_URL;
  }
  return loginUrls[module];
}

export default function SignupContent() {
  const t = useTranslations("Auth.signup");
  const searchParams = useSearchParams();

  const moduleFromUrl = (searchParams?.get("module") || "hotel") as ModuleType;
  const planFromUrl = (searchParams?.get("plan")?.toUpperCase() || "STARTER") as PlanType;
  const validPlan = ["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(planFromUrl)
    ? planFromUrl
    : "STARTER";

  const [module, setModule] = useState<ModuleType>(moduleFromUrl);
  const [plan, setPlan] = useState<PlanType>(validPlan);

  // ⚡ Module-specific translations
  const validModule: ModuleType = ["hotel", "shop", "restaurant", "beauty"].includes(module)
    ? module
    : "hotel";
  const icon = moduleIcons[validModule];
  const loginUrl = getLoginUrl(validModule, plan);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    hotelName: "",
    restaurantType: "restaurant",
    company: "",
    taxId: "",
    address: "",
    city: "",
    country: "Georgia",
    phone: "",
    website: "",
    bankName: "",
    bankAccount: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ hotelCode?: string; loginUrl?: string } | null>(null);

  useEffect(() => {
    setModule(moduleFromUrl);
    setPlan(validPlan);
  }, [moduleFromUrl, validPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError(t("errors.passwordsMismatch"));
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError(t("errors.passwordTooShort"));
      setLoading(false);
      return;
    }

    const requiredFields = ["name", "email", "hotelName", "company", "taxId", "address", "city", "phone"];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setError(t("errors.fillAllRequired"));
        setLoading(false);
        return;
      }
    }

    const apiUrl =
      module === "shop"
        ? "/api/store/register"
        : module === "restaurant"
          ? "/api/restaurant/register"
          : module === "beauty"
            ? "/api/beauty/register"
            : "/api/register";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          organizationName: formData.hotelName,
          restaurantType: formData.restaurantType,
          module,
          plan,
          company: formData.company,
          taxId: formData.taxId,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          phone: formData.phone,
          website: formData.website,
          bankName: formData.bankName,
          bankAccount: formData.bankAccount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("errors.registrationError"));
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess({
        hotelCode: data.hotelCode || data.restCode || data.storeCode || data.beautyCode,
        loginUrl: data.loginUrl,
      });
    } catch {
      setError(t("errors.systemError"));
      setLoading(false);
    }
  };

  if (success) {
    const finalLoginUrl =
      success.loginUrl ||
      (loginUrl.startsWith("http")
        ? `${loginUrl.replace(/\/$/, "")}/login`
        : `https://${loginUrl.replace(/\/$/, "")}/login`);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {t(`modules.${validModule}.successTitle`)}
          </h1>
          <p className="text-gray-600 mb-6">
            {t(`modules.${validModule}.successSubtitle`)}
          </p>

          {success.hotelCode && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-sm text-blue-600 mb-2">
                {t(`modules.${validModule}.codeLabel`)}
              </p>
              <div className="text-5xl font-mono font-bold text-blue-700 tracking-widest">
                {success.hotelCode}
              </div>
              <p className="text-xs text-blue-500 mt-2">{t("saveCode")}</p>
            </div>
          )}

          <a
            href={finalLoginUrl}
            className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {t("loginToSystem")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2" aria-hidden="true">{icon}</div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t(`modules.${validModule}.title`)}
          </h1>
          <p className="text-gray-500 mt-1">
            {t(`modules.${validModule}.subtitle`)}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("selectedPlan")}</p>
              <p className="text-lg font-semibold text-blue-600">
                {t(`plans.${plan}`)}
              </p>
            </div>
            <Link
              href={`/modules/${module}/pricing`}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {t("changePlan")}
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {t("personalInfo")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("fullName")}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("fullNamePlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("emailPlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("password")}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("passwordPlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("confirmPassword")}
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("confirmPasswordPlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              <span aria-hidden="true">{icon}</span> {t(`modules.${validModule}.bizSectionTitle`)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t(`modules.${validModule}.bizLabel`)}
                </label>
                <input
                  type="text"
                  value={formData.hotelName}
                  onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t(`modules.${validModule}.bizPlaceholder`)}
                  required
                  disabled={loading}
                />
              </div>
              {module === "restaurant" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("restaurantType")}
                  </label>
                  <select
                    value={formData.restaurantType}
                    onChange={(e) => setFormData({ ...formData, restaurantType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                    disabled={loading}
                  >
                    <option value="restaurant">{t("restaurantTypes.restaurant")}</option>
                    <option value="cafe">{t("restaurantTypes.cafe")}</option>
                    <option value="bar">{t("restaurantTypes.bar")}</option>
                    <option value="pub">{t("restaurantTypes.pub")}</option>
                    <option value="bistro">{t("restaurantTypes.bistro")}</option>
                    <option value="fastfood">{t("restaurantTypes.fastfood")}</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("companyName")}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t(`modules.${validModule}.companyPlaceholder`)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("taxId")}
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="123456789"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("phone")}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("phonePlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("address")}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("addressPlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("city")}
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("cityPlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("country")}
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="Georgia">{t("countries.Georgia")}</option>
                  <option value="Azerbaijan">{t("countries.Azerbaijan")}</option>
                  <option value="Armenia">{t("countries.Armenia")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("website")}
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="https://"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {t("bankInfo")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("bankName")}
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("bankNamePlaceholder")}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("bankAccount")}
                </label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder={t("bankAccountPlaceholder")}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? t("loading") : t("submit")}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {t("alreadyHaveAccount")}{" "}
          <a
            href={
              loginUrl.startsWith("http")
                ? `${loginUrl.replace(/\/$/, "")}/login`
                : `https://${loginUrl.replace(/\/$/, "")}/login`
            }
            className="text-blue-600 hover:underline"
          >
            {t("loginLink")}
          </a>
        </div>
      </div>
    </div>
  );
}
