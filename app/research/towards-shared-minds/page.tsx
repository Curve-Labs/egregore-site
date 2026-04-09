import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "./CopyButton";

export const metadata: Metadata = {
  title: "Towards Shared Minds — Egregore",
  description:
    "Groups who share context and frontier capabilities will be the most significant force in AI-native production.",
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
          <div className="article-meta">From the lab &middot; Apr 2026</div>
          <h1>Towards Shared Minds</h1>
          <p className="lede">
            Magical times are upon us. Yet it somehow feels atomised.
            <br />
            Everyone with their workflows, their agents, their terminals turning
            natural language into unprecedented capabilities, yet all they can
            share is stories of their single-player adventures. Our visceral
            rebellion against this status quo led us to Egregore.
          </p>
        </header>

        <p>
          What started as an AI-native OS for our lab quickly turned into an
          internal obsession. Shortly after, we knew this was what we needed to
          build &mdash; and build it through it.
        </p>

        <p>
          We are excited to share what culminated since then and some thoughts on
          why we think this matters for the present-future and a few mental
          models which we developed to think about this paradigm.
        </p>

        <p>
          As Alan Kay put it, &ldquo;the computer is an instrument whose music
          is ideas&rdquo; &mdash; and the interface determines which ideas are
          playable. The terminal makes AI composable in a way no other interface
          does. Egregore turns running AI in your terminal (currently Claude
          Code) into a multiplayer experience by using a shared memory system and
          specific commands which facilitate coordination workflows. This base
          capability has a few key implications:
        </p>

        <ul>
          <li>
            context generation becomes a byproduct of organizational flows
          </li>
          <li>
            workspace and coordination space are unified in the most AI-native
            form factor, massively reducing switching and transaction costs
          </li>
          <li>
            organizational learning and adaptability which yields emergent
            capabilities downstream of needs
          </li>
        </ul>

        <ArticleSectionDivider />

        <h2>Mental Models</h2>

        <p>
          Since this is all genuinely new territory, let me share a few mental
          models for those who want to experiment with this. First off, Egregore
          is a relational context engine which proactively engages with your
          processes. Let it ask questions &mdash; presets for user responses are
          contextually generated but typing (or even better, speaking) your
          response will always yield better results.
        </p>

        <p>
          I refer to this as context gardening (as opposed to engineering): the
          overhead approaches zero as context surfaces are pegged to the edges of
          the organization, and these edges multiply as the organization
          interacts.
        </p>

        <p>
          Second, Egregore, with Claude Code, lives and operates on your file
          system. Make sure you sandbox the specific repositories you want to
          share with fellow egregorians. It is the living infrastructure of your
          group. Both its body and its soul will change through use. Lean into
          this and find ways to inscribe yourselves into the substrate for
          enhanced bi-directional sensing.
        </p>

        <p>
          Egregore uses commands like /activity, /handoff, /save and /reflect to
          crystallize specific workflows to reduce cognitive load (both tokens
          and neuroelectric) of coordinated work. They are heteronoetic schelling
          points &mdash; crystallized for speed and cohesion, but designed to be
          mutated and composed for variety and evolution.
        </p>

        <ArticleSectionDivider />

        <h2>Beyond Single-Player</h2>

        <p>
          AI massively empowers solo users, however, it is clear to us &mdash;
          after a month building Egregore with Egregore &mdash; that groups who
          share context and frontier capabilities will be the most significant
          force in AI-native production. Today&apos;s AI discourse overfits
          everything to its priors debating whether your company is a file system
          or not, while the consequences of this for AI-induced organizational
          cybernetics are much wider.
        </p>

        <p>
          Beyond the determinacy of enterprise or startup logic, such
          pluri-cognitive substrate could have profound political impact by
          facilitating social choice aggregation with unprecedented granularity,
          constituting very credible evolutive routes for &ldquo;democracy&rdquo;.
          Egregoric substrates could become primary media through which
          open-source agentic capabilities are ported and shared, selected
          through generations of experimentation. The path that Hugging Face
          charted for OS models will be extended to agentic development and
          learning by Egregore. With radical generalizability, solo-entrepreneurs
          with many-agents can use their Egregores as a compounding memory and
          coordination surface utilising the cutting edge practices from the
          community.
        </p>

        <p>
          Egregore is an organizational substrate of co-learning and selection
          &mdash; an environment whose primary output isn&apos;t decisions or
          products but an expanding variety of possible configurations,
          coordination patterns, and capabilities. The wider the gene pool such
          organizational space maintains, the more of the future it can
          metabolise.
        </p>

        <ArticleSectionDivider />

        <h2>A Note of Sobriety</h2>

        <p>
          Having said that, it is worth microdosing a bit of sobriety along with
          the utopian delirium. Egregore works best with daily organic usage
          across work and research contexts. The ability to work with the
          frontier model in Claude Code through long sessions is currently a
          privilege few can afford. These costs, both on the model side and
          Egregore optimizations, are bound to come down rather quickly &mdash;
          but we need to be frank that being an Egregore power user is currently
          most suitable for Claude Max users (which costs &gt;100$/m). For
          instance while building Egregore, daily &gt;100$ bills from Anthropic
          weren&apos;t uncommon.
        </p>

        <p>
          Besides the costs, the other challenge we should face is cognitive
          security. AI is already a pitch-dark forest, with adversarial
          techniques popping up as fast as new capabilities. As interfacing with
          AI becomes a collective enterprise, the attack surface increases
          together with the network effects. This is something we need to engage
          with proactively, hopefully as a community of builders.
        </p>

        <ArticleSectionDivider />

        <h2>Origin Story</h2>

        <p>
          Before Egregore had a name, Oguzhan (Oz) and I had been experimenting
          for almost a year with dynamic knowledge graphs and emergent
          ontologies. Things we built somehow lacked a critical piece, which was
          hard to see at first. At some point we decided to radically recalibrate
          &mdash; to stop thinking about product, and to remodel how we think and
          work from scratch, without overly attaching to any form factor. Simply
          play &ndash; together.
        </p>

        <p>
          A few days later, at a cafe in Kreuzberg, we were deploying our
          AI-native &ldquo;lab OS&rdquo;, unsure where it would take us. Within
          a week we were exchanging handoffs every day, asking for context across
          workstreams, logging research. The magic hit fast. Every time we did
          something outside of Egregore we started questioning why &mdash; why
          pass on the opportunity to generate collective context?
        </p>

        <p>
          What followed was an insanely animated month for me, Oguzhan (Oz) and
          the Curve Labs team, obsessively dogfooding and shipping features. We
          can&apos;t wait to finally push this out, whether that means validating
          our visions or delusions.
        </p>

        <ArticleSectionDivider />

        <p>
          We are starting with an alpha testing phase through a waitlist. We will
          engage with design partners who are capable builders, open to sharing
          their experiences and genuinely excited about what Egregore can become
          and what they can do with it. Hopefully in the near future we will get
          to a public release.
        </p>

        <p>Til next time.</p>
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
