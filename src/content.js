// Article content as structured blocks.
// Types: h2, h3, p, quote, divider

export const ARTICLE_CONTENT = {

  "towards-shared-minds": [
    { type: "quote", text: "Magical times are upon us. Yet it somehow feels.. atomised." },
    { type: "p", text: "Everyone with their workflows, their agents, their terminals turning natural language into unprecedented capabilities, yet all they can share is stories of their single-player adventures. Our visceral rebellion against this status quo led us to Egregore." },
    { type: "divider" },
    { type: "p", text: "What started as an AI-native OS for our lab quickly turned into an internal obsession. Shortly after, we knew this was what we needed to build \u2014 and build it through it." },
    { type: "p", text: "We are excited to share what culminated since then and some thoughts on why we think this matters for the present-future and a few mental models which we developed to think about this paradigm." },
    { type: "p", text: "As Alan Kay put it, \u201Cthe computer is an instrument whose music is ideas\u201D \u2014 and the interface determines which ideas are playable. The terminal makes AI composable in a way no other interface does. Egregore turns running AI in your terminal (currently Claude Code) into a multiplayer experience by using a shared memory system and specific commands which facilitate coordination workflows. This base capability has a few key implications:" },
    { type: "p", text: "\u2022 context generation becomes a byproduct of organizational flows\n\u2022 workspace and coordination space are unified in the most AI-native form factor, massively reducing switching and transaction costs\n\u2022 organizational learning and adaptability which yields emergent capabilities downstream of needs" },
    { type: "divider" },
    { type: "h2", text: "Mental Models" },
    { type: "p", text: "Since this is all genuinely new territory, let me share a few mental models for those who want to experiment with this. First off, Egregore is a relational context engine which proactively engages with your processes. Let it ask questions \u2014 presets for user responses are contextually generated but typing (or even better, speaking) your response will always yield better results." },
    { type: "p", text: "I refer to this as context gardening (as opposed to engineering): the overhead approaches zero as context surfaces are pegged to the edges of the organization, and these edges multiply as the organization interacts." },
    { type: "p", text: "Second, Egregore, with Claude Code, lives and operates on your file system. Make sure you sandbox the specific repositories you want to share with fellow egregorians. It is the living infrastructure of your group. Both its body and its soul will change through use. Lean into this and find ways to inscribe yourselves into the substrate for enhanced bi-directional sensing." },
    { type: "p", text: "Egregore uses commands like /activity, /handoff, /save and /reflect to crystallize specific workflows to reduce cognitive load (both tokens and neuroelectric) of coordinated work. They are heteronoetic schelling points \u2014 crystallized for speed and cohesion, but designed to be mutated and composed for variety and evolution." },
    { type: "divider" },
    { type: "h2", text: "Beyond Single-Player" },
    { type: "p", text: "AI massively empowers solo users, however, it is clear to us \u2014 after a month building Egregore with Egregore \u2014 that groups who share context and frontier capabilities will be the most significant force in AI-native production. Today\u2019s AI discourse overfits everything to its priors debating whether your company is a file system or not, while the consequences of this for AI-induced organizational cybernetics are much wider." },
    { type: "p", text: "Beyond the determinacy of enterprise or startup logic, such pluri-cognitive substrate could have profound political impact by facilitating social choice aggregation with unprecedented granularity, constituting very credible evolutive routes for \u201Cdemocracy\u201D. Egregoric substrates could become primary media through which open-source agentic capabilities are ported and shared, selected through generations of experimentation. The path that Hugging Face charted for OS models will be extended to agentic development and learning by Egregore. With radical generalizability, solo-entrepreneurs with many-agents can use their Egregores as a compounding memory and coordination surface utilising the cutting edge practices from the community." },
    { type: "p", text: "Egregore is an organizational substrate of co-learning and selection \u2014 an environment whose primary output isn\u2019t decisions or products but an expanding variety of possible configurations, coordination patterns, and capabilities. The wider the gene pool such organizational space maintains, the more of the future it can metabolise." },
    { type: "divider" },
    { type: "h2", text: "Sobriety" },
    { type: "p", text: "Having said that, it is worth microdosing a bit of sobriety along with the utopian delirium. Egregore works best with daily organic usage across work and research contexts. The ability to work with the frontier model in Claude Code through long sessions is currently a privilege few can afford. These costs, both on the model side and Egregore optimizations, are bound to come down rather quickly \u2014 but we need to be frank that being an Egregore power user is currently most suitable for Claude Max users (which costs >100$/m). For instance while building Egregore, daily >100$ bills from Anthropic weren\u2019t uncommon." },
    { type: "p", text: "Besides the costs, the other challenge we should face is cognitive security. AI is already a pitch-dark forest, with adversarial techniques popping up as fast as new capabilities. As interfacing with AI becomes a collective enterprise, the attack surface increases together with the network effects. This is something we need to engage with proactively, hopefully as a community of builders." },
    { type: "divider" },
    { type: "h2", text: "Origin" },
    { type: "p", text: "Before Egregore had a name, Oguzhan (Oz) and I had been experimenting for almost a year with dynamic knowledge graphs and emergent ontologies. Things we built somehow lacked a critical piece, which was hard to see at first. At some point we decided to radically recalibrate \u2014 to stop thinking about product, and to remodel how we think and work from scratch, without overly attaching to any form factor. Simply play \u2013 together." },
    { type: "p", text: "A few days later, at a cafe in Kreuzberg, we were deploying our AI-native \u201Clab OS\u201D, unsure where it would take us. Within a week we were exchanging handoffs every day, asking for context across workstreams, logging research. The magic hit fast. Every time we did something outside of Egregore we started questioning why \u2014 why pass on the opportunity to generate collective context?" },
    { type: "p", text: "What followed was an insanely animated month for me, Oguzhan (Oz) and the Curve Labs team, obsessively dogfooding and shipping features. We can\u2019t wait to finally push this out, whether that means validating our visions or delusions." },
    { type: "divider" },
    { type: "p", text: "We are starting with an alpha testing phase through a waitlist. We will engage with design partners who are capable builders, open to sharing their experiences and genuinely excited about what Egregore can become and what they can do with it. Hopefully in the near future we will get to a public release." },
    { type: "p", text: "Til next time." },
  ],

  "context-gardening": [
    { type: "quote", text: "Why the best AI context isn\u2019t engineered \u2014 it\u2019s grown." },
    { type: "p", text: "The prevailing term in AI tooling right now is \u201Ccontext engineering\u201D \u2014 the idea that if you\u2019re methodical enough, you can assemble the optimal set of information for a model to work with. Curate the right documents, structure the right prompts, retrieve the right chunks. Engineering implies a known target state: you design, you build, you ship." },
    { type: "p", text: "But this framing carries a quiet assumption that doesn\u2019t survive contact with real organizations. It assumes one person \u2014 or one system \u2014 can know in advance what the relevant context is. That relevance is a property of documents rather than a property of situations. That the right information can be selected before the moment it\u2019s needed." },
    { type: "p", text: "In practice, context doesn\u2019t work like that. Context emerges." },
    { type: "divider" },

    { type: "h2", text: "What Emergence Knows" },
    { type: "p", text: "Context gardening starts from a different premise: you don\u2019t manufacture context, you cultivate the conditions for it to grow. You set the soil \u2014 the environment, the capture methodologies, the tooling \u2014 and then you let the organic practice of teams working together produce the context that matters." },
    { type: "p", text: "The difference is not cosmetic. Engineering is top-down: someone decides what\u2019s relevant, builds a pipeline to surface it, and hopes the selection holds. Gardening is bottom-up: priorities emerge from interactions, from the actual texture of work, from what teams repeatedly reach for and what they let fall away. No one has to synthetically tell the model what matters. The model discovers what matters by being embedded in a space where real work is happening." },
    { type: "p", text: "This is closer to how institutional knowledge actually forms. Nobody writes the definitive document on \u201Chow we make decisions here.\u201D Instead, patterns accumulate. Certain references become load-bearing. Informal agreements harden into defaults. The organization develops a sense \u2014 distributed across people, artifacts, and habits \u2014 of what its context actually is." },
    { type: "divider" },

    { type: "h2", text: "Egregore as a Context Garden" },
    { type: "p", text: "When teams work inside an Egregore environment, every session contributes to a growing substrate of organizational intelligence. The knowledge graph doesn\u2019t start from a schema designed by an administrator \u2014 it grows from the actual patterns of collaboration. What teams discuss, what they reference, what they build on, what they contradict \u2014 all of this feeds the soil." },
    { type: "p", text: "The result is that AI systems plugged into an Egregore workspace don\u2019t operate on a static retrieval set. They operate on living context \u2014 context that reflects real priorities, real tensions, real momentum. The difference shows up immediately in output quality. Materials produced within this environment are not generically competent. They are tailor-made, because the context they draw from was tailor-grown by the people who will use them." },
    { type: "p", text: "This is where the gardening metaphor earns its weight. A garden doesn\u2019t produce the same thing every season. It responds to what you plant, how you tend it, what the conditions are. An Egregore environment does the same \u2014 it becomes more aware, more attuned, more useful as the team\u2019s work deepens." },
    { type: "divider" },

    { type: "h2", text: "What This Means in Practice" },
    { type: "p", text: "Context gardening shifts the burden of AI effectiveness away from prompt engineering and retrieval optimization and toward something more fundamental: the quality of the collaborative environment itself." },
    { type: "p", text: "If your team works in fragmented tools with no shared substrate, there is no garden \u2014 only scattered seeds. If your team works inside a persistent, accumulative environment, context grows whether or not anyone is explicitly tending it. The capture happens at the level of practice, not process." },
    { type: "p", text: "The most powerful context for AI is the one that no single person designed \u2014 the kind that can only emerge from the collective intelligence of the people who produced it. Egregore is the environment where that emergence happens." },
  ],

};
