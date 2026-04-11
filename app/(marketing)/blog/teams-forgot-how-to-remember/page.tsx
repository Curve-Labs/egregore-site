import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "./CopyButton";

export const metadata: Metadata = {
  title: "Context Gardening — Egregore",
  description:
    "You don't manufacture context, you cultivate the conditions for it to grow.",
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
          <div className="article-meta">From the lab &middot; Feb 2026</div>
          <h1>Context Gardening</h1>
          <p className="lede">
            What liberates us is the knowledge of who we were, what we became,
            where we were, whereinto we have been thrown, whereto we speed, where
            from we are redeemed, what birth is and what rebirth.
            <br />
            <em>&mdash; Theodotus</em>
          </p>
        </header>

        <p>
          The prevailing term in AI tooling right now is &ldquo;context
          engineering&rdquo; &mdash; the idea that if you&apos;re methodical
          enough, you can assemble the optimal set of information for a model to
          work with. Curate the right documents, structure the right prompts,
          retrieve the right chunks. Engineering implies a known target state:
          you design, you build, you ship.
        </p>

        <p>
          But this framing carries a quiet assumption that doesn&apos;t survive
          contact with real organizations. It assumes one person &mdash; or one
          system &mdash; can know in advance what the relevant context is. That
          relevance is a property of documents rather than a property of
          situations. That the right information can be selected before the
          moment it&apos;s needed.
        </p>

        <p>In practice, context doesn&apos;t work like that. Context emerges.</p>

        <ArticleSectionDivider />

        <h2>What Emergence Knows</h2>

        <p>
          Context gardening starts from a different premise: you don&apos;t
          manufacture context, you cultivate the conditions for it to grow. You
          set the soil &mdash; the environment, the capture methodologies, the
          tooling &mdash; and then you let the organic practice of teams working
          together produce the context that matters.
        </p>

        <p>
          The difference is not cosmetic. Engineering is top-down: someone
          decides what&apos;s relevant, builds a pipeline to surface it, and
          hopes the selection holds. Gardening is bottom-up: priorities emerge
          from interactions, from the actual texture of work, from what teams
          repeatedly reach for and what they let fall away. No one has to
          synthetically tell the model what matters. The model discovers what
          matters by being embedded in a space where real work is happening.
        </p>

        <p>
          This is closer to how institutional knowledge actually forms. Nobody
          writes the definitive document on &ldquo;how we make decisions
          here.&rdquo; Instead, patterns accumulate. Certain references become
          load-bearing. Informal agreements harden into defaults. The
          organization develops a sense &mdash; distributed across people,
          artifacts, and habits &mdash; of what its context actually is.
        </p>

        <ArticleSectionDivider />

        <h2>Egregore as a Context Garden</h2>

        <p>
          When teams work inside an Egregore environment, every session
          contributes to a growing substrate of organizational intelligence. The
          knowledge graph doesn&apos;t start from a schema designed by an
          administrator &mdash; it grows from the actual patterns of
          collaboration. What teams discuss, what they reference, what they build
          on, what they contradict &mdash; all of this feeds the soil.
        </p>

        <p>
          The result is that AI systems plugged into an Egregore workspace
          don&apos;t operate on a static retrieval set. They operate on living
          context &mdash; context that reflects real priorities, real tensions,
          real momentum. The difference shows up immediately in output quality.
          Materials produced within this environment are not generically
          competent. They are tailor-made, because the context they draw from was
          tailor-grown by the people who will use them.
        </p>

        <p>
          This is where the gardening metaphor earns its weight. A garden
          doesn&apos;t produce the same thing every season. It responds to what
          you plant, how you tend it, what the conditions are. An Egregore
          environment does the same &mdash; it becomes more aware, more attuned,
          more useful as the team&apos;s work deepens.
        </p>

        <ArticleSectionDivider />

        <h2>What This Means in Practice</h2>

        <p>
          Context gardening shifts the burden of AI effectiveness away from
          prompt engineering and retrieval optimization and toward something more
          fundamental: the quality of the collaborative environment itself.
        </p>

        <p>
          If your team works in fragmented tools with no shared substrate, there
          is no garden &mdash; only scattered seeds. If your team works inside a
          persistent, accumulative environment, context grows whether or not
          anyone is explicitly tending it. The capture happens at the level of
          practice, not process.
        </p>

        <p>
          The most powerful context for AI is the one that no single person
          designed &mdash; the kind that can only emerge from the collective
          intelligence of the people who produced it. Egregore is the environment
          where that emergence happens.
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
