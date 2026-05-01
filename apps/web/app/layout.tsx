import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MantleScout — Smart Money Intelligence for Mantle",
  description: "Track and classify wallet behavior on Mantle Network DEXes. AI-powered attestations backed by on-chain evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
        {children}
      </body>
    </html>
  );
}
