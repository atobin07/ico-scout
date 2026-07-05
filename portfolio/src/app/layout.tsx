import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizOps Suite — Business Intelligence Portfolio",
  description: "Expert KPI dashboards, sales pipeline tools, and AI-powered lead intelligence for modern businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
