import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UserProvider } from "@/components/user-context";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/session";

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
  const session = await getSession();
  const initialUser = session
    ? {
        id: session.id,
        name: session.name,
        role: session.role,
        avatarColor: session.avatarColor,
      }
    : null;

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakarta.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <UserProvider initialUser={initialUser}>
            {initialUser && <Header />}
            <main className="flex-1">{children}</main>
          </UserProvider>
        </Providers>
      </body>
    </html>
  );
}
