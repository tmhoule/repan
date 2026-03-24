import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UserProvider } from "@/components/user-context";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Repan",
  description: "Gamified team task tracker",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
