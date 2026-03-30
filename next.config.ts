import type { NextConfig } from "next";
import { execSync } from "child_process";

let buildId = "dev";
try {
  const hash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  buildId = `${date}-${hash}`;
} catch {
  // Not a git repo or git not available (e.g., Docker build)
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  buildId = date;
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
};

export default nextConfig;
