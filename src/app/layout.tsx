import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UserProvider } from "@/components/user-context";
import { Header } from "@/components/layout/header";
import { getSession, getActiveTeam } from "@/lib/session";
import { prisma } from "@/lib/db";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Repan",
  description: "Team Task Tracker",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, teamId] = await Promise.all([getSession(), getActiveTeam()]);

  const initialUser = session
    ? {
        id: session.id,
        name: session.name,
        role: session.role,
        avatarColor: session.avatarColor,
        isSuperAdmin: session.isSuperAdmin,
      }
    : null;

  let initialTeam: { id: string; name: string } | null = null;
  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
    initialTeam = team ?? null;
  }

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakarta.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <UserProvider initialUser={initialUser} initialTeam={initialTeam}>
            {initialUser && <Header />}
            <main className="flex-1">{children}</main>
            <footer className="py-3 text-center text-[10px] text-muted-foreground/40">
              v0.1.0
            </footer>
          </UserProvider>
        </Providers>
      </body>
    </html>
  );
}
