import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "./CopyButton";

const URL_PATH = "/research/context-gardening";
const PAGE_URL = `https://egregore.xyz${URL_PATH}`;
const IMAGE_URL = "https://egregore.xyz/og/context-gardening.png";
const PUBLISHED = "2026-02-10";
const MODIFIED = "2026-11-19";

const DEFINITION =
  "Context gardening is the practice of letting an organization’s context accumulate as a byproduct of its work, in a form agents can read and people can correct, before anyone knows which part of it will be needed.";

const DESCRIPTION =
  "Context gardening is the practice of letting an organization’s context accumulate as a byproduct of its work, readable by agents and correctable by people.";

export const metadata: Metadata = {
  title: "Context Gardening: What Comes After Context Engineering — Egregore",
  description: DESCRIPTION,
  authors: [{ name: "Cem Dagdelen" }],
  alternates: { canonical: URL_PATH },
  openGraph: {
    type: "article",
    url: URL_PATH,
    siteName: "Egregore",
    title: "Context Gardening",
    description:
      "Models now choose their own context. What they can choose from is the part an organization has to grow.",
    publishedTime: PUBLISHED,
    modifiedTime: MODIFIED,
    authors: ["Cem Dagdelen"],
    images: [
      {
        url: "/og/context-gardening.png",
        width: 1200,
        height: 630,
        alt: "Context Gardening — Egregore",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Context Gardening",
    description:
      "Models now choose their own context. What they can choose from is the part an organization has to grow.",
    images: ["/og/context-gardening.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Context Gardening",
  alternativeHeadline: "What comes after context engineering",
  description: DESCRIPTION,
  image: IMAGE_URL,
  datePublished: PUBLISHED,
  dateModified: MODIFIED,
  inLanguage: "en",
  mainEntityOfPage: PAGE_URL,
  author: { "@type": "Person", name: "Cem Dagdelen" },
  publisher: {
    "@type": "Organization",
    name: "Egregore",
    url: "https://egregore.xyz",
    logo: {
      "@type": "ImageObject",
      url: "https://egregore.xyz/favicon-512.png",
    },
  },
  about: {
    "@type": "DefinedTerm",
    name: "Context gardening",
    description: DEFINITION,
    url: PAGE_URL,
  },
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

export default function ContextGardening() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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
          <div className="article-meta">
            Cem Dagdelen &middot; <time dateTime={PUBLISHED}>Feb 2026</time>,
            revised <time dateTime={MODIFIED}>Nov 2026</time>
          </div>
          <h1>Context Gardening</h1>
          <p className="lede">
            How an organization’s context accumulates from its own work, and
            why that now matters more than how it is selected.
          </p>
        </header>

        <blockquote className="epigraph">
          <p>
            What liberates us is the knowledge of who we were, what we became,
            where we were, whereinto we have been thrown, whereto we speed,
            wherefrom we are redeemed, what birth is and what rebirth.
          </p>
          <cite>Theodotus</cite>
        </blockquote>

        <p>
          <strong>Context gardening</strong> is the practice of letting an
          organization’s context accumulate as a byproduct of its work, in a
          form agents can read and people can correct, before anyone knows
          which part of it will be needed.
        </p>

        <p>
          The term answers an older one.{" "}
          <a
            href="https://www.anthropic.com/research/effective-context-engineering-for-ai-agents"
            rel="noopener"
          >
            Context engineering
          </a>{" "}
          is the craft of assembling the right information for a model before
          it acts: the right documents, the right instructions, the right
          retrieved passages. It is a real craft and it produced real gains.
          Two things have since changed around it.
        </p>

        <ArticleSectionDivider />

        <h2>Selection has moved inside the model</h2>

        <p>
          The first change is that models now do this assembly themselves. A
          current agent searches, opens files, follows references and decides
          what belongs in front of it, with more patience than the person who
          used to prepare its prompt. The engineering was delegated. Rich
          Sutton’s{" "}
          <a
            href="http://www.incompleteideas.net/IncIdeas/BitterLesson.html"
            rel="noopener"
          >
            bitter lesson
          </a>{" "}
          describes the pattern: methods that hand the work to the general
          system outlast methods that encode a person’s judgment about it. The
          sensible response is to give the agent what it needs and get out of
          its way.
        </p>

        <p>
          The second change follows from the first. Once selection is cheap,
          supply becomes the constraint. An agent can only choose among things
          that exist in a form it can read, and most of what an organization
          knows does not. Why the pricing changed in March. What was tried
          before the current design, and why it was dropped. Who is
          accountable for the decision everyone now treats as settled. What
          the customer said on the call that nobody wrote up. This material
          lives in people’s heads, in closed chat windows, in sessions that
          ended.
        </p>

        <p>
          Nobody can engineer their way to it, because relevance belongs to
          situations. Which fragment will matter is known only at the moment
          it is needed, usually by someone other than the person who produced
          it. The one strategy that works is to keep more than you can justify
          today, and to keep it well.
        </p>

        <ArticleSectionDivider />

        <h2>Why a garden</h2>

        <p>
          A warehouse holds what was put there on purpose. A garden produces
          things nobody placed. We chose the word for three properties.
        </p>

        <p>
          Growth comes from conditions. Nobody on a working team has time to
          document as a separate task, and documentation written as a chore is
          stale by the time it is filed. In a garden, the record is what the
          work leaves behind.
        </p>

        <p>
          A garden is tended. A folder of transcripts is a pile, and piles do
          not improve with size. Tending means giving each piece a kind, a
          date, an owner and a source, and noticing which areas are alive this
          month and which have gone quiet.
        </p>

        <p>
          A garden is shared ground. What one person plants, another harvests.
          The value of context grows with the number of people working over
          it, since every new record can connect to all the earlier ones.
        </p>

        <ArticleSectionDivider />

        <h2>How Egregore keeps one</h2>

        <p>
          <Link href="/">Egregore</Link> is the environment we built to
          practise this. Its mechanics are plain.
        </p>

        <p>
          Capture rides on work. People work with their agents as they already
          do. When a session ends, when a meeting is brought in, when one
          person hands work to another, the system reflects on what happened
          and files the parts worth keeping. A handoff written for a colleague
          is, in the same act, something the organization learned.
        </p>

        <p>
          Records have kinds, and kinds have obligations. A decision names the
          person accountable for it. A finding cites its source. A handoff
          states what was done, what is open and who picks it up. These
          obligations let an agent act on a six-month-old record with the
          confidence it would have in a fresh one, and they let a person check
          the agent’s answer.
        </p>

        <p>
          Everything is a plain file the organization owns. The memory is text
          in a versioned repository, readable without Egregore and by
          whichever agent a person prefers. Text merges on its own, so nobody
          opens a review request to remember something. What a person marks
          private stays on their machine.
        </p>

        <p>
          There is no master map. No administrator designs a schema in
          advance. Views of the memory are generated from the records for the
          question at hand: by active work, by customer, by person. When the
          organization changes shape, the view is generated again. The records
          stay.
        </p>

        <ArticleSectionDivider />

        <h2>What grows</h2>

        <p>
          An agent in such an environment starts each task already holding
          what the organization decided and why, without anyone having briefed
          it. A person who joins on Monday works, from the first session, with
          context the team spent a year producing. When someone leaves, their
          reasoning stays. A question gets an answer that names its sources.
          Work produced there is specific to the organization, because the
          context behind it was grown by the people who will use the result.
        </p>

        <p>
          The effect compounds. Each session leaves the next one better
          supplied, for everyone at once. Some of what appears was never
          planned: the meeting about one client that answers a question about
          another, found because both were kept.
        </p>

        <p>
          Two cautions belong here. A garden is thin in its first weeks, so it
          pays to bring in what already exists on the first day: documents,
          recordings, old decisions. And capture without consent is
          surveillance. People must be able to see what is kept, hold things
          back and correct the record. A memory its members do not trust will
          be starved by them.
        </p>

        <ArticleSectionDivider />

        <h2>Starting</h2>

        <p>
          The practice works at three sizes, and it is best begun at the
          smallest. One person’s garden is already useful to that person. A
          team’s follows when two of them notice they are answering each
          other’s questions. A company’s is those teams with boundaries drawn
          between them. None of the three needs a taxonomy project. Each needs
          only that the work happen somewhere it can leave a trace.
        </p>

        <p>
          Models will keep getting better at deciding what to read. No model
          can read what an organization never kept.
        </p>

        <p className="article-related">
          Also from the lab:{" "}
          <Link href="/research/towards-shared-minds">
            Towards Shared Minds
          </Link>
        </p>
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
