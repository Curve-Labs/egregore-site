import { o as createVNode, C as Fragment, _ as __astro_tag_component__ } from './astro/server_B_xQNr3j.mjs';
import 'clsx';

const frontmatter = {
  "title": "Async Handoffs Replace Standups",
  "subtitle": "How small technical teams are eliminating context-sync meetings by making handoffs a first-class workflow.",
  "date": "2026-01-25T00:00:00.000Z",
  "readTime": "5 min read",
  "category": "Essay",
  "tags": ["async", "handoffs", "small-teams", "workflows"],
  "author": "cem",
  "featured": false
};
function getHeadings() {
  return [{
    "depth": 2,
    "slug": "the-pain-points",
    "text": "The Pain Points"
  }, {
    "depth": 2,
    "slug": "the-trigger-moment",
    "text": "The Trigger Moment"
  }, {
    "depth": 2,
    "slug": "the-handoff-loop",
    "text": "The Handoff Loop"
  }, {
    "depth": 2,
    "slug": "why-terminal-native-matters",
    "text": "Why Terminal-Native Matters"
  }, {
    "depth": 2,
    "slug": "the-conversion-path",
    "text": "The Conversion Path"
  }, {
    "depth": 2,
    "slug": "what-were-hearing",
    "text": "What We’re Hearing"
  }, {
    "depth": 2,
    "slug": "the-broader-pattern",
    "text": "The Broader Pattern"
  }, {
    "depth": 2,
    "slug": "getting-started",
    "text": "Getting Started"
  }];
}
function _createMdxContent(props) {
  const _components = {
    blockquote: "blockquote",
    code: "code",
    em: "em",
    h2: "h2",
    li: "li",
    ol: "ol",
    p: "p",
    pre: "pre",
    span: "span",
    strong: "strong",
    ul: "ul",
    ...props.components
  };
  return createVNode(Fragment, {
    children: [createVNode(_components.p, {
      children: "The standup meeting exists for one reason: context sync. “What did you work on? What are you working on? What’s blocking you?”"
    }), "\n", createVNode(_components.p, {
      children: "For small technical teams — early-stage startups, indie hacker duos, distributed dev shops — this ritual often feels like overhead. The meeting exists separate from where work happens. You stop working to talk about working."
    }), "\n", createVNode(_components.p, {
      children: "What if context could flow between collaborators without the meeting?"
    }), "\n", createVNode(_components.h2, {
      id: "the-pain-points",
      children: "The Pain Points"
    }), "\n", createVNode(_components.p, {
      children: "Small technical teams share common frustrations:"
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Context gets lost between collaborators."
      }), " “What did you try?” “Where did you leave off?” Every handoff requires verbal reconstruction of state."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Project management feels like overhead."
      }), " Notion, Linear, Asana — all valuable tools, but they’re separate from where work happens. Tab-switching is friction."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "AI conversations are siloed."
      }), " You have a great exploration with Claude. Your cofounder has their own. The learning doesn’t compound."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Standups exist just to sync context."
      }), " The meeting is a workaround for infrastructure that doesn’t exist."]
    }), "\n", createVNode(_components.h2, {
      id: "the-trigger-moment",
      children: "The Trigger Moment"
    }), "\n", createVNode(_components.p, {
      children: "The moment teams realize they need something different:"
    }), "\n", createVNode(_components.blockquote, {
      children: ["\n", createVNode(_components.p, {
        children: "“I spent 30 minutes explaining to my cofounder what I already tried. If only they could see my conversation history.”"
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "This is the handoff problem. The context exists — in your head, in your terminal history, in your AI conversation. But there’s no path from where it lives to where it’s needed."
    }), "\n", createVNode(_components.h2, {
      id: "the-handoff-loop",
      children: "The Handoff Loop"
    }), "\n", createVNode(_components.p, {
      children: "Egregore makes handoffs a first-class workflow:"
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
            children: "Alice works on authentication"
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
            children: "/handoff to Bob \"Auth working, need rate limiting next\""
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       │"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ├──> Session saved with full context"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       ├──> Handoff message attached"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "       └──> Bob notified via Telegram"
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
            children: "Sees Alice's handoff with:"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "- What she tried"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "- What worked"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "- What didn't"
          })
        }), "\n", createVNode(_components.span, {
          class: "line",
          children: createVNode(_components.span, {
            children: "- Exact next steps"
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
        children: "What changes:"
      }), " Bob doesn’t need to ask “what did you try?” The exploration is preserved. The reasoning is preserved. The context transfers with the work."]
    }), "\n", createVNode(_components.h2, {
      id: "why-terminal-native-matters",
      children: "Why Terminal-Native Matters"
    }), "\n", createVNode(_components.p, {
      children: "Small technical teams already live in terminal. Git, npm, docker, claude — the work happens there."
    }), "\n", createVNode(_components.p, {
      children: "A handoff tool that lives in terminal means:"
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Zero context switch"
        }), " — You don’t leave your workflow to document it"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "Capture as byproduct"
        }), " — The AI conversation ", createVNode(_components.em, {
          children: "is"
        }), " the context"]
      }), "\n", createVNode(_components.li, {
        children: [createVNode(_components.strong, {
          children: "No new tools to learn"
        }), " — It’s just another command"]
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "The insight: context should accumulate automatically during work, not require a separate capture step."
    }), "\n", createVNode(_components.h2, {
      id: "the-conversion-path",
      children: "The Conversion Path"
    }), "\n", createVNode(_components.p, {
      children: "We see teams adopt Egregore in a predictable pattern:"
    }), "\n", createVNode(_components.ol, {
      children: ["\n", createVNode(_components.li, {
        children: ["\n", createVNode(_components.p, {
          children: [createVNode(_components.strong, {
            children: "Start with 2 people"
          }), " — Free tier. Handoffs feel like a nice-to-have."]
        }), "\n"]
      }), "\n", createVNode(_components.li, {
        children: ["\n", createVNode(_components.p, {
          children: [createVNode(_components.strong, {
            children: "Add a 3rd collaborator"
          }), " — Handoffs become essential. Context sync meetings start feeling redundant."]
        }), "\n"]
      }), "\n", createVNode(_components.li, {
        children: ["\n", createVNode(_components.p, {
          children: [createVNode(_components.strong, {
            children: "Hit the value of shared context"
          }), " — “Wait, I can see what everyone is working on without asking?”"]
        }), "\n"]
      }), "\n", createVNode(_components.li, {
        children: ["\n", createVNode(_components.p, {
          children: [createVNode(_components.strong, {
            children: "4th person joins"
          }), " — Team tier. The org has institutional memory now."]
        }), "\n"]
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "The handoff sells the workflow. Once you’ve done it, going back feels like regression."
    }), "\n", createVNode(_components.h2, {
      id: "what-were-hearing",
      children: "What We’re Hearing"
    }), "\n", createVNode(_components.p, {
      children: "From teams using Egregore for async collaboration:"
    }), "\n", createVNode(_components.blockquote, {
      children: ["\n", createVNode(_components.p, {
        children: ["“We dropped our daily standup. The ", createVNode(_components.code, {
          children: "/activity"
        }), " command shows me everything I need.”"]
      }), "\n"]
    }), "\n", createVNode(_components.blockquote, {
      children: ["\n", createVNode(_components.p, {
        children: "“My cofounder is in a different timezone. Before, we’d lose a day to context sync. Now I hand off at EOD and he picks up immediately.”"
      }), "\n"]
    }), "\n", createVNode(_components.blockquote, {
      children: ["\n", createVNode(_components.p, {
        children: "“The AI remembers what we’ve tried. It’s like having a team member with perfect memory.”"
      }), "\n"]
    }), "\n", createVNode(_components.h2, {
      id: "the-broader-pattern",
      children: "The Broader Pattern"
    }), "\n", createVNode(_components.p, {
      children: "Standups are a symptom, not the disease. The disease is infrastructure that doesn’t support context flow."
    }), "\n", createVNode(_components.p, {
      children: "When context flows naturally — as a byproduct of work, not a separate documentation step — the meetings that existed to compensate become optional."
    }), "\n", createVNode(_components.p, {
      children: ["Not every team will drop standups entirely. Some value the social function. But when the ", createVNode(_components.em, {
        children: "functional"
      }), " purpose (context sync) is handled by infrastructure, the meeting can serve its ", createVNode(_components.em, {
        children: "social"
      }), " purpose without the overhead."]
    }), "\n", createVNode(_components.h2, {
      id: "getting-started",
      children: "Getting Started"
    }), "\n", createVNode(_components.p, {
      children: "If you’re a small technical team frustrated by context loss:"
    }), "\n", createVNode(_components.ol, {
      children: ["\n", createVNode(_components.li, {
        children: ["\n", createVNode(_components.p, {
          children: [createVNode(_components.strong, {
            children: "Try one handoff."
          }), " End your work session with ", createVNode(_components.code, {
            children: "/handoff"
          }), " instead of just closing the terminal."]
        }), "\n"]
      }), "\n", createVNode(_components.li, {
        children: ["\n", createVNode(_components.p, {
          children: [createVNode(_components.strong, {
            children: "Have your collaborator pick it up."
          }), " See if they can continue without asking clarifying questions."]
        }), "\n"]
      }), "\n", createVNode(_components.li, {
        children: ["\n", createVNode(_components.p, {
          children: [createVNode(_components.strong, {
            children: "Notice what changes."
          }), " Is the standup still necessary? What would you do with that time?"]
        }), "\n"]
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: "The bet: teams that master async handoffs will move faster than teams that don’t. Context is a competitive advantage."
    }), "\n", createVNode(_components.p, {
      children: createVNode(_components.em, {
        children: "Egregore is free for teams up to 3 people. Terminal-native, AI-native, no switching costs."
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

const url = "src/content/posts/async-handoffs-replace-standups.mdx";
const file = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/async-handoffs-replace-standups.mdx";
const Content = (props = {}) => MDXContent({
  ...props,
  components: { Fragment: Fragment, ...props.components, },
});
Content[Symbol.for('mdx-component')] = true;
Content[Symbol.for('astro.needsHeadRendering')] = !Boolean(frontmatter.layout);
Content.moduleId = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/async-handoffs-replace-standups.mdx";
__astro_tag_component__(Content, 'astro:jsx');

export { Content, Content as default, file, frontmatter, getHeadings, url };
