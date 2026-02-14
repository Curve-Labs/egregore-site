import { o as createVNode, C as Fragment, _ as __astro_tag_component__ } from './astro/server_B_xQNr3j.mjs';
import 'clsx';

const frontmatter = {
  "title": "Building Curve Labs",
  "subtitle": "Notes on bootstrapping an organization that builds itself. The tools, decisions, and open questions from our first month.",
  "date": "2026-01-28T00:00:00.000Z",
  "readTime": "5 min read",
  "category": "Update",
  "tags": ["curve-labs", "infrastructure", "bootstrapping"],
  "author": "cem",
  "featured": false
};
function getHeadings() {
  return [{
    "depth": 2,
    "slug": "the-first-week",
    "text": "The First Week"
  }, {
    "depth": 2,
    "slug": "what-were-learning",
    "text": "What We’re Learning"
  }, {
    "depth": 2,
    "slug": "open-questions",
    "text": "Open Questions"
  }, {
    "depth": 2,
    "slug": "whats-next",
    "text": "What’s Next"
  }];
}
function _createMdxContent(props) {
  const _components = {
    code: "code",
    em: "em",
    h2: "h2",
    li: "li",
    p: "p",
    strong: "strong",
    ul: "ul",
    ...props.components
  };
  return createVNode(Fragment, {
    children: [createVNode(_components.p, {
      children: "We started Curve Labs with a question: what if an organization could build itself?"
    }), "\n", createVNode(_components.p, {
      children: "Not literally — we’re still humans writing code and making decisions. But the infrastructure that supports our work? The commands we use daily, the patterns that guide our collaboration, the knowledge base that accumulates? Those can emerge from use rather than being designed upfront."
    }), "\n", createVNode(_components.h2, {
      id: "the-first-week",
      children: "The First Week"
    }), "\n", createVNode(_components.p, {
      children: "We began with almost nothing. A shared folder. A few markdown files. Claude Code with access to everything."
    }), "\n", createVNode(_components.p, {
      children: "The first day was chaos. Where does this note go? How do we reference yesterday’s conversation? What did we decide about X? The absence of structure was productive — it forced us to notice what we actually needed."
    }), "\n", createVNode(_components.p, {
      children: "By day three, patterns emerged. We kept creating handoff documents when switching contexts. We kept searching for previous decisions. We kept losing track of ongoing threads."
    }), "\n", createVNode(_components.p, {
      children: "So we built:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: ["A ", createVNode(_components.code, {
          children: "/handoff"
        }), " command that structures context for the next session"]
      }), "\n", createVNode(_components.li, {
        children: "A decisions folder with date-prefixed files"
      }), "\n", createVNode(_components.li, {
        children: "Quests for ongoing research threads"
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "None of this was planned. It precipitated from friction."
    }), "\n", createVNode(_components.h2, {
      id: "what-were-learning",
      children: "What We’re Learning"
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Commands should be discovered, not designed."
      }), " We watch what we do repeatedly, then automate it. The ", createVNode(_components.code, {
        children: "/reflect"
      }), " command exists because we kept manually writing findings to the knowledge base."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Memory is infrastructure."
      }), " The shared memory repository isn’t just storage — it’s how the organization thinks across sessions and people. Every handoff, decision, and finding is a node in a graph that agents can traverse."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Agents need context, not instructions."
      }), " When Claude Code has access to our full history, it can connect threads we’ve forgotten. The more we share, the more useful it becomes."]
    }), "\n", createVNode(_components.h2, {
      id: "open-questions",
      children: "Open Questions"
    }), "\n", createVNode(_components.p, {
      children: "How much structure is enough? Too little and context gets lost. Too much and we’re back to maintaining containers."
    }), "\n", createVNode(_components.p, {
      children: "When should agents act without being asked? We want them to surface connections and prompt decisions. But the line between helpful and intrusive isn’t clear yet."
    }), "\n", createVNode(_components.p, {
      children: "How do we share this with others? The infrastructure can be replicated. The patterns can be documented. But the ontology — the specific categories and connections that emerged from our work — that’s ours. Others will need to grow their own."
    }), "\n", createVNode(_components.h2, {
      id: "whats-next",
      children: "What’s Next"
    }), "\n", createVNode(_components.p, {
      children: "We’re focusing on two domains:"
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Psyche"
      }), " — cognitive systems, knowledge graphs, memory architectures. How do tools for thought become tools for collective thought?"]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Polis"
      }), " — coordination mechanisms, governance, emergent ontologies. How do groups coordinate without central control?"]
    }), "\n", createVNode(_components.p, {
      children: "These aren’t separate projects. They’re the same inquiry at different scales."
    }), "\n", createVNode(_components.p, {
      children: "Follow along as we build. The work is public, the decisions are documented, and the infrastructure will be forkable when it’s ready."
    }), "\n", createVNode(_components.p, {
      children: createVNode(_components.em, {
        children: "This post was written in collaboration with Claude, who has access to our full organizational context."
      })
    })]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? createVNode(MDXLayout, {
    ...props,
    children: createVNode(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}

const url = "src/content/posts/building-curve-labs.mdx";
const file = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/building-curve-labs.mdx";
const Content = (props = {}) => MDXContent({
  ...props,
  components: { Fragment: Fragment, ...props.components, },
});
Content[Symbol.for('mdx-component')] = true;
Content[Symbol.for('astro.needsHeadRendering')] = !Boolean(frontmatter.layout);
Content.moduleId = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/building-curve-labs.mdx";
__astro_tag_component__(Content, 'astro:jsx');

export { Content, Content as default, file, frontmatter, getHeadings, url };
