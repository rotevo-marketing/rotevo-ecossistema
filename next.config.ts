import type { NextConfig } from "next";
import {financeBuildMode} from "./src/lib/finance/environment.ts";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ROTEVO_FINANCE_MODE: financeBuildMode(
      process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.VERCEL_ENV,
      process.env.ROTEVO_FINANCE_ENABLED, process.env.NEXT_PUBLIC_ROTEVO_FINANCE_REVIEW,
      process.env.ROTEVO_FINANCE_PRODUCTION_APPROVED,
    ),
  },
};

export default nextConfig;
