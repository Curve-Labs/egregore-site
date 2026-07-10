"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSession, listStars, type Session } from "./account-api";

const DEMO_SESSION: Session = {
  user_id: "demo-user",
  name: "Oz",
  email: "oz@example.com",
  handle: "oz",
  badge: "founding member",
  created_at: "2026-07-01T10:00:00Z",
};

function emailLocalPart(email?: string | null) {
  return (email || "").split("@")[0] || "";
}

function identityLabel(session: Session) {
  if (session.handle) return `@${session.handle}`;
  return session.name || emailLocalPart(session.email) || "account";
}

function avatarInitial(session: Session) {
  return identityLabel(session).replace(/^@/, "").charAt(0).toUpperCase() || "E";
}

export default function EmissaryChrome() {
  const pathname = usePathname();
  const params = useSearchParams();
  const demoMode = params.get("demo") === "1";
  const [session, setSession] = useState<Session | null>(demoMode ? DEMO_SESSION : null);
  const [starsCount, setStarsCount] = useState<number | null>(demoMode ? 2 : null);

  useEffect(() => {
    let cancelled = false;

    if (demoMode) {
      setSession(DEMO_SESSION);
      setStarsCount(2);
      return () => {
        cancelled = true;
      };
    }

    setSession(null);
    setStarsCount(null);
    getSession()
      .then((next) => {
        if (cancelled) return;
        setSession(next);
        listStars()
          .then((res) => {
            if (!cancelled) setStarsCount((res.stars || []).length);
          })
          .catch(() => {
            if (!cancelled) setStarsCount(null);
          });
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setStarsCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  const directoryOn = pathname === "/emissary" || pathname === "/emissary/browse";
  const starsOn = pathname === "/emissary/account";
  const label = useMemo(() => (session ? identityLabel(session) : ""), [session]);

  return (
    <header className="em-chrome">
      <nav className="appnav" aria-label="emissaries">
        <Link href="/emissary/browse" className="wordmark">
          emissaries
        </Link>
        <div className="links">
          <Link
            href="/emissary/browse"
            className={directoryOn ? "on" : undefined}
            aria-current={directoryOn ? "page" : undefined}
          >
            directory
          </Link>
          {session ? (
            <Link
              href="/emissary/account#stars"
              className={starsOn ? "on" : undefined}
              aria-current={starsOn ? "page" : undefined}
            >
              ★ stars{starsCount === null ? "" : ` ${starsCount}`}
            </Link>
          ) : null}
        </div>
        <div className="right">
          {session ? (
            <Link className="identity" href="/emissary/account">
              <span className="avatar" aria-hidden="true">
                {avatarInitial(session)}
              </span>
              <span className="handle">{label}</span>
            </Link>
          ) : (
            <Link className="btn" href="/emissary/account">
              connect your agent
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
