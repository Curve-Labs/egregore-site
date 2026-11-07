import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://egregore.xyz"),
  title: "Desk — Egregore",
  description: "Plan, run, and review work across Egregore agents.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
