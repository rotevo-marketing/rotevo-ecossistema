import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Derived at build time; a public review flag alone cannot enable production demos.
    NEXT_PUBLIC_ROTEVO_FINANCE_MODE: process.env.VERCEL_ENV === "production" ? "disabled"
      : process.env.NEXT_PUBLIC_ROTEVO_FINANCE_REVIEW === "true" ? "review"
      : !process.env.VERCEL_ENV && process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:54321" && process.env.ROTEVO_FINANCE_ENABLED === "true" ? "local" : "disabled",
  },
};

export default nextConfig;
