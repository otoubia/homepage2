/* render.js: shared renderer for CV-based homepages (build-homepage-from-cv skill).
 * Copied into each site by cv_to_data.py; do not edit the copy in a site folder.
 *
 * Load order in index.html:  <script src="cv-data.js"></script>
 *                            <script>window.CVTemplates = {...}  // optional overrides</script>
 *                            <script src="render.js"></script>
 * The page supplies the layout and the CSS; this file fills every element marked with
 * data-cv / data-cv-text / data-cv-href / data-cv-count and wires the interactions.
 * Class names and options are documented in ../render-reference.md.
 */
(function () {
  "use strict";
  var CV = window.CV, C = CV.contact, K = CV.counts, TOPICS = CV.topics || {};
  var errors = [];
  addEventListener("error", function (e) { errors.push(String(e.message || e)); });

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  // ?static (used for verify screenshots) renders the final state with no animation
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || /[?&](static|verify)\b/.test(location.search);
  if (/[?&]static\b/.test(location.search)) document.documentElement.classList.add("cv-static");
  var opt = function (el, name, dflt) { var v = el.getAttribute("data-" + name); return v == null ? dflt : v; };
  var boldMe = function (a) { return esc(a).replace(/Toubia, Olivier|Olivier Toubia/g, function (m) { return '<b class="cv-me">' + m + "</b>"; }); };
  var ICON = { win: "trophy", finalist: "medal", other: "star" };
  var KIND = { HBR: "Harvard Business Review", Chapter: "Chapter", Editorial: "Editorial", Book: "Book" };

  var mainJob = CV.employment.filter(function (e) { return e.ongoing; })[0] || CV.employment[0];
  var leadRole = CV.activity.filter(function (a) { return a.ongoing && a.group === "admin"; })[0];
  var nameParts = CV.name.split(" ");

  /* ---------- item templates (override any of these via window.CVTemplates) ---------- */
  var H = { esc: esc, boldMe: boldMe, TOPICS: TOPICS, ICON: ICON, KIND: KIND };
  var T = {
    contact: function (c) {
      var tag = c.href ? 'a href="' + esc(c.href) + '"' + (c.ext ? ' target="_blank" rel="noopener"' : "") : "div";
      return "<" + tag + ' class="cv-contact-item cv-contact-' + c.key + '"><i class="cv-ic ' + c.icon + '"></i><div><small>' +
        esc(c.label) + "</small><span>" + esc(c.value) + "</span></div></" + tag.split(" ")[0] + ">";
    },
    stat: function (s) {
      return '<div class="cv-stat"><b class="cv-num" data-n="' + s.n + '">' + (reduce ? s.n : 0) + '</b><span class="cv-label">' + esc(s.label) + "</span></div>";
    },
    role: function (r, h, lead) {
      return '<div class="cv-role' + (lead ? " cv-lead" : "") + '"><div class="cv-years">' + esc(r.years) + "</div><h3>" + esc(r.role) + "</h3><p>" +
        (r.group === "editorial" ? "<em>" + esc(r.org) + "</em>" : esc(r.org)) + "</p></div>";
    },
    paper: function (p) {
      var badges = p.awards.map(function (a) {
        return '<span class="cv-badge ' + (a.win ? "cv-win" : "cv-fin") + '"><i class="fa-solid fa-' + (a.win ? "trophy" : "medal") + '"></i>' +
          (a.win ? "Winner" : "Finalist") + " · " + esc(a.year) + " " + esc(a.short) + "</span>";
      }).join("");
      return '<article class="cv-paper' + (p.awards.some(function (a) { return a.win; }) ? " cv-won" : "") + '"><div class="cv-paper-body">' +
        '<h3 class="cv-title">' + esc(p.title) + '</h3><div class="cv-authors">' + boldMe(p.authors) + "</div>" +
        '<div class="cv-venue">' + esc(p.venue) + (p.notes.length ? ' <em class="cv-notes">· ' + esc(p.notes.join(" · ")) + "</em>" : "") + "</div>" +
        (badges ? '<div class="cv-badges">' + badges + "</div>" : "") + "</div>" +
        '<div class="cv-tags">' + (p.tags || []).map(function (t) { return '<span class="cv-tag">' + esc(TOPICS[t] || t) + "</span>"; }).join("") + "</div></article>";
    },
    yearHead: function (y) { return '<div class="cv-year">' + esc(y) + "</div>"; },
    honor: function (h) {
      return '<div class="cv-honor cv-' + h.kind + '"><div class="cv-ic"><i class="fa-solid fa-' + (ICON[h.kind] || "star") + '"></i></div><h3>' + esc(h.name) +
        '</h3><div class="cv-years">' + h.years.map(function (y) { return "<span>" + esc(y) + "</span>"; }).join("") + "</div></div>";
    },
    job: function (e) {
      return '<div class="cv-job' + (e.ongoing ? " cv-ongoing" : "") + '"><div class="cv-years">' + esc(e.years) + "</div><h4>" + esc(e.role) + "</h4><p>" + esc(e.org) + "</p></div>";
    },
    edu: function (e) {
      return '<div class="cv-edu"><div class="cv-degree">' + esc(e.degree) + (e.field ? ' <span class="cv-field">' + esc(e.field) + "</span>" : "") +
        "</div><p>" + esc(e.school) + '</p><div class="cv-date">' + esc(e.date) + "</div></div>";
    },
    svc: function (a) {
      return '<div class="cv-svc-item' + (a.ongoing ? " cv-ongoing" : "") + '"><span class="cv-years">' + esc(a.years) + "</span><span><b>" + esc(a.role) + "</b>, " +
        (a.group === "editorial" ? "<em>" + esc(a.org) + "</em>" : esc(a.org)) + "</span></div>";
    },
    work: function (o) {
      return '<div class="cv-work cv-kind-' + o.kind.toLowerCase() + '"><div class="cv-kind-row"><span class="cv-kind">' + esc(KIND[o.kind] || o.kind) +
        '</span><span class="cv-y">' + esc(o.year) + "</span></div><h3>" + esc(o.title) + '</h3><p class="cv-authors">' + esc(o.authors) +
        '</p><p class="cv-venue"><em>' + esc(o.venue) + "</em></p></div>";
    },
    link: function (l) {
      return '<a class="cv-link cv-link-' + l.key + '" href="' + esc(l.href) + '"' + (l.ext ? ' target="_blank" rel="noopener"' : "") +
        '><i class="' + l.icon + '"></i><span>' + esc(l.label) + "</span></a>";
    }
  };
  var O = window.CVTemplates || {};
  Object.keys(O).forEach(function (k) { T[k] = O[k]; });

  /* ---------- data helpers ---------- */
  var CONTACT = [
    { key: "office", icon: "fa-solid fa-building", label: "Office", value: C.office },
    { key: "address", icon: "fa-solid fa-location-dot", label: "Address", value: C.address },
    { key: "phone", icon: "fa-solid fa-phone", label: "Phone", value: C.phone, href: "tel:" + String(C.phone || "").replace(/[^\d+]/g, "") },
    { key: "email", icon: "fa-solid fa-envelope", label: "Email", value: C.email, href: "mailto:" + C.email },
    { key: "linkedin", icon: "fa-brands fa-linkedin", label: "LinkedIn", value: "Connect", href: C.linkedin, ext: true }
  ];
  var LINKS = [
    { key: "linkedin", icon: "fa-brands fa-linkedin", label: "LinkedIn", href: C.linkedin, ext: true },
    { key: "email", icon: "fa-solid fa-envelope", label: "Email", href: "mailto:" + C.email },
    { key: "github", icon: "fa-brands fa-github", label: "GitHub", href: C.github, ext: true },
    { key: "classic", icon: "fa-solid fa-landmark", label: "Classic site", href: C.classic }
  ];
  var STAT_LABELS = {
    papers: "peer-reviewed papers", paperWins: "paper awards won", paperFinalists: "award finalist nods", papersWithAwards: "award-winning papers",
    yearsAtColumbia: "years at Columbia", coauthors: "coauthors", hbr: "Harvard Business Review pieces", honors: "honors & awards", other: "chapters, books & essays"
  };
  var HREF = { linkedin: C.linkedin, github: C.github, classic: C.classic, email: "mailto:" + C.email, phone: "tel:" + String(C.phone || "").replace(/[^\d+]/g, "") };
  var TEXT = {
    "first-name": nameParts[0], "last-name": nameParts.slice(1).join(" "), "main-role": mainJob && mainJob.role,
    "lead-role": leadRole ? leadRole.role : mainJob.role, "lead-org": leadRole ? leadRole.org : mainJob.org, year: new Date().getFullYear()
  };
  var lookup = function (path) {
    if (path in TEXT) return TEXT[path];
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, CV);
  };

  /* ---------- section renderers ---------- */
  var R = {
    contact: function (el) { var keys = opt(el, "items", "office,address,phone,email,linkedin").split(",");
      el.innerHTML = CONTACT.filter(function (c) { return keys.indexOf(c.key) >= 0 && c.value; }).map(T.contact).join(""); },
    links: function (el) { var keys = opt(el, "items", "linkedin,email,github,classic").split(",");
      el.innerHTML = LINKS.filter(function (l) { return keys.indexOf(l.key) >= 0; }).map(T.link).join(""); },
    stats: function (el) {
      el.innerHTML = opt(el, "items", "papers,paperWins,yearsAtColumbia,coauthors,hbr").split(",").map(function (k) {
        return T.stat({ key: k, n: K[k], label: STAT_LABELS[k] || k });
      }).join("");
    },
    now: function (el) {
      var roles = CV.activity.filter(function (a) { return a.ongoing; });
      var lead = roles.filter(function (a) { return a.group === "admin"; })[0];
      el.innerHTML = (lead ? T.role(lead, H, true) : "") + T.role(mainJob, H, !lead) +
        roles.filter(function (a) { return a !== lead; }).map(function (a) { return T.role(a, H, false); }).join("");
    },
    interests: function (el) {
      var n = +opt(el, "repeat", 1), one = CV.interests.map(function (i) { return '<span class="cv-interest">' + esc(i) + "</span>"; }).join(""), s = "";
      for (var i = 0; i < n; i++) s += one;
      el.innerHTML = s;
    },
    typer: function (el) {
      var words = CV.interests.map(function (w) { return opt(el, "case", "lower") === "lower" ? w.toLowerCase() : w; });
      if (reduce) { el.textContent = words.join(" · "); return; }
      var wi = 0, ci = 0, del = false;
      (function type() {
        var w = words[wi]; el.textContent = w.slice(0, ci);
        if (!del && ci < w.length) ci++;
        else if (!del) { del = true; return setTimeout(type, 1500); }
        else if (ci > 0) ci--;
        else { del = false; wi = (wi + 1) % words.length; }
        setTimeout(type, del ? 35 : 75);
      })();
    },
    papers: function (el) {
      var order = opt(el, "order", "newest"), group = opt(el, "group", "year") === "year", controls = opt(el, "controls", "on") !== "off";
      var papers = CV.papers.map(function (p, i) { var q = Object.assign({}, p); q.i = i; q.tags = p.tags || []; return q; });
      if (order === "newest") papers.reverse();
      var topic = "all";
      var count = function (t) { return t === "all" ? papers.length : papers.filter(function (p) { return p.tags.indexOf(t) >= 0; }).length; };
      var used = Object.keys(TOPICS).filter(function (t) { return count(t) > 0; });
      el.innerHTML = (controls ?
        '<div class="cv-controls"><div class="cv-chips">' + [["all", "Everything"]].concat(used.map(function (t) { return [t, TOPICS[t]]; })).map(function (c) {
          return '<button type="button" class="cv-chip' + (c[0] === "all" ? " on" : "") + '" data-t="' + c[0] + '">' + esc(c[1]) + '<span class="cv-n">' + count(c[0]) + "</span></button>";
        }).join("") + '</div><div class="cv-row"><label class="cv-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="Search titles, coauthors, journals…" aria-label="Search papers"></label>' +
        '<label class="cv-toggle"><input type="checkbox"> <i class="fa-solid fa-trophy"></i> <span>Award winners only</span></label><span class="cv-count"></span></div></div>' : "") +
        '<div class="cv-paperlist"></div>';
      var list = el.querySelector(".cv-paperlist"), q = el.querySelector(".cv-search input"), aw = el.querySelector(".cv-toggle input"), cnt = el.querySelector(".cv-count");
      function draw() {
        var s = q ? q.value.trim().toLowerCase() : "", only = aw && aw.checked;
        var shown = papers.filter(function (p) {
          return (topic === "all" || p.tags.indexOf(topic) >= 0) && (!only || p.awards.some(function (a) { return a.win; })) &&
            (!s || (p.title + " " + p.authors + " " + p.venue + " " + p.year).toLowerCase().indexOf(s) >= 0);
        });
        if (cnt) cnt.textContent = shown.length + " / " + papers.length;
        if (!shown.length) { list.innerHTML = '<div class="cv-empty">Nothing matches. Try another filter.</div>'; return; }
        var html = "", y = null;
        shown.forEach(function (p) { if (group && p.year !== y) { y = p.year; html += T.yearHead(y); } html += T.paper(p, H); });
        list.innerHTML = html;
      }
      if (controls) {
        el.querySelector(".cv-chips").addEventListener("click", function (e) {
          var b = e.target.closest(".cv-chip"); if (!b) return; topic = b.dataset.t;
          $$(".cv-chip", el).forEach(function (c) { c.classList.toggle("on", c === b); }); draw();
        });
        q.addEventListener("input", draw); aw.addEventListener("change", draw);
      }
      draw();
    },
    honors: function (el) {
      var rank = { win: 0, finalist: 1, other: 2 };
      var hs = CV.honors.slice(); if (opt(el, "order", "kind") === "kind") hs.sort(function (a, b) { return rank[a.kind] - rank[b.kind]; });
      el.innerHTML = hs.map(function (h) { return T.honor(h, H); }).join("");
    },
    employment: function (el) { el.innerHTML = CV.employment.map(function (e) { return T.job(e, H); }).join(""); },
    education: function (el) { el.innerHTML = CV.education.map(function (e) { return T.edu(e, H); }).join(""); },
    service: function (el) {
      var groups = [["admin", "Administrative & leadership"], ["editorial", "Editorial"]], tabs = opt(el, "tabs", "on") !== "off";
      var body = function (g) { return CV.activity.filter(function (a) { return a.group === g; }).map(function (a) { return T.svc(a, H); }).join(""); };
      if (!tabs) {
        el.innerHTML = groups.map(function (g) { return '<div class="cv-svc-group"><h3 class="cv-group-title">' + esc(g[1]) + '</h3><div class="cv-svc">' + body(g[0]) + "</div></div>"; }).join("");
        return;
      }
      el.innerHTML = '<div class="cv-tabs">' + groups.map(function (g, i) { return '<button type="button" class="cv-chip' + (i ? "" : " on") + '" data-g="' + g[0] + '">' + esc(g[1]) + "</button>"; }).join("") +
        '</div><div class="cv-svc"></div>';
      var box = el.querySelector(".cv-svc"); box.innerHTML = body("admin");
      el.querySelector(".cv-tabs").addEventListener("click", function (e) {
        var b = e.target.closest(".cv-chip"); if (!b) return;
        $$(".cv-tabs .cv-chip", el).forEach(function (c) { c.classList.toggle("on", c === b); }); box.innerHTML = body(b.dataset.g);
      });
    },
    reviewers: function (el) { el.innerHTML = CV.reviewers.map(function (r) { return '<span class="cv-pill">' + esc(r) + "</span>"; }).join(""); },
    writing: function (el) {
      var w = CV.other.slice(); if (opt(el, "order", "newest") === "newest") w.reverse();
      el.innerHTML = w.map(function (o) { return T.work(o, H); }).join("");
    },
    disclosure: function (el) { el.textContent = CV.disclosure; },
    progress: function (el) {
      addEventListener("scroll", function () {
        el.style.width = (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100) + "%";
      }, { passive: true });
    }
  };

  /* ---------- generic behaviors ---------- */
  function countUp(el) {
    if (reduce || el.dataset.done) return; el.dataset.done = 1;
    var n = +el.dataset.n, t0 = performance.now();
    (function step(t) { var k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function theme() {
    var root = document.documentElement;
    try { var t = localStorage.getItem("cv-theme"); if (t) root.dataset.theme = t; } catch (e) {}
    $$("[data-cv-theme]").forEach(function (b) {
      b.addEventListener("click", function () {
        var cur = root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
        root.dataset.theme = cur === "light" ? "dark" : "light";
        try { localStorage.setItem("cv-theme", root.dataset.theme); } catch (e) {}
      });
    });
  }

  function run() {
    theme();
    $$("[data-cv]").forEach(function (el) {
      var k = el.getAttribute("data-cv");
      if (R[k]) { try { R[k](el); } catch (e) { errors.push(k + ": " + e.message); } }
      else errors.push("unknown data-cv section: " + k);
    });
    $$("[data-cv-text]").forEach(function (el) { var v = lookup(el.getAttribute("data-cv-text")); if (v != null) el.textContent = v; });
    $$("[data-cv-href]").forEach(function (el) {
      var k = el.getAttribute("data-cv-href"); if (HREF[k]) el.href = HREF[k];
      if (/^(linkedin|github)$/.test(k)) { el.target = "_blank"; el.rel = "noopener"; }
    });
    $$("[data-cv-count]").forEach(function (el) { el.dataset.n = K[el.getAttribute("data-cv-count")]; el.textContent = reduce ? el.dataset.n : 0; });
    var scrolled = function () { document.documentElement.classList.toggle("cv-scrolled", scrollY > 30); };
    addEventListener("scroll", scrolled, { passive: true }); scrolled();
    var targets = $$(".reveal, [data-n]");
    if (reduce || !("IntersectionObserver" in window)) targets.forEach(function (el) { el.classList.add("in"); });
    else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target);
          (e.target.matches("[data-n]") ? [e.target] : $$("[data-n]", e.target)).forEach(countUp);
        });
      }, { threshold: 0.12 });
      targets.forEach(function (el) { io.observe(el); });
    }
    document.dispatchEvent(new CustomEvent("cv:rendered"));
    if (/[?&]verify\b/.test(location.search)) setTimeout(verify, 400);
  }

  /* ---------- self-check used by verify.py (index.html?verify) ---------- */
  function verify() {
    var n = function (s) { return String(s).replace(/\s+/g, " ").toLowerCase(); };
    var txt = n(document.body.innerText);
    var de = document.documentElement;
    var out = {
      missing: CV.papers.concat(CV.other).map(function (p) { return p.title; }).filter(function (t) { return txt.indexOf(n(t).slice(0, 40)) < 0; }),
      disclosure: txt.indexOf(n(CV.disclosure).slice(0, 60)) >= 0,
      linkedin: $$('a[href*="linkedin"]').length,
      overflow: Math.max(de.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
      width: innerWidth,
      emptySections: $$("[data-cv]").filter(function (el) { return el.getAttribute("data-cv") !== "progress" && !el.innerHTML.trim(); }).map(function (el) { return el.getAttribute("data-cv"); }),
      errors: errors
    };
    var pre = document.createElement("script"); pre.type = "application/json"; pre.id = "cv-verify";
    pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
