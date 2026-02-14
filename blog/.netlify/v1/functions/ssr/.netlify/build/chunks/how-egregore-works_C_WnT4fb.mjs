import { o as createVNode, C as Fragment, _ as __astro_tag_component__ } from './astro/server_B_xQNr3j.mjs';
import 'clsx';

const frontmatter = {
  "title": "How Egregore Works",
  "subtitle": "An AI-native operating system where context accumulates automatically, knowledge lives in open formats, and organizational intelligence emerges from work.",
  "date": "2026-02-01T00:00:00.000Z",
  "readTime": "10 min read",
  "category": "Technical",
  "tags": ["architecture", "design-principles", "infrastructure"],
  "author": "cem",
  "featured": false
};
function getHeadings() {
  return [{
    "depth": 2,
    "slug": "architecture-philosophy",
    "text": "Architecture Philosophy"
  }, {
    "depth": 3,
    "slug": "1-composition-over-monolith",
    "text": "1. Composition Over Monolith"
  }, {
    "depth": 3,
    "slug": "2-convention-over-code",
    "text": "2. Convention Over Code"
  }, {
    "depth": 3,
    "slug": "3-filesystem-as-source-of-truth",
    "text": "3. Filesystem as Source of Truth"
  }, {
    "depth": 3,
    "slug": "4-context-as-byproduct",
    "text": "4. Context as Byproduct"
  }, {
    "depth": 2,
    "slug": "system-architecture",
    "text": "System Architecture"
  }, {
    "depth": 3,
    "slug": "agent-layer",
    "text": "Agent Layer"
  }, {
    "depth": 3,
    "slug": "memory-layer",
    "text": "Memory Layer"
  }, {
    "depth": 3,
    "slug": "graph-layer",
    "text": "Graph Layer"
  }, {
    "depth": 2,
    "slug": "core-workflows",
    "text": "Core Workflows"
  }, {
    "depth": 3,
    "slug": "the-handoff-loop",
    "text": "The Handoff Loop"
  }, {
    "depth": 3,
    "slug": "the-reflection-loop",
    "text": "The Reflection Loop"
  }, {
    "depth": 2,
    "slug": "technical-differentiators",
    "text": "Technical Differentiators"
  }, {
    "depth": 3,
    "slug": "1-model-agnostic-architecture",
    "text": "1. Model-Agnostic Architecture"
  }, {
    "depth": 3,
    "slug": "2-portable-knowledge",
    "text": "2. Portable Knowledge"
  }, {
    "depth": 3,
    "slug": "3-graph--filesystem-duality",
    "text": "3. Graph + Filesystem Duality"
  }, {
    "depth": 3,
    "slug": "4-convention-based-extensibility",
    "text": "4. Convention-Based Extensibility"
  }, {
    "depth": 2,
    "slug": "the-bet",
    "text": "The Bet"
  }];
}
function _createMdxContent(props) {
  const _components = {
    code: "code",
    em: "em",
    h2: "h2",
    h3: "h3",
    li: "li",
    p: "p",
    pre: "pre",
    span: "span",
    strong: "strong",
    table: "table",
    tbody: "tbody",
    td: "td",
    th: "th",
    thead: "thead",
    tr: "tr",
    ul: "ul",
    ...props.components
  };
  return createVNode(Fragment, {
    children: [createVNode(_components.p, {
      children: "Egregore is an AI-native operating system for human-AI collaboration. It enables teams to work with AI agents that share persistent organizational memory, understand relationships between work artifacts, and coordinate through standardized workflows."
    }), "\n", createVNode(_components.p, {
      children: "Unlike traditional software that requires users to context-switch between tools, Egregore embeds directly in the developer terminal where technical work happens. Context accumulates automatically as a byproduct of work—no separate capture step required."
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Core Insight:"
      }), " The most valuable organizational knowledge is generated during work, not documented afterward. Egregore captures this context at the source."]
    }), "\n", createVNode(_components.h2, {
      id: "architecture-philosophy",
      children: "Architecture Philosophy"
    }), "\n", createVNode(_components.p, {
      children: "Egregore follows four design principles that differentiate it from traditional collaboration tools:"
    }), "\n", createVNode(_components.h3, {
      id: "1-composition-over-monolith",
      children: "1. Composition Over Monolith"
    }), "\n", createVNode(_components.p, {
      children: "Egregore is not a single application. It’s a composition of:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Filesystem"
        }), " — Markdown files in git (portable, inspectable, version-controlled)"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Graph database"
        }), " — Indexed relationships for fast queries"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Agent conventions"
        }), " — Instructions that turn AI assistants into organizational collaborators"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "External services"
        }), " — Notifications, analytics, integrations"]
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "This architecture means no vendor lock-in, no proprietary formats, and graceful degradation. If the graph goes down, you still have useful documents. If the AI improves, Egregore gets smarter without code changes."
    }), "\n", createVNode(_components.h3, {
      id: "2-convention-over-code",
      children: "2. Convention Over Code"
    }), "\n", createVNode(_components.p, {
      children: "The “application logic” lives in natural language instructions and structural conventions, not custom code. This means:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Non-technical extensibility"
        }), " — Add new capabilities by writing markdown, not deploying software"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Model-agnostic"
        }), " — Works with any LLM that can follow instructions"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Transparent"
        }), " — Every behavior is inspectable and modifiable"]
      }), "\n"]
    }), "\n", createVNode(_components.h3, {
      id: "3-filesystem-as-source-of-truth",
      children: "3. Filesystem as Source of Truth"
    }), "\n", createVNode(_components.p, {
      children: "All knowledge lives in markdown files first. The graph is an index, not the primary store. Benefits:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Portable"
        }), " — Export your organizational memory by copying a folder"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Auditable"
        }), " — Full git history of every change"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Recoverable"
        }), " — Rebuild the graph from files at any time"]
      }), "\n"]
    }), "\n", createVNode(_components.h3, {
      id: "4-context-as-byproduct",
      children: "4. Context as Byproduct"
    }), "\n", createVNode(_components.p, {
      children: "Traditional tools require explicit documentation. Egregore captures context automatically during work:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "Working on a problem? The exploration is recorded."
      }), "\n", createVNode(_components.li, {
        children: "Handing off to a colleague? Context transfers with one command."
      }), "\n", createVNode(_components.li, {
        children: "Completing a project? Learnings are indexed for future reference."
      }), "\n"]
    }), "\n", createVNode(_components.h2, {
      id: "system-architecture",
      children: "System Architecture"
    }), "\n", createVNode(_components.pre, {
      class: "astro-code github-dark-dimmed",
      style: {
        backgroundColor: "#22272e",
        color: "#adbac7",
        overflowX: "auto"
      },
      tabindex: "0",
      "data-language": "plaintext",
      children: createVNode(_components.code, {
        children: [createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "┌─────────────────────────────────────────────────────────────────────┐"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                          EGREGORE SYSTEM                            │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "├─────────────────────────────────────────────────────────────────────┤"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                                                                     │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   AGENT LAYER                                                       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │   Agent 1   │  │   Agent 2   │  │   Agent 3   │   ...          │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │  (Alice)    │  │   (Bob)     │  │  (Carol)    │                │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│          └────────────────┼────────────────┘                        │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                           │                                         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                    ┌──────┴──────┐                                  │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                    │   Kernel    │  Agent identity + protocols      │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                    │  Commands   │  Standardized operations         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                    │   Skills    │  Reusable capabilities           │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                    └──────┬──────┘                                  │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                           │                                         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "├───────────────────────────┼─────────────────────────────────────────┤"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                           │                                         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   MEMORY LAYER            │                                         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   ┌───────────────────────┴────────────────────────────────┐       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │               Shared Knowledge Base                     │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │  │Artifacts │ │  Quests  │ │ Sessions │ │  People  │  │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │  │(findings,│ │  (open   │ │(handoffs,│ │  (team   │  │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │  │ sources) │ │explorat.)│ │ context) │ │directory)│  │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   └────────────────────────────────────────────────────────┘       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                           │                                         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "├───────────────────────────┼─────────────────────────────────────────┤"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                           │                                         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   GRAPH LAYER             │                                         │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   ┌───────────────────────┴────────────────────────────────┐       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │              Relationship Index (Neo4j)                 │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │                                                         │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │   Person ──CONTRIBUTED──> Artifact                     │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │   Artifact ──PART_OF──> Quest                          │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │   Session ──BY──> Person                               │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   │   Quest ──RELATES_TO──> Project                        │       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│   └─────────────────────────────────────────────────────────┘       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "│                                                                     │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "└─────────────────────────────────────────────────────────────────────┘"
          })
        })]
      })
    }), "\n", createVNode(_components.h3, {
      id: "agent-layer",
      children: "Agent Layer"
    }), "\n", createVNode(_components.p, {
      children: "AI agents (Claude Code instances) are the primary interface. Each team member works through an agent that:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "Reads organizational memory before starting work"
      }), "\n", createVNode(_components.li, {
        children: "Executes standardized commands for common operations"
      }), "\n", createVNode(_components.li, {
        children: "Captures context automatically during work"
      }), "\n", createVNode(_components.li, {
        children: "Writes to the shared knowledge base"
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Commands"
      }), " provide standardized operations:"]
    }), "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", createVNode(_components.table, {
      children: [createVNode(_components.thead, {
        children: createVNode(_components.tr, {
          children: [createVNode(_components.th, {
            children: "Command"
          }), createVNode(_components.th, {
            children: "Purpose"
          })]
        })
      }), createVNode(_components.tbody, {
        children: [createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.code, {
              children: "/activity"
            })
          }), createVNode(_components.td, {
            children: "See what the team is working on"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.code, {
              children: "/handoff"
            })
          }), createVNode(_components.td, {
            children: "End session with context for the next person"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.code, {
              children: "/add"
            })
          }), createVNode(_components.td, {
            children: "Contribute a finding, source, or decision"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.code, {
              children: "/save"
            })
          }), createVNode(_components.td, {
            children: "Sync work to the shared knowledge base"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.code, {
              children: "/quest"
            })
          }), createVNode(_components.td, {
            children: "Manage open explorations"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.code, {
              children: "/reflect"
            })
          }), createVNode(_components.td, {
            children: "Org-level pattern analysis"
          })]
        })]
      })]
    }), "\n", createVNode(_components.h3, {
      id: "memory-layer",
      children: "Memory Layer"
    }), "\n", createVNode(_components.p, {
      children: "All knowledge exists as markdown files in git:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Artifacts"
        }), " — Sources, findings, decisions, thoughts"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Quests"
        }), " — Open explorations and research threads"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Sessions"
        }), " — Work logs and handoff context"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "People"
        }), " — Team directory with roles and expertise"]
      }), "\n"]
    }), "\n", createVNode(_components.h3, {
      id: "graph-layer",
      children: "Graph Layer"
    }), "\n", createVNode(_components.p, {
      children: "Neo4j indexes relationships that filesystem structure can’t capture:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "Who contributed what"
      }), "\n", createVNode(_components.li, {
        children: "Which artifacts inform which quests"
      }), "\n", createVNode(_components.li, {
        children: "Handoff chains between sessions"
      }), "\n", createVNode(_components.li, {
        children: "Project scope and team membership"
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "The graph enables fast queries: “What is Alice working on?”, “What have we learned about auth?”, “Who should pick up this handoff?”"
    }), "\n", createVNode(_components.h2, {
      id: "core-workflows",
      children: "Core Workflows"
    }), "\n", createVNode(_components.h3, {
      id: "the-handoff-loop",
      children: "The Handoff Loop"
    }), "\n", createVNode(_components.p, {
      children: "The signature Egregore workflow. Context flows between collaborators without meetings:"
    }), "\n", createVNode(_components.pre, {
      class: "astro-code github-dark-dimmed",
      style: {
        backgroundColor: "#22272e",
        color: "#adbac7",
        overflowX: "auto"
      },
      tabindex: "0",
      "data-language": "plaintext",
      children: createVNode(_components.code, {
        children: [createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "Alice works on a problem"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ▼"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "/handoff to Bob"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ├──> File: Session summary + next steps"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ├──> Graph: Session linked to Alice, project"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       └──> Notify: Bob gets Telegram alert"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "              │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "              ▼"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "Bob runs /activity"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ▼"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "Sees Alice's handoff with full context"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ▼"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "Picks up exactly where Alice left off"
          })
        })]
      })
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Why this matters:"
      }), " Traditional async collaboration loses context. “What did you try?” “Where did you leave off?” Handoffs preserve the reasoning, not just the result."]
    }), "\n", createVNode(_components.h3, {
      id: "the-reflection-loop",
      children: "The Reflection Loop"
    }), "\n", createVNode(_components.p, {
      children: "After handoff cycles accumulate, Egregore can surface patterns:"
    }), "\n", createVNode(_components.pre, {
      class: "astro-code github-dark-dimmed",
      style: {
        backgroundColor: "#22272e",
        color: "#adbac7",
        overflowX: "auto"
      },
      tabindex: "0",
      "data-language": "plaintext",
      children: createVNode(_components.code, {
        children: [createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "/reflect \"What slows us down?\""
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ▼"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "Egregore analyzes accumulated context:"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "- \"Auth implementations take 40% longer than estimated\""
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "- \"Handoffs on Fridays get picked up 2 days later\""
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "- \"Bob's code reviews catch 60% more issues\""
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ▼"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "Organizational intelligence emerges"
          })
        })]
      })
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Why this matters:"
      }), " The org learns things no individual knows. The system becomes smarter than the sum of its parts."]
    }), "\n", createVNode(_components.h2, {
      id: "technical-differentiators",
      children: "Technical Differentiators"
    }), "\n", createVNode(_components.h3, {
      id: "1-model-agnostic-architecture",
      children: "1. Model-Agnostic Architecture"
    }), "\n", createVNode(_components.p, {
      children: "Egregore doesn’t depend on a specific AI provider. The “intelligence” comes from conventions that any capable LLM can follow. As models improve, Egregore gets smarter without code changes."
    }), "\n", createVNode(_components.h3, {
      id: "2-portable-knowledge",
      children: "2. Portable Knowledge"
    }), "\n", createVNode(_components.p, {
      children: "All knowledge is markdown in git. No proprietary formats, no vendor lock-in. Export your organizational memory by copying a folder."
    }), "\n", createVNode(_components.h3, {
      id: "3-graph--filesystem-duality",
      children: "3. Graph + Filesystem Duality"
    }), "\n", createVNode(_components.p, {
      children: "Two representations of the same knowledge:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "Filesystem for durability, portability, version history"
      }), "\n", createVNode(_components.li, {
        children: "Graph for relationships, fast queries, pattern analysis"
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "If either fails, the other can reconstruct it."
    }), "\n", createVNode(_components.h3, {
      id: "4-convention-based-extensibility",
      children: "4. Convention-Based Extensibility"
    }), "\n", createVNode(_components.p, {
      children: "Add new capabilities by writing markdown instructions, not deploying code. A non-technical team member can create a new command or skill."
    }), "\n", createVNode(_components.h2, {
      id: "the-bet",
      children: "The Bet"
    }), "\n", createVNode(_components.p, {
      children: "As AI capabilities improve, the teams with the best context infrastructure will compound their advantage. Egregore is that infrastructure."
    }), "\n", createVNode(_components.p, {
      children: "The architecture prioritizes:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Portability"
        }), " — Your knowledge is yours, in open formats"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Transparency"
        }), " — Every behavior is inspectable"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Resilience"
        }), " — Multiple representations, graceful degradation"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Extensibility"
        }), " — Grow capabilities without engineering effort"]
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: createVNode(_components.em, {
        children: "For implementation details and self-hosting instructions, see our GitHub repository."
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

const url = "src/content/posts/how-egregore-works.mdx";
const file = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/how-egregore-works.mdx";
const Content = (props = {}) => MDXContent({
  ...props,
  components: { Fragment: Fragment, ...props.components, },
});
Content[Symbol.for('mdx-component')] = true;
Content[Symbol.for('astro.needsHeadRendering')] = !Boolean(frontmatter.layout);
Content.moduleId = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/how-egregore-works.mdx";
__astro_tag_component__(Content, 'astro:jsx');

export { Content, Content as default, file, frontmatter, getHeadings, url };
