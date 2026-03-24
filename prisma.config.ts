import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("src", "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} src/prisma/seed.ts",
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");
      const connectionString = process.env.DATABASE_URL!;
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
