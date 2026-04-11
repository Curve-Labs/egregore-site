import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://egregore.xyz"),
  title: "Egregore — Claude Code, now multiplayer",
  description:
    "A shared intelligence layer for teams using Claude Code. Persistent memory, async handoffs, and accumulated knowledge across sessions and people.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://egregore.xyz",
    siteName: "Egregore",
    title: "Egregore — Towards shared minds",
    description:
      "A shared intelligence layer for teams using Claude Code. Persistent memory, async handoffs, and accumulated knowledge across sessions and people.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Egregore — Towards shared minds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Egregore — Towards shared minds",
    description:
      "A shared intelligence layer for teams using Claude Code.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
