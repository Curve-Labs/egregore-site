import type { Metadata } from "next";
import Script from "next/script";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://egregore.xyz"),
  title: "Research — Egregore",
  description: "Research from Egregore on shared minds and multiplayer intelligence.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
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
      <body>
        {children}
        <Script src="https://scripts.simpleanalyticscdn.com/latest.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
