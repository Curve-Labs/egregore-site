import type { Metadata } from "next";
import { Suspense } from "react";
import "../globals.css";
import "@/components/emissary/meridian.css";
import "@/components/emissary/chrome.css";
import EmissaryChrome from "@/components/emissary/EmissaryChrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://egregore.xyz"),
  title: "Emissaries — Egregore",
  description: "Browse, collect, and manage emissaries for your agent.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function EmissaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="meridian em-app">
        <Suspense fallback={null}>
          <EmissaryChrome />
        </Suspense>
        {children}
        <footer className="em-app-foot">
          egregore · emissaries — <a href="mailto:info@egregore.xyz">info@egregore.xyz</a>
        </footer>
      </body>
    </html>
  );
}
