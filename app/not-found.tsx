import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#1D1611",
          color: "#F1EFE2",
          fontFamily: "'IBM Plex Mono', monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'LT Superior Serif', Georgia, serif",
              fontSize: "48px",
              marginBottom: "16px",
              letterSpacing: "-0.02em",
            }}
          >
            404
          </h1>
          <p style={{ color: "#A89888", marginBottom: "32px" }}>
            This page doesn&apos;t exist yet.
          </p>
          <Link
            href="/"
            style={{
              color: "#D4875A",
              textDecoration: "none",
              borderBottom: "1px solid #D4875A",
              paddingBottom: "2px",
            }}
          >
            Back to egregore.xyz
          </Link>
        </div>
      </body>
    </html>
  );
}
