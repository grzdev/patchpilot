import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatchPilot — Find your next mission",
  description: "Discover open-source projects, investigate live issues, and save your next contribution.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

