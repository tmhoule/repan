/**
 * Promote a user to super admin by name.
 *
 * Usage:
 *   npx tsx scripts/make-superadmin.ts "Todd"
 *   npx tsx scripts/make-superadmin.ts "Todd" --set-password Secret123
 *
 * Requires DATABASE_URL in the environment.
 */
import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const args = process.argv.slice(2);
  const name = args[0];

  if (!name) {
    console.error("Usage: npx tsx scripts/make-superadmin.ts <name> [--set-password <password>]");
    process.exit(1);
  }

  const passwordIdx = args.indexOf("--set-password");
  const password = passwordIdx !== -1 ? args[passwordIdx + 1] : undefined;

  const user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (!user) {
    console.error(`User "${name}" not found.`);
    const users = await prisma.user.findMany({ select: { name: true }, orderBy: { name: "asc" } });
    console.error("Available users:", users.map((u) => u.name).join(", "));
    process.exit(1);
  }

  const data: Record<string, unknown> = {
    isSuperAdmin: true,
    role: "manager",
  };

  if (password) {
    if (password.length < 6) {
      console.error("Password must be at least 6 characters.");
      process.exit(1);
    }
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id: user.id }, data });

  console.log(`${user.name} is now a super admin.${password ? " Password updated." : ""}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
