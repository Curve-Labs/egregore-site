import { c as createComponent, a as renderTemplate, d as defineScriptVars, r as renderComponent, m as maybeRenderHead, b as addAttribute } from '../chunks/astro/server_B_xQNr3j.mjs';
import 'piccolore';
import { g as getCollection } from '../chunks/_astro_content_CiI689C0.mjs';
import { $ as $$Base } from '../chunks/Base_DgxGlGnX.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Explore = createComponent(async ($$result, $$props, $$slots) => {
  const allPosts = (await getCollection("posts", ({ data }) => !data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const allTags = Array.from(
    new Set(allPosts.flatMap((post) => post.data.tags || []))
  ).sort();
  const tagDescriptions = {
    "agents": "Autonomous software entities capable of perception and action within a shared environment.",
    "knowledge-graphs": "Semantic networks that structure information into entities and relationships, enabling machine reasoning.",
    "topology": "The mathematical study of properties preserved through deformations, twistings, and stretchings.",
    "governance": "Cybernetic control systems for managing collective resources and decision-making processes.",
    "cybernetics": "The transdisciplinary study of circular causal systems with feedback loops.",
    "scaling": "Mechanisms for maintaining system coherence as node count increases.",
    "interop": "Protocols enabling distinct systems to exchange information without friction.",
    "llm": "Large-scale statistical models capable of generating human-like text and reasoning patterns.",
    "protocol": "A set of rules governing the exchange or transmission of data between devices.",
    "economics": "The study of value flows and resource allocation within constrained systems.",
    "theory": "Abstract frameworks for understanding system dynamics.",
    "ux": "The interface between human cognition and machine logic.",
    "active-inference": "A framework where agents minimize free energy by updating internal models to match sensory inputs.",
    "design": "Intentional creation of structures to solve specific problems.",
    "recursion": "The process of defining a function or object in terms of itself.",
    "system-design": "The architecture of complex systems and their inter-dependencies.",
    "ai-agents": "Artificial intelligence systems designed to act autonomously toward goals.",
    "coordination": "The organization of different elements of a complex body or activity.",
    "memory": "Systems for storing and retrieving information across time.",
    "reflection": "Mechanisms for self-observation and adaptive behavior."
  };
  const postsByTag = {};
  allTags.forEach((tag) => {
    postsByTag[tag] = allPosts.filter((post) => post.data.tags?.includes(tag));
  });
  return renderTemplate(_a || (_a = __template(["", " <script>(function(){", `
  document.addEventListener('DOMContentLoaded', function() {
    var tagButtons = document.querySelectorAll('.tag-btn');
    var terminalOutput = document.getElementById('terminal-output');
    var terminalResults = document.getElementById('terminal-results');
    var terminalStatus = document.getElementById('terminal-status');
    var statusIndicator = document.querySelector('.status-indicator');
    var activeNode = document.getElementById('active-node');
    var cursor = document.querySelector('.terminal-cursor');

    var activeTag = null;
    var isTyping = false;

    function typeText(text, callback) {
      isTyping = true;
      terminalStatus.textContent = 'COMPUTING';
      statusIndicator.classList.add('active');
      cursor.style.display = 'inline-block';

      var index = 0;
      terminalOutput.innerHTML = '';

      var interval = setInterval(function() {
        if (index < text.length) {
          var char = text.charAt(index);
          if (char === '\\n') {
            terminalOutput.innerHTML += '<br/>';
          } else {
            terminalOutput.innerHTML += char;
          }
          index++;
        } else {
          clearInterval(interval);
          isTyping = false;
          terminalStatus.textContent = 'IDLE';
          statusIndicator.classList.remove('active');
          cursor.style.display = 'none';
          if (callback) callback();
        }
      }, 15);
    }

    function showResults(tag) {
      var articles = postsByTag[tag] || [];

      if (articles.length === 0) {
        terminalResults.innerHTML = '<div class="no-results">> No published signals found for this node.<br/>> Topic is currently in active research phase.</div>';
      } else {
        var html = '';
        articles.forEach(function(article) {
          var date = new Date(article.data.date);
          var formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          html += '<a href="/' + article.slug + '/" class="result-item">' +
            '<div class="result-content">' +
              '<span class="result-title">' + article.data.title + '</span>' +
              '<span class="result-meta">' + formattedDate + '</span>' +
            '</div>' +
            '<span class="result-arrow">\u2192</span>' +
          '</a>';
        });
        terminalResults.innerHTML = html;
      }

      terminalResults.style.opacity = '0';
      setTimeout(function() {
        terminalResults.style.transition = 'opacity 300ms ease';
        terminalResults.style.opacity = '1';
      }, 100);
    }

    tagButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (isTyping) return;

        var tag = btn.dataset.tag;
        var count = btn.dataset.count;
        var description = btn.dataset.description;

        // Update active state
        tagButtons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        activeTag = tag;
        activeNode.textContent = '#' + tag;
        terminalResults.innerHTML = '';

        var outputText = '> QUERY: #' + tag.toUpperCase() + '\\n' +
          '> DEFINITION: ' + description + '\\n' +
          '> SIGNAL_STRENGTH: ' + (count > 0 ? 'HIGH' : 'LATENT') + '\\n' +
          '> DETECTED_OBJECTS: ' + count + '\\n\\n' +
          '> LISTING_RESULTS...';

        typeText(outputText, function() {
          showResults(tag);
        });
      });
    });
  });
})();<\/script> `], ["", " <script>(function(){", `
  document.addEventListener('DOMContentLoaded', function() {
    var tagButtons = document.querySelectorAll('.tag-btn');
    var terminalOutput = document.getElementById('terminal-output');
    var terminalResults = document.getElementById('terminal-results');
    var terminalStatus = document.getElementById('terminal-status');
    var statusIndicator = document.querySelector('.status-indicator');
    var activeNode = document.getElementById('active-node');
    var cursor = document.querySelector('.terminal-cursor');

    var activeTag = null;
    var isTyping = false;

    function typeText(text, callback) {
      isTyping = true;
      terminalStatus.textContent = 'COMPUTING';
      statusIndicator.classList.add('active');
      cursor.style.display = 'inline-block';

      var index = 0;
      terminalOutput.innerHTML = '';

      var interval = setInterval(function() {
        if (index < text.length) {
          var char = text.charAt(index);
          if (char === '\\\\n') {
            terminalOutput.innerHTML += '<br/>';
          } else {
            terminalOutput.innerHTML += char;
          }
          index++;
        } else {
          clearInterval(interval);
          isTyping = false;
          terminalStatus.textContent = 'IDLE';
          statusIndicator.classList.remove('active');
          cursor.style.display = 'none';
          if (callback) callback();
        }
      }, 15);
    }

    function showResults(tag) {
      var articles = postsByTag[tag] || [];

      if (articles.length === 0) {
        terminalResults.innerHTML = '<div class="no-results">> No published signals found for this node.<br/>> Topic is currently in active research phase.</div>';
      } else {
        var html = '';
        articles.forEach(function(article) {
          var date = new Date(article.data.date);
          var formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          html += '<a href="/' + article.slug + '/" class="result-item">' +
            '<div class="result-content">' +
              '<span class="result-title">' + article.data.title + '</span>' +
              '<span class="result-meta">' + formattedDate + '</span>' +
            '</div>' +
            '<span class="result-arrow">\u2192</span>' +
          '</a>';
        });
        terminalResults.innerHTML = html;
      }

      terminalResults.style.opacity = '0';
      setTimeout(function() {
        terminalResults.style.transition = 'opacity 300ms ease';
        terminalResults.style.opacity = '1';
      }, 100);
    }

    tagButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (isTyping) return;

        var tag = btn.dataset.tag;
        var count = btn.dataset.count;
        var description = btn.dataset.description;

        // Update active state
        tagButtons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        activeTag = tag;
        activeNode.textContent = '#' + tag;
        terminalResults.innerHTML = '';

        var outputText = '> QUERY: #' + tag.toUpperCase() + '\\\\n' +
          '> DEFINITION: ' + description + '\\\\n' +
          '> SIGNAL_STRENGTH: ' + (count > 0 ? 'HIGH' : 'LATENT') + '\\\\n' +
          '> DETECTED_OBJECTS: ' + count + '\\\\n\\\\n' +
          '> LISTING_RESULTS...';

        typeText(outputText, function() {
          showResults(tag);
        });
      });
    });
  });
})();<\/script> `])), renderComponent($$result, "Base", $$Base, { "title": "Explore", "description": "Browse articles by topic and hashtag. Explore knowledge graphs, AI agents, cybernetics, and more.", "keywords": "Curve Labs, knowledge graphs, AI agents, topics, hashtags, research", "data-astro-cid-jsy7jxlt": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="explore-container" data-astro-cid-jsy7jxlt> <div class="explore-header" data-astro-cid-jsy7jxlt> <div class="header-left" data-astro-cid-jsy7jxlt> <span class="hash-icon" data-astro-cid-jsy7jxlt>#</span> <h2 class="header-title" data-astro-cid-jsy7jxlt>Explore</h2> </div> <div class="header-right" data-astro-cid-jsy7jxlt>
INDEX_SIZE: ${allTags.length} // ACTIVE_NODE: <span id="active-node" data-astro-cid-jsy7jxlt>NULL</span> </div> </div> <div class="explore-grid" data-astro-cid-jsy7jxlt> <!-- Left: Tag Cloud --> <div class="tag-cluster" data-astro-cid-jsy7jxlt> ${allTags.map((tag) => {
    const count = postsByTag[tag].length;
    return renderTemplate`<button type="button" class="tag-btn"${addAttribute(tag, "data-tag")}${addAttribute(count, "data-count")}${addAttribute(tagDescriptions[tag] || "Semantic node detected in knowledge base. Analyzing vector relationships...", "data-description")} data-astro-cid-jsy7jxlt> <span class="tag-hash" data-astro-cid-jsy7jxlt>#</span>${tag} </button>`;
  })} </div> <!-- Right: Terminal Screen --> <div class="terminal-screen" data-astro-cid-jsy7jxlt> <div class="terminal-header" data-astro-cid-jsy7jxlt> <div class="terminal-header-left" data-astro-cid-jsy7jxlt> <span class="terminal-icon" data-astro-cid-jsy7jxlt>▸</span> <span data-astro-cid-jsy7jxlt>/sys/analysis</span> </div> <div class="terminal-header-right" data-astro-cid-jsy7jxlt> <div class="status-indicator" data-astro-cid-jsy7jxlt></div> <span id="terminal-status" data-astro-cid-jsy7jxlt>IDLE</span> </div> </div> <div class="terminal-content" data-astro-cid-jsy7jxlt> <div class="terminal-output" id="terminal-output" data-astro-cid-jsy7jxlt>
> SYSTEM READY.<br data-astro-cid-jsy7jxlt>
> AWAITING INPUT_VECTOR...<br data-astro-cid-jsy7jxlt>
> SELECT A HASHTAG TO ANALYZE.
</div> <div class="terminal-cursor" data-astro-cid-jsy7jxlt></div> <div class="terminal-results" id="terminal-results" data-astro-cid-jsy7jxlt></div> </div> <div class="scanlines" data-astro-cid-jsy7jxlt></div> </div> </div> </div> ` }), defineScriptVars({ postsByTag, tagDescriptions }));
}, "C:/curve_v2/egregore-curve-labs/blog/src/pages/explore.astro", void 0);

const $$file = "C:/curve_v2/egregore-curve-labs/blog/src/pages/explore.astro";
const $$url = "/explore";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Explore,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
