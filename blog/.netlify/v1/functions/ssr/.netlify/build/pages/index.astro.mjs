import { e as createAstro, c as createComponent, a as renderTemplate, b as addAttribute, m as maybeRenderHead, r as renderComponent, f as renderScript, d as defineScriptVars } from '../chunks/astro/server_B_xQNr3j.mjs';
import 'piccolore';
import { g as getCollection } from '../chunks/_astro_content_CiI689C0.mjs';
import { $ as $$Base } from '../chunks/Base_DgxGlGnX.mjs';
import 'clsx';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

var __freeze$3 = Object.freeze;
var __defProp$3 = Object.defineProperty;
var __template$3 = (cooked, raw) => __freeze$3(__defProp$3(cooked, "raw", { value: __freeze$3(cooked.slice()) }));
var _a$3;
const $$Astro$3 = createAstro("https://blog.curvelabs.eu");
const $$FeaturedCarousel = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$FeaturedCarousel;
  const { posts } = Astro2.props;
  return renderTemplate(_a$3 || (_a$3 = __template$3(["", '<div class="carousel" data-carousel data-astro-cid-dqlzaero> <div class="carousel-track" data-astro-cid-dqlzaero> ', " </div> ", " </div> <script>\n  document.addEventListener('DOMContentLoaded', function() {\n    var carousel = document.querySelector('[data-carousel]');\n    if (!carousel) return;\n\n    var slides = carousel.querySelectorAll('.carousel-slide');\n    var dots = carousel.querySelectorAll('.carousel-dot');\n    var prevBtn = carousel.querySelector('[data-prev]');\n    var nextBtn = carousel.querySelector('[data-next]');\n    var currentIndex = 0;\n    var autoplayInterval;\n\n    function goToSlide(index) {\n      // Wrap around\n      if (index < 0) index = slides.length - 1;\n      if (index >= slides.length) index = 0;\n\n      // Update slides\n      slides.forEach(function(slide, i) {\n        slide.classList.remove('active');\n        slide.style.opacity = '0';\n        slide.style.transform = 'translateX(20px)';\n      });\n\n      var activeSlide = slides[index];\n      activeSlide.classList.add('active');\n      setTimeout(function() {\n        activeSlide.style.opacity = '1';\n        activeSlide.style.transform = 'translateX(0)';\n      }, 50);\n\n      // Update dots\n      dots.forEach(function(dot, i) {\n        dot.classList.toggle('active', i === index);\n      });\n\n      currentIndex = index;\n    }\n\n    function nextSlide() {\n      goToSlide(currentIndex + 1);\n    }\n\n    function prevSlide() {\n      goToSlide(currentIndex - 1);\n    }\n\n    function startAutoplay() {\n      autoplayInterval = setInterval(nextSlide, 6000);\n    }\n\n    function stopAutoplay() {\n      clearInterval(autoplayInterval);\n    }\n\n    // Event listeners\n    if (prevBtn) prevBtn.addEventListener('click', function() { stopAutoplay(); prevSlide(); startAutoplay(); });\n    if (nextBtn) nextBtn.addEventListener('click', function() { stopAutoplay(); nextSlide(); startAutoplay(); });\n\n    dots.forEach(function(dot, i) {\n      dot.addEventListener('click', function() {\n        stopAutoplay();\n        goToSlide(i);\n        startAutoplay();\n      });\n    });\n\n    // Pause on hover\n    carousel.addEventListener('mouseenter', stopAutoplay);\n    carousel.addEventListener('mouseleave', startAutoplay);\n\n    // Initialize\n    goToSlide(0);\n    startAutoplay();\n  });\n<\/script> "])), maybeRenderHead(), posts.map((post, index) => {
    const { title, subtitle, date, readTime, category, author } = post.data;
    return renderTemplate`<article${addAttribute(index, "data-index")}${addAttribute(["carousel-slide", { active: index === 0 }], "class:list")} data-astro-cid-dqlzaero> <a${addAttribute(`/${post.slug}/`, "href")} class="featured-link" data-astro-cid-dqlzaero> <div class="featured-content" data-astro-cid-dqlzaero> <div class="featured-meta" data-astro-cid-dqlzaero> <span class="category" data-astro-cid-dqlzaero>${category}</span> <span class="divider" data-astro-cid-dqlzaero>•</span> <time${addAttribute(date.toISOString(), "datetime")} data-astro-cid-dqlzaero> ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} </time> <span class="divider" data-astro-cid-dqlzaero>•</span> <span class="read-time" data-astro-cid-dqlzaero>${readTime}</span> </div> <h2 class="featured-title" data-astro-cid-dqlzaero>${title}</h2> <p class="featured-subtitle" data-astro-cid-dqlzaero>${subtitle}</p> <div class="featured-author" data-astro-cid-dqlzaero> <span class="author-label" data-astro-cid-dqlzaero>by</span> <span class="author-name" data-astro-cid-dqlzaero>${author}</span> </div> </div> <div class="featured-indicator" data-astro-cid-dqlzaero> <span class="indicator-text" data-astro-cid-dqlzaero>Featured</span> <span class="indicator-arrow" data-astro-cid-dqlzaero>→</span> </div> </a> </article>`;
  }), posts.length > 1 && renderTemplate`<div class="carousel-controls" data-astro-cid-dqlzaero> <div class="carousel-dots" data-astro-cid-dqlzaero> ${posts.map((_, index) => renderTemplate`<button type="button"${addAttribute(["carousel-dot", { active: index === 0 }], "class:list")}${addAttribute(index, "data-dot")}${addAttribute(`Go to slide ${index + 1}`, "aria-label")} data-astro-cid-dqlzaero></button>`)} </div> <div class="carousel-nav" data-astro-cid-dqlzaero> <button type="button" class="carousel-btn" data-prev aria-label="Previous slide" data-astro-cid-dqlzaero>←</button> <button type="button" class="carousel-btn" data-next aria-label="Next slide" data-astro-cid-dqlzaero>→</button> </div> </div>`);
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/FeaturedCarousel.astro", void 0);

const $$Astro$2 = createAstro("https://blog.curvelabs.eu");
const $$PostRow = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$PostRow;
  const { post, index } = Astro2.props;
  const { title, subtitle, date, readTime, category, tags } = post.data;
  const num = String(index + 1).padStart(2, "0");
  const tagsString = tags ? tags.join(",") : "";
  return renderTemplate`${maybeRenderHead()}<article class="post-row"${addAttribute(category, "data-category")}${addAttribute(tagsString, "data-tags")} data-astro-cid-vk4lpe3e> <a${addAttribute(`/${post.slug}/`, "href")} class="post-link" data-astro-cid-vk4lpe3e> <span class="post-num" data-astro-cid-vk4lpe3e>[${num}]</span> <div class="post-content" data-astro-cid-vk4lpe3e> <div class="post-meta" data-astro-cid-vk4lpe3e> <span class="category" data-astro-cid-vk4lpe3e>${category}</span> <span class="divider" data-astro-cid-vk4lpe3e>•</span> <span class="read-time" data-astro-cid-vk4lpe3e>${readTime}</span> </div> <h3 class="post-title" data-astro-cid-vk4lpe3e>${title}</h3> <p class="post-subtitle" data-astro-cid-vk4lpe3e>${subtitle}</p> <time class="post-date"${addAttribute(date.toISOString(), "datetime")} data-astro-cid-vk4lpe3e> ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} </time> </div> <span class="post-arrow" data-astro-cid-vk4lpe3e>→</span> </a> </article> `;
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/PostRow.astro", void 0);

const $$Astro$1 = createAstro("https://blog.curvelabs.eu");
const $$GridCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$GridCard;
  const { post } = Astro2.props;
  const { title, subtitle, date, readTime, category, tags } = post.data;
  const tagsString = tags ? tags.join(",") : "";
  return renderTemplate`${maybeRenderHead()}<article class="grid-card"${addAttribute(category, "data-category")}${addAttribute(tagsString, "data-tags")} data-astro-cid-nxdpaj45> <a${addAttribute(`/${post.slug}/`, "href")} class="card-link" data-astro-cid-nxdpaj45> <div class="card-meta" data-astro-cid-nxdpaj45> <span class="category" data-astro-cid-nxdpaj45>${category}</span> <span class="divider" data-astro-cid-nxdpaj45>•</span> <span class="read-time" data-astro-cid-nxdpaj45>${readTime}</span> </div> <h3 class="card-title" data-astro-cid-nxdpaj45>${title}</h3> <p class="card-subtitle" data-astro-cid-nxdpaj45>${subtitle}</p> <div class="card-footer" data-astro-cid-nxdpaj45> <time${addAttribute(date.toISOString(), "datetime")} data-astro-cid-nxdpaj45> ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} </time> <span class="card-arrow" data-astro-cid-nxdpaj45>→</span> </div> </a> </article> `;
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/GridCard.astro", void 0);

const $$Astro = createAstro("https://blog.curvelabs.eu");
const $$PostGrid = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$PostGrid;
  const { posts, class: className } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(["post-grid", className], "class:list")} data-layout="grid" data-astro-cid-tlgb5vcc> ${posts.map((post) => renderTemplate`${renderComponent($$result, "GridCard", $$GridCard, { "post": post, "data-astro-cid-tlgb5vcc": true })}`)} </div> `;
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/PostGrid.astro", void 0);

var __freeze$2 = Object.freeze;
var __defProp$2 = Object.defineProperty;
var __template$2 = (cooked, raw) => __freeze$2(__defProp$2(cooked, "raw", { value: __freeze$2(cooked.slice()) }));
var _a$2;
const $$Filters = createComponent(($$result, $$props, $$slots) => {
  const categories = ["All", "Research", "Technical", "Essay", "Update"];
  return renderTemplate(_a$2 || (_a$2 = __template$2(["", '<div class="filters" data-astro-cid-eqy7gy2x> ', ` </div> <script>
  document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('[data-filter]');
    const posts = document.querySelectorAll('[data-category]');

    function applyFilter(filter) {
      // Update active state
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      var activeBtn = document.querySelector('[data-filter="' + filter + '"]');
      if (activeBtn) activeBtn.classList.add('active');

      // Collect posts to show/hide
      var toShow = [];
      var toHide = [];

      posts.forEach(function(post) {
        var category = post.dataset.category;
        var shouldShow = filter === 'All' || category === filter;

        if (shouldShow && post.style.display === 'none') {
          toShow.push(post);
        } else if (!shouldShow && post.style.display !== 'none') {
          toHide.push(post);
        }
      });

      // First, fade out posts that should be hidden
      toHide.forEach(function(post) {
        post.style.transition = 'opacity 150ms ease, transform 150ms ease';
        post.style.opacity = '0';
        post.style.transform = 'translateY(-8px)';
      });

      // After fade out completes, hide them and show new ones
      setTimeout(function() {
        toHide.forEach(function(post) {
          post.style.display = 'none';
        });

        // Now show posts with stagger animation
        var delay = 0;
        toShow.forEach(function(post) {
          post.style.display = '';
          post.style.opacity = '0';
          post.style.transform = 'translateY(8px)';
          post.style.transition = 'none';

          setTimeout(function() {
            post.style.transition = 'opacity 200ms ease, transform 200ms ease';
            post.style.opacity = '1';
            post.style.transform = 'translateY(0)';
          }, delay);
          delay += 30;
        });
      }, 150);
    }

    // Check URL for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('category');
    const tagFromUrl = urlParams.get('tag');

    if (tagFromUrl) {
      // Filter by tag instead of category
      applyTagFilter(tagFromUrl);
      // Scroll to archive
      if (window.location.hash === '#archive') {
        const archive = document.getElementById('archive');
        if (archive) {
          setTimeout(function() { archive.scrollIntoView({ behavior: 'smooth' }); }, 100);
        }
      }
    } else if (categoryFromUrl) {
      applyFilter(categoryFromUrl);
      // Scroll to archive if coming from nav link (has hash or category param)
      if (window.location.hash === '#archive') {
        const archive = document.getElementById('archive');
        if (archive) {
          setTimeout(function() { archive.scrollIntoView({ behavior: 'smooth' }); }, 100);
        }
      }
    }

    function applyTagFilter(tag) {
      // Deactivate all category buttons
      filterBtns.forEach(function(b) { b.classList.remove('active'); });

      // Collect posts to show/hide based on tag
      var toShow = [];
      var toHide = [];

      posts.forEach(function(post) {
        var postTags = post.dataset.tags ? post.dataset.tags.split(',') : [];
        var hasTag = postTags.some(function(t) { return t.trim().toLowerCase() === tag.toLowerCase(); });

        if (hasTag && post.style.display === 'none') {
          toShow.push(post);
        } else if (!hasTag && post.style.display !== 'none') {
          toHide.push(post);
        }
      });

      // Animate hide/show
      toHide.forEach(function(post) {
        post.style.transition = 'opacity 150ms ease, transform 150ms ease';
        post.style.opacity = '0';
        post.style.transform = 'translateY(-8px)';
      });

      setTimeout(function() {
        toHide.forEach(function(post) {
          post.style.display = 'none';
        });

        var delay = 0;
        toShow.forEach(function(post) {
          post.style.display = '';
          post.style.opacity = '0';
          post.style.transform = 'translateY(8px)';
          post.style.transition = 'none';

          setTimeout(function() {
            post.style.transition = 'opacity 200ms ease, transform 200ms ease';
            post.style.opacity = '1';
            post.style.transform = 'translateY(0)';
          }, delay);
          delay += 30;
        });
      }, 150);
    }

    // Handle button clicks
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const filter = btn.getAttribute('data-filter') || 'All';
        applyFilter(filter);

        // Update URL without reload
        const url = new URL(window.location.href);
        if (filter === 'All') {
          url.searchParams.delete('category');
        } else {
          url.searchParams.set('category', filter);
        }
        history.replaceState(null, '', url.toString());

        return false;
      });
    });
  });
<\/script> `])), maybeRenderHead(), categories.map((category) => renderTemplate`<button type="button"${addAttribute(category, "data-filter")}${addAttribute(["filter-btn", { active: category === "All" }], "class:list")} data-astro-cid-eqy7gy2x> ${category} </button>`));
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/Filters.astro", void 0);

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(cooked.slice()) }));
var _a$1;
const $$ViewToggle = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a$1 || (_a$1 = __template$1(["", `<div class="view-toggle" data-astro-cid-p6kfeelo> <button type="button" data-view="grid" class="toggle-btn active" title="Grid view" data-astro-cid-p6kfeelo> <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" data-astro-cid-p6kfeelo> <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5" data-astro-cid-p6kfeelo></rect> <rect x="11" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5" data-astro-cid-p6kfeelo></rect> <rect x="2" y="11" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5" data-astro-cid-p6kfeelo></rect> <rect x="11" y="11" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5" data-astro-cid-p6kfeelo></rect> </svg> </button> <button type="button" data-view="list" class="toggle-btn" title="List view" data-astro-cid-p6kfeelo> <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" data-astro-cid-p6kfeelo> <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" data-astro-cid-p6kfeelo></path> </svg> </button> </div> <script>
  document.addEventListener('DOMContentLoaded', function() {
    const toggleBtns = document.querySelectorAll('[data-view]');
    const listView = document.querySelector('[data-layout="list"]');
    const gridView = document.querySelector('[data-layout="grid"]');

    function switchView(showView, hideView) {
      if (!showView || !hideView) return;

      // Fade out current view
      hideView.classList.add('fade-out');
      hideView.classList.remove('fade-in', 'animate-now');

      setTimeout(function() {
        hideView.style.display = 'none';
        hideView.classList.remove('fade-out');

        // Fade in new view with stagger animation
        showView.style.display = '';
        showView.classList.add('fade-in', 'stagger-animate', 'animate-now');
        showView.classList.remove('fade-out');
      }, 150);
    }

    toggleBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const view = btn.getAttribute('data-view');

        // Update active state
        toggleBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        // Toggle views with animation
        if (view === 'list') {
          switchView(listView, gridView);
        } else {
          switchView(gridView, listView);
        }

        return false;
      });
    });
  });
<\/script> `])), maybeRenderHead());
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/ViewToggle.astro", void 0);

const $$Newsletter = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="newsletter" data-astro-cid-motrwrji> <div class="newsletter-content" data-astro-cid-motrwrji> <h3 class="newsletter-title" data-astro-cid-motrwrji>Stay Updated</h3> <p class="newsletter-desc" data-astro-cid-motrwrji>
Get notified when we publish new research and project updates.
</p> </div> <form class="newsletter-form" name="newsletter" method="POST" data-netlify="true" netlify-honeypot="bot-field" data-astro-cid-motrwrji> <input type="hidden" name="form-name" value="newsletter" data-astro-cid-motrwrji> <p class="hidden" data-astro-cid-motrwrji><input name="bot-field" data-astro-cid-motrwrji></p> <input type="email" name="email" placeholder="your@email.com" required class="newsletter-input" data-astro-cid-motrwrji> <button type="submit" class="newsletter-btn" data-astro-cid-motrwrji>
Subscribe
</button> </form> </section> ${renderScript($$result, "C:/curve_v2/egregore-curve-labs/blog/src/components/Newsletter.astro?astro&type=script&index=0&lang.ts")} `;
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/Newsletter.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const allPosts = (await getCollection("posts", ({ data }) => !data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const markedFeatured = allPosts.filter((post) => post.data.featured);
  const featuredPosts = markedFeatured.length > 0 ? markedFeatured : allPosts.slice(0, 3);
  const archivePosts = allPosts.filter((post) => !featuredPosts.includes(post));
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
  // Grid view is visible by default, no initial animation needed

  // Explore Terminal
  document.addEventListener('DOMContentLoaded', function() {
    var tagButtons = document.querySelectorAll('.tag-btn');
    var terminalOutput = document.getElementById('terminal-output');
    var terminalResults = document.getElementById('terminal-results');
    var terminalStatus = document.getElementById('terminal-status');
    var statusIndicator = document.querySelector('.status-indicator');
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

    // Check URL for tag parameter and auto-activate
    var urlParams = new URLSearchParams(window.location.search);
    var tagFromUrl = urlParams.get('tag');
    if (tagFromUrl) {
      // Find the corresponding tag button
      var targetBtn = Array.from(tagButtons).find(function(btn) {
        return btn.dataset.tag.toLowerCase() === tagFromUrl.toLowerCase();
      });

      if (targetBtn) {
        // Small delay to ensure page is fully loaded
        setTimeout(function() {
          targetBtn.click();
        }, 300);
      }
    }
  });
})();<\/script> `], ["", " <script>(function(){", `
  // Grid view is visible by default, no initial animation needed

  // Explore Terminal
  document.addEventListener('DOMContentLoaded', function() {
    var tagButtons = document.querySelectorAll('.tag-btn');
    var terminalOutput = document.getElementById('terminal-output');
    var terminalResults = document.getElementById('terminal-results');
    var terminalStatus = document.getElementById('terminal-status');
    var statusIndicator = document.querySelector('.status-indicator');
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

    // Check URL for tag parameter and auto-activate
    var urlParams = new URLSearchParams(window.location.search);
    var tagFromUrl = urlParams.get('tag');
    if (tagFromUrl) {
      // Find the corresponding tag button
      var targetBtn = Array.from(tagButtons).find(function(btn) {
        return btn.dataset.tag.toLowerCase() === tagFromUrl.toLowerCase();
      });

      if (targetBtn) {
        // Small delay to ensure page is fully loaded
        setTimeout(function() {
          targetBtn.click();
        }, 300);
      }
    }
  });
})();<\/script> `])), renderComponent($$result, "Base", $$Base, { "title": "Blog", "description": "Deep dives on knowledge graphs, multi-agent systems, and the infrastructure layer for human\u2013AI collaboration.", "keywords": "Curve Labs, knowledge graphs, AI agents, multi-agent systems, distributed systems, cybernetics, protocol design, governance, coordination, active inference", "data-astro-cid-j7pv25f6": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container" data-astro-cid-j7pv25f6> <!-- Header --> <header class="page-header" data-astro-cid-j7pv25f6> <h1 class="page-title" data-astro-cid-j7pv25f6>Dispatches</h1> <p class="page-desc" data-astro-cid-j7pv25f6>Deep dives on knowledge graphs, multi-agent systems, and the infrastructure layer for human–AI collaboration.</p> </header> <!-- Featured Posts Carousel --> ${featuredPosts.length > 0 && renderTemplate`<section class="featured-section" data-astro-cid-j7pv25f6> ${renderComponent($$result2, "FeaturedCarousel", $$FeaturedCarousel, { "posts": featuredPosts, "data-astro-cid-j7pv25f6": true })} </section>`} <!-- Archive --> ${archivePosts.length > 0 && renderTemplate`<section class="archive-section" id="archive" data-astro-cid-j7pv25f6> <div class="archive-header" data-astro-cid-j7pv25f6> <h2 class="archive-title" data-astro-cid-j7pv25f6>Archive</h2> <div class="archive-controls" data-astro-cid-j7pv25f6> ${renderComponent($$result2, "Filters", $$Filters, { "data-astro-cid-j7pv25f6": true })} ${renderComponent($$result2, "ViewToggle", $$ViewToggle, { "data-astro-cid-j7pv25f6": true })} </div> </div> <!-- List View --> <div class="post-list" data-layout="list" style="display: none;" data-astro-cid-j7pv25f6> ${archivePosts.map((post, index) => renderTemplate`${renderComponent($$result2, "PostRow", $$PostRow, { "post": post, "index": index, "data-astro-cid-j7pv25f6": true })}`)} </div> <!-- Grid View (default) --> ${renderComponent($$result2, "PostGrid", $$PostGrid, { "posts": archivePosts, "data-astro-cid-j7pv25f6": true })} </section>`} <!-- Explore Terminal --> <section class="explore-section" id="explore" data-astro-cid-j7pv25f6> <div class="explore-header" data-astro-cid-j7pv25f6> <h2 class="explore-title" data-astro-cid-j7pv25f6>Explore</h2> </div> <div class="explore-grid" data-astro-cid-j7pv25f6> <!-- Left: Tag Cloud --> <div class="tag-cluster" data-astro-cid-j7pv25f6> ${allTags.map((tag) => {
    const count = postsByTag[tag].length;
    return renderTemplate`<button type="button" class="tag-btn"${addAttribute(tag, "data-tag")}${addAttribute(count, "data-count")}${addAttribute(tagDescriptions[tag] || "Semantic node detected in knowledge base. Analyzing vector relationships...", "data-description")} data-astro-cid-j7pv25f6> <span class="tag-hash" data-astro-cid-j7pv25f6>#</span>${tag} </button>`;
  })} </div> <!-- Right: Terminal Screen --> <div class="terminal-screen" data-astro-cid-j7pv25f6> <div class="terminal-header" data-astro-cid-j7pv25f6> <div class="terminal-header-left" data-astro-cid-j7pv25f6> <span class="terminal-icon" data-astro-cid-j7pv25f6>▸</span> <span data-astro-cid-j7pv25f6>/sys/analysis</span> </div> <div class="terminal-header-right" data-astro-cid-j7pv25f6> <div class="status-indicator" data-astro-cid-j7pv25f6></div> <span id="terminal-status" data-astro-cid-j7pv25f6>IDLE</span> </div> </div> <div class="terminal-content" data-astro-cid-j7pv25f6> <div class="terminal-output" id="terminal-output" data-astro-cid-j7pv25f6>
> SYSTEM READY.<br data-astro-cid-j7pv25f6>
> AWAITING INPUT_VECTOR...<br data-astro-cid-j7pv25f6>
> SELECT A HASHTAG TO ANALYZE.
</div> <div class="terminal-cursor" data-astro-cid-j7pv25f6></div> <div class="terminal-results" id="terminal-results" data-astro-cid-j7pv25f6></div> </div> <div class="scanlines" data-astro-cid-j7pv25f6></div> </div> </div> </section> <!-- Social (placeholder for featured tweets) --> <section class="social-section" id="social" data-astro-cid-j7pv25f6> <h2 class="section-title" data-astro-cid-j7pv25f6>Social</h2> <p class="section-placeholder" data-astro-cid-j7pv25f6>Featured tweets coming soon.</p> </section> <!-- Connect --> <section class="connect-section" id="connect" data-astro-cid-j7pv25f6> ${renderComponent($$result2, "Newsletter", $$Newsletter, { "data-astro-cid-j7pv25f6": true })} </section> </div> ` }), defineScriptVars({ postsByTag }));
}, "C:/curve_v2/egregore-curve-labs/blog/src/pages/index.astro", void 0);

const $$file = "C:/curve_v2/egregore-curve-labs/blog/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
