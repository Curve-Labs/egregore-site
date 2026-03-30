import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "./CopyButton";

export const metadata: Metadata = {
  title: "Teams forgot how to remember — Egregore",
  description:
    "Every organization runs on context. AI made the problem worse. We built Egregore to fix it.",
};

function Divider() {
  return (
    <div className="divider">
      <div className="diamond" />
    </div>
  );
}

function ArticleSectionDivider() {
  return (
    <div className="article-section-divider">
      <div className="diamond" />
    </div>
  );
}

export default function BlogPost() {
  return (
    <>
      <nav className="blog-nav">
        <Link className="blog-nav-logo" href="/">
          <img src="/logo_egregore.svg" alt="egregore" height={28} />
        </Link>
        <Link className="blog-nav-back" href="/">
          &larr; back
        </Link>
      </nav>

      <Divider />

      <article className="article">
        <header className="article-header">
          <div className="article-meta">From the lab &middot; Mar 2026</div>
          <h1>Teams forgot how to remember.</h1>
          <p className="lede">
            Every organization runs on context. AI made the problem worse, not
            better. We built Egregore to fix it.
          </p>
        </header>

        <p>
          Every organization runs on context. Who decided what. Why it was
          decided. What was tried before. What someone learned last Thursday that
          would save someone else three hours on Monday.
        </p>

        <p>
          That context lives in Slack threads nobody will search. In meeting
          recordings nobody will watch. In someone&apos;s head — until they leave.
        </p>

        <p>
          AI made this worse, not better. Coding agents are powerful. But
          they&apos;re amnesiac. Every session starts from zero. The developer
          remembers. The agent doesn&apos;t. Close the tab, context gone.
        </p>

        <p>We built Egregore to fix this.</p>

        <ArticleSectionDivider />

        <h2>A shared brain for teams using Claude Code.</h2>

        <p>
          Egregore sits inside Claude Code — the terminal you already use. No new
          app. No new tab. No dashboard to check.
        </p>

        <p>
          You open Claude Code. Egregore is already there. It knows what your
          teammates did yesterday. It knows what decisions were made last month.
          It knows which questions are still open and how they connect to each
          other.
        </p>

        <p>
          Normal Claude Code: one person, one session, gone when you close the
          terminal.
        </p>

        <p>
          Egregore: every session feeds shared memory. Every person&apos;s work
          connects. Nothing gets lost.
        </p>

        <ArticleSectionDivider />

        <h2>The core loop is three moves.</h2>

        <p>
          Declare what you&apos;re working on. Do the work. Capture what you
          learned.
        </p>

        <p>That&apos;s it. Everything else builds on this.</p>

        <p>
          When you finish a session, you <code>/handoff</code>. Your context —
          decisions, blockers, open threads — flows into shared memory. The next
          person who opens Claude Code sees it. Full context. No meeting required.
        </p>

        <p>
          Over days and weeks, this compounds. The team&apos;s memory grows
          denser, more connected, more useful. Not because anyone is maintaining
          documentation. Because the work itself produces knowledge as a
          byproduct.
        </p>

        <ArticleSectionDivider />

        <h2 id="graph">Context becomes structure.</h2>

        <p>Most tools store information. Egregore connects it.</p>

        <p>
          A knowledge graph maps people to sessions to artifacts to quests. Not as
          a visualization feature — as infrastructure. When you ask &quot;what do
          we know about auth?&quot; the answer draws from every session, every
          decision, every handoff that touched it. Across people. Across weeks.
        </p>

        <p>
          This changes what an AI agent can do. Instead of answering from a single
          conversation, Claude answers from the organization&apos;s entire history
          of thinking about a problem.
        </p>

        <p>
          The graph isn&apos;t something you interact with. It&apos;s something
          that makes everything else smarter.
        </p>

        <ArticleSectionDivider />

        <h2 id="commands">Commands, not features.</h2>

        <p>Egregore doesn&apos;t have a UI. It has slash commands.</p>

        <ul className="command-list">
          <li>
            <code>/activity</code> — see what&apos;s happening across the team.
          </li>
          <li>
            <code>/handoff</code> — leave context for the next person.
          </li>
          <li>
            <code>/reflect</code> — capture a decision, finding, or pattern.
          </li>
          <li>
            <code>/quest</code> — start an open-ended exploration the team can
            contribute to.
          </li>
          <li>
            <code>/ask</code> — pose a question to a teammate, asynchronously.
          </li>
        </ul>

        <p>
          Each command reads from and writes to the shared brain. Each one makes
          the next session smarter than the last.
        </p>

        <p>
          There&apos;s no app to learn. If you can type a slash, you can use
          Egregore.
        </p>

        <ArticleSectionDivider />

        <h2>The problem with tools is the tool.</h2>

        <p>
          Notion, Confluence, Linear, Jira — they all assume the same thing:
          humans will maintain the knowledge base. Write the docs. Update the
          status. Tag the ticket.
        </p>

        <p>
          They won&apos;t. They never have. The gap between what a team knows and
          what a team has written down is enormous. And it grows every week.
        </p>

        <p>
          Egregore takes the opposite approach. Knowledge capture happens inside
          the work, not after it. You don&apos;t document a decision — you make a
          decision, and <code>/reflect</code> extracts it. You don&apos;t write a
          status update — you <code>/handoff</code>, and your teammates see
          exactly where things stand.
        </p>

        <p>
          The system gets smarter because people are working. Not because they
          stopped working to update a tool.
        </p>

        <ArticleSectionDivider />

        <h2>What we&apos;re building toward.</h2>

        <p>
          Today, Egregore runs inside a single team&apos;s Claude Code
          environment. Memory is a git repo. The graph indexes it. Commands make
          it usable.
        </p>

        <p>
          Soon: anyone can create an egregore with a single command. Deploy it for
          your team, your open-source project, your research group. Five minutes
          from zero to shared intelligence.
        </p>

        <p>
          After that: egregores that learn from each other. Patterns discovered in
          one organization surface as possibilities in another. Not by sharing
          private data — by sharing structure. The shape of good decisions. The
          rhythm of productive collaboration. The patterns that make teams work.
        </p>

        <p>
          An organization should be able to think across sessions, across people,
          across time.
        </p>

        <p>That&apos;s what Egregore does.</p>
      </article>

      <Divider />

      <footer className="article-footer">
        <Link className="back-link" href="/">
          &larr; Back to egregore.xyz
        </Link>
        <CopyButton />
      </footer>
    </>
  );
}
