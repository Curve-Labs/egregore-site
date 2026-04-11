import { RootProvider } from "fumadocs-ui/provider/next";
import Script from "next/script";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./docs.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Egregore Docs",
    template: "%s | Egregore",
  },
  description:
    "Documentation for Egregore — a shared intelligence layer for teams using Claude Code.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function DocsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
        <Script src="https://scripts.simpleanalyticscdn.com/latest.js" strategy="afterInteractive" />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" referrerPolicy="no-referrer-when-downgrade" />
        </noscript>
      </body>
    </html>
  );
}
