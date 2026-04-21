import type { Metadata } from "next";
import Link from "next/link";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://egregore.xyz"),
  title: "Set up Egregore",
  description: "Create a shared intelligence layer for your team.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
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
        <div className="grid-overlay" aria-hidden="true" />

        <div className="setup-page">
          <header className="setup-header">
            <Link href="/" className="setup-header-logo" aria-label="Egregore home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_egregore.svg" alt="egregore" height={33} />
            </Link>
          </header>

          <div className="grid-line" aria-hidden="true" />

          <main className="setup-main">
            <div className="setup-container">{children}</div>
          </main>
        </div>

        <footer className="site-footer">
          <span className="footer-inquiries">
            For enterprise inquiries — <a href="mailto:info@egregore.xyz">info@egregore.xyz</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
