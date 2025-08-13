import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopProgressBarWithSuspense } from "@/components/layout/top-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'NOURX — Portail clients & admin',
    template: '%s · NOURX'
  },
  description: 'Gestion de projets, jalons, tâches, documents et facturation — NOURX',
  applicationName: 'NOURX',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  icons: [
    { rel: 'icon', url: '/CNourx.png' },
    { rel: 'apple-touch-icon', url: '/CNourx.png' },
  ],
  openGraph: {
    title: 'NOURX — Portail clients & admin',
    description: 'Gestion de projets, jalons, tâches, documents et facturation — NOURX',
    url: '/',
    siteName: 'NOURX',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOURX — Portail clients & admin',
    description: 'Gestion de projets, jalons, tâches, documents et facturation — NOURX',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}>
        <TopProgressBarWithSuspense />
        {children}
      </body>
    </html>
  );
}
