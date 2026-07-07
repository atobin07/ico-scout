import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PrimeLayer Contract Intel",
  description: "Automated federal + state + grant opportunity discovery and scoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="h-full bg-[#0d1117] text-[#e6edf3] antialiased">{children}</body>
    </html>
  );
}
