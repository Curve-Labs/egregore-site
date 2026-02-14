import { o as createVNode, C as Fragment, _ as __astro_tag_component__ } from './astro/server_B_xQNr3j.mjs';
import 'clsx';

const frontmatter = {
  "title": "The Economics of Organizational Memory",
  "subtitle": "Why we chose flat team pricing, what drives our costs, and how we think about building a sustainable business around context infrastructure.",
  "date": "2026-01-20T00:00:00.000Z",
  "readTime": "6 min read",
  "category": "Update",
  "tags": ["business-model", "pricing", "transparency", "infrastructure"],
  "author": "cem",
  "featured": false
};
function getHeadings() {
  return [{
    "depth": 2,
    "slug": "the-model-free-tools-paid-infrastructure",
    "text": "The Model: Free Tools, Paid Infrastructure"
  }, {
    "depth": 2,
    "slug": "why-flat-team-pricing",
    "text": "Why Flat Team Pricing"
  }, {
    "depth": 2,
    "slug": "the-cost-structure",
    "text": "The Cost Structure"
  }, {
    "depth": 2,
    "slug": "what-drives-costs",
    "text": "What Drives Costs"
  }, {
    "depth": 2,
    "slug": "the-unit-economics-story",
    "text": "The Unit Economics Story"
  }, {
    "depth": 2,
    "slug": "the-pricing-table",
    "text": "The Pricing Table"
  }, {
    "depth": 2,
    "slug": "what-were-not-doing",
    "text": "What We’re Not Doing"
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
    li: "li",
    p: "p",
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
      children: "We’re building Egregore as a sustainable business, not a venture-backed growth experiment. That means being thoughtful about economics from day one."
    }), "\n", createVNode(_components.p, {
      children: "This post shares our thinking on pricing, costs, and why we believe context infrastructure can be a healthy business."
    }), "\n", createVNode(_components.h2, {
      id: "the-model-free-tools-paid-infrastructure",
      children: "The Model: Free Tools, Paid Infrastructure"
    }), "\n", createVNode(_components.p, {
      children: "The CLI is free and will remain free. The hosted backend service is the business."
    }), "\n", createVNode(_components.p, {
      children: "This mirrors successful models like Supabase, PlanetScale, and Vercel — free tools, paid infrastructure. You can self-host everything, but most teams will prefer managed infrastructure."
    }), "\n", createVNode(_components.p, {
      children: createVNode(_components.strong, {
        children: "What the backend provides:"
      })
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "Context storage (vector embeddings + raw documents)"
      }), "\n", createVNode(_components.li, {
        children: "Quest/task state"
      }), "\n", createVNode(_components.li, {
        children: "Handoff routing and notifications"
      }), "\n", createVNode(_components.li, {
        children: "Skills registry and versioning"
      }), "\n", createVNode(_components.li, {
        children: "Team management and permissions"
      }), "\n", createVNode(_components.li, {
        children: "Org reflection engine"
      }), "\n"]
    }), "\n", createVNode(_components.h2, {
      id: "why-flat-team-pricing",
      children: "Why Flat Team Pricing"
    }), "\n", createVNode(_components.p, {
      children: "Our recommended model: $75/month for unlimited users on a team."
    }), "\n", createVNode(_components.p, {
      children: "Why flat instead of per-seat?"
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Terminal-native teams dislike per-seat accounting."
      }), " Developer tools that charge per user create friction around adding collaborators. We want the opposite incentive."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Encourages adding collaborators."
      }), " More collaborators means more context, more handoffs, more value from the system. Per-seat pricing discourages exactly what makes Egregore valuable."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Predictable revenue for planning."
      }), " We can forecast without guessing seat counts."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Usage overages capture value from heavy users."
      }), " Beyond included limits, additional storage and retrievals are metered. Heavy teams naturally hit these; light teams never worry about them."]
    }), "\n", createVNode(_components.h2, {
      id: "the-cost-structure",
      children: "The Cost Structure"
    }), "\n", createVNode(_components.p, {
      children: "What does it actually cost us to serve a team?"
    }), "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", createVNode(_components.table, {
      children: [createVNode(_components.thead, {
        children: createVNode(_components.tr, {
          children: [createVNode(_components.th, {
            children: "Component"
          }), createVNode(_components.th, {
            children: "Service"
          }), createVNode(_components.th, {
            children: "Est. Cost/User/Month"
          })]
        })
      }), createVNode(_components.tbody, {
        children: [createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: "Vector Storage"
          }), createVNode(_components.td, {
            children: "Qdrant Cloud"
          }), createVNode(_components.td, {
            children: "$0.50 - $1.00"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: "Document Storage"
          }), createVNode(_components.td, {
            children: "Cloudflare R2"
          }), createVNode(_components.td, {
            children: "$0.10 - $0.30"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: "Embeddings"
          }), createVNode(_components.td, {
            children: "Voyage AI"
          }), createVNode(_components.td, {
            children: "$0.20 - $0.50"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: "Compute (API)"
          }), createVNode(_components.td, {
            children: "Railway"
          }), createVNode(_components.td, {
            children: "$0.30 - $0.50"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: "Relational DB"
          }), createVNode(_components.td, {
            children: "Neon"
          }), createVNode(_components.td, {
            children: "$0.20 - $0.40"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Total"
            })
          }), createVNode(_components.td, {}), createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "$1.30 - $2.70"
            })
          })]
        })]
      })]
    }), "\n", createVNode(_components.p, {
      children: "At $75/month for a 5-person team, that’s $15/user effective price with 82-91% gross margin."
    }), "\n", createVNode(_components.p, {
      children: "At 10 users, $7.50/user with 64-83% gross margin."
    }), "\n", createVNode(_components.p, {
      children: "At 15 users, $5/user with 46-74% gross margin."
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "The hybrid model addresses large teams:"
      }), " heavy usage naturally triggers overage charges, maintaining healthy margins without penalizing normal usage."]
    }), "\n", createVNode(_components.h2, {
      id: "what-drives-costs",
      children: "What Drives Costs"
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: ["Heavy ", createVNode(_components.code, {
          children: "/activity"
        }), " users"]
      }), " — High retrieval volume queries the graph frequently."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Large context windows"
      }), " — More tokens embedded means more vector storage and embedding costs."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Real-time Slack ingestion"
      }), " — Constant message embedding adds up."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Org reflection on large teams"
      }), " — Cross-team queries are compute-intensive."]
    }), "\n", createVNode(_components.p, {
      children: createVNode(_components.strong, {
        children: "Cost optimization levers we’re exploring:"
      })
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "Self-hosted vector DB (60% cheaper than managed)"
      }), "\n", createVNode(_components.li, {
        children: "Cheaper embedding models (Voyage lite, open-source)"
      }), "\n", createVNode(_components.li, {
        children: "Aggressive caching (most retrievals hit recent context)"
      }), "\n", createVNode(_components.li, {
        children: "Tiered storage (hot/warm/cold)"
      }), "\n", createVNode(_components.li, {
        children: "Batch reflection (nightly, not real-time)"
      }), "\n"]
    }), "\n", createVNode(_components.h2, {
      id: "the-unit-economics-story",
      children: "The Unit Economics Story"
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Customer acquisition cost is low."
      }), " Terminal-native tools spread through word of mouth. Developers trust peer recommendations over marketing."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Free → Team conversion is organic."
      }), " Happens when handoffs become essential workflow. No sales pressure needed."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Gross margins are SaaS-healthy."
      }), " 80%+ at our recommended pricing."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Retention increases over time."
      }), " Context lock-in grows with usage. The more handoffs, the more valuable your Egregore history becomes."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Value scales with model improvements."
      }), " Better AI models = more valuable context layer, without proportional cost increase. We’re building on an improving foundation."]
    }), "\n", createVNode(_components.h2, {
      id: "the-pricing-table",
      children: "The Pricing Table"
    }), "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", createVNode(_components.table, {
      children: [createVNode(_components.thead, {
        children: createVNode(_components.tr, {
          children: [createVNode(_components.th, {}), createVNode(_components.th, {
            children: "Free"
          }), createVNode(_components.th, {
            children: "Team"
          }), createVNode(_components.th, {
            children: "Enterprise"
          })]
        })
      }), createVNode(_components.tbody, {
        children: [createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Users"
            })
          }), createVNode(_components.td, {
            children: "Up to 3"
          }), createVNode(_components.td, {
            children: "Unlimited"
          }), createVNode(_components.td, {
            children: "Unlimited"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Context Storage"
            })
          }), createVNode(_components.td, {
            children: "500 MB"
          }), createVNode(_components.td, {
            children: "10 GB included"
          }), createVNode(_components.td, {
            children: "Custom"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Retrievals/month"
            })
          }), createVNode(_components.td, {
            children: "5,000"
          }), createVNode(_components.td, {
            children: "100,000 included"
          }), createVNode(_components.td, {
            children: "Unlimited"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Handoffs"
            })
          }), createVNode(_components.td, {
            children: "✓"
          }), createVNode(_components.td, {
            children: "✓"
          }), createVNode(_components.td, {
            children: "✓"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Skills Sharing"
            })
          }), createVNode(_components.td, {
            children: "Community"
          }), createVNode(_components.td, {
            children: "Team + Community"
          }), createVNode(_components.td, {
            children: "Private + All"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Org Reflection"
            })
          }), createVNode(_components.td, {
            children: "—"
          }), createVNode(_components.td, {
            children: "✓"
          }), createVNode(_components.td, {
            children: "✓ (Advanced)"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Slack Integration"
            })
          }), createVNode(_components.td, {
            children: "—"
          }), createVNode(_components.td, {
            children: "✓"
          }), createVNode(_components.td, {
            children: "✓"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "SSO / Audit Logs"
            })
          }), createVNode(_components.td, {
            children: "—"
          }), createVNode(_components.td, {
            children: "—"
          }), createVNode(_components.td, {
            children: "✓"
          })]
        }), createVNode(_components.tr, {
          children: [createVNode(_components.td, {
            children: createVNode(_components.strong, {
              children: "Price"
            })
          }), createVNode(_components.td, {
            children: "$0"
          }), createVNode(_components.td, {
            children: "$75/month"
          }), createVNode(_components.td, {
            children: "Custom"
          })]
        })]
      })]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "Usage-based overages"
      }), " (beyond Team tier limits):"]
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "Additional storage: $0.15/GB/month"
      }), "\n", createVNode(_components.li, {
        children: "Additional retrievals: $0.002 per operation"
      }), "\n", createVNode(_components.li, {
        children: "Org reflection queries: $0.10 each"
      }), "\n"]
    }), "\n", createVNode(_components.h2, {
      id: "what-were-not-doing",
      children: "What We’re Not Doing"
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "No per-seat pricing."
      }), " We want teams to add collaborators freely."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "No annual commitments required."
      }), " Monthly is fine. We earn retention through value, not contracts."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "No feature gating on core workflows."
      }), " Handoffs work the same on Free and Team. We gate scale and advanced features, not basics."]
    }), "\n", createVNode(_components.p, {
      children: [createVNode(_components.strong, {
        children: "No venture-scale growth pressure."
      }), " We’re building a sustainable business, not optimizing for a funding round."]
    }), "\n", createVNode(_components.h2, {
      id: "the-bet",
      children: "The Bet"
    }), "\n", createVNode(_components.p, {
      children: "Context infrastructure is a real category. Teams that manage context well outperform teams that don’t. As AI becomes central to knowledge work, context management becomes more valuable, not less."
    }), "\n", createVNode(_components.p, {
      children: "We’re building for that future — one where Egregore is the context layer teams rely on, priced fairly, and sustainable long-term."
    }), "\n", createVNode(_components.p, {
      children: createVNode(_components.em, {
        children: "Questions about pricing or economics? We’re happy to discuss. Transparency is a feature."
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

const url = "src/content/posts/the-economics-of-context.mdx";
const file = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/the-economics-of-context.mdx";
const Content = (props = {}) => MDXContent({
  ...props,
  components: { Fragment: Fragment, ...props.components, },
});
Content[Symbol.for('mdx-component')] = true;
Content[Symbol.for('astro.needsHeadRendering')] = !Boolean(frontmatter.layout);
Content.moduleId = "C:/curve_v2/egregore-curve-labs/blog/src/content/posts/the-economics-of-context.mdx";
__astro_tag_component__(Content, 'astro:jsx');

export { Content, Content as default, file, frontmatter, getHeadings, url };
