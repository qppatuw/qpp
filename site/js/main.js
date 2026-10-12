(function () {
  "use strict";
  var data = window.QPP;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(paths, cls) {
    return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + paths + "</svg>";
  }
  var ICONS = {
    calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>'
  };

  // Dates are "YYYY-MM-DD" (parsed as local time to avoid timezone shifts).
  // Anything else, like "Coming Soon", is shown as-is.
  function formatDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!m) return { text: str, iso: null };
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return {
      text: d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      iso: str
    };
  }
  function themeFor(id) {
    return { "2": "theme-purple", "3": "theme-blue", "4": "theme-orange" }[id] || "theme-teal";
  }
  function metaList(ev) {
    var d = formatDate(ev.date);
    var time = d.iso ? '<time datetime="' + esc(d.iso) + '">' + esc(d.text) + "</time>" : "<span>" + esc(d.text) + "</span>";
    return (
      '<ul class="event-meta">' +
      "<li>" + icon(ICONS.calendar) + time + "</li>" +
      "<li>" + icon(ICONS.clock) + "<span>" + esc(ev.time) + "</span></li>" +
      "<li>" + icon(ICONS.pin) + "<span>" + esc(ev.location) + "</span></li>" +
      "</ul>"
    );
  }
  function eventCard(ev) {
    var href = "event.html?id=" + encodeURIComponent(ev.id);
    return (
      '<article class="event-card ' + themeFor(ev.id) + '">' +
      '<h3><a href="' + href + '">' + esc(ev.title) + "</a></h3>" +
      '<p class="short">' + esc(ev.shortDescription) + "</p>" +
      metaList(ev) +
      '<a class="card-link" href="' + href + '" aria-label="View details for ' + esc(ev.title) + '">View Details →</a>' +
      "</article>"
    );
  }

  /* ---------- events list (events.html, and home preview) ---------- */
  var list = document.getElementById("events-list");
  if (list) {
    var limit = parseInt(list.getAttribute("data-limit"), 10);
    var items = isNaN(limit) ? data.events : data.events.slice(0, limit);
    list.innerHTML = items.map(eventCard).join("");
  }

  /* ---------- event detail (event.html?id=1) ---------- */
  var root_ = document.getElementById("event-root");
  if (root_) {
    var id = new URLSearchParams(location.search).get("id");
    var ev = data.events.filter(function (e) { return e.id === id; })[0];
    if (!ev) {
      root_.innerHTML =
        '<div class="not-found"><h1>Event Not Found</h1>' +
        "<p>Sorry, we couldn't find the event you're looking for.</p>" +
        '<a href="index.html">' + icon(ICONS.back) + "Back to Home</a></div>";
    } else {
      document.title = ev.title + " – uwq++";
      var d = formatDate(ev.date);
      var when = d.iso ? '<time datetime="' + esc(d.iso) + '">' + esc(d.text) + "</time>" : "<span>" + esc(d.text) + "</span>";
      var row = function (ic, label, inner) {
        return "<div>" + icon(ICONS[ic], "icon-md") + "<div><span class=\"sr-only\">" + label + ":</span>" + inner + "</div></div>";
      };
      var rsvp = ev.rsvpLink
        ? '<section aria-labelledby="rsvp-note"><a class="rsvp-btn" href="' + esc(ev.rsvpLink) + '" target="_blank" rel="noopener noreferrer">' +
          "<span>RSVP Now</span>" + icon(ICONS.external) + '<span class="sr-only">(opens in new tab)</span></a>' +
          '<p class="rsvp-note" id="rsvp-note">Click to RSVP and let us know you\'re coming!</p></section>'
        : "";
      root_.innerHTML =
        '<div class="detail-inner">' +
        '<a class="detail-back" href="events.html">' + icon(ICONS.back) + "Back to Events</a>" +
        "<article>" +
        '<header class="detail-header"><h1>' + esc(ev.title) + "</h1>" +
        '<div class="detail-box">' +
        row("calendar", "Date", when) + row("clock", "Time", "<span>" + esc(ev.time) + "</span>") + row("pin", "Location", "<span>" + esc(ev.location) + "</span>") +
        "</div></header>" +
        '<section class="detail-about" aria-labelledby="description-heading"><h2 id="description-heading">About This Event</h2>' +
        "<p>" + esc(ev.fullDescription) + "</p></section>" +
        rsvp + "</article></div>";
    }
  }

  /* ---------- home hero slideshow ---------- */
  var heroSlides = document.querySelectorAll(".hero-slide");
  if (heroSlides.length) {
    var heroDots = document.querySelectorAll(".hero-dots button");
    var cur = 0;
    var show = function (i) {
      cur = i;
      heroSlides.forEach(function (el, k) { el.classList.toggle("active", k === i); });
      heroDots.forEach(function (el, k) { el.setAttribute("aria-current", k === i ? "true" : "false"); });
    };
    heroDots.forEach(function (el, k) { el.addEventListener("click", function () { show(k); }); });
    if (heroSlides.length > 1) setInterval(function () { show((cur + 1) % heroSlides.length); }, 5000);
  }

  /* ---------- team carousel (replaces react-slick) ---------- */
  var root = document.getElementById("team-slider");
  if (root) initSlider(root, data.galleryImages);

  function initSlider(root, people) {
    var n = people.length;
    var viewport = root.querySelector(".slider-viewport");
    var track = root.querySelector(".slider-track");
    var dotsEl = root.querySelector(".slider-dots");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function slideHtml(p, clone) {
      var photo = p.url
        ? '<img src="' + esc(p.url) + '" alt="' + (clone ? "" : esc(p.alt)) + '" loading="lazy">'
        : "";
      return (
        '<div class="slide"' + (clone ? ' aria-hidden="true"' : "") + ">" +
        '<div class="team-card">' +
        '<div class="team-photo">' + photo + "</div>" +
        '<div class="team-info">' +
        '<p class="team-name">' + esc(p.name) + "</p>" +
        '<p class="team-role">' + esc(p.role) + "</p>" +
        '<p class="team-bio">' + esc(p.bio) + "</p>" +
        "</div></div></div>"
      );
    }
    // three copies so we can loop forever in either direction
    var html = "";
    for (var c = 0; c < 3; c++) {
      for (var i = 0; i < n; i++) html += slideHtml(people[i], c !== 1);
    }
    track.innerHTML = html;
    var slides = track.children;

    dotsEl.innerHTML = people.map(function (p, i) {
      return '<li><button type="button" aria-label="Show ' + esc(p.name) + '" data-i="' + i + '"></button></li>';
    }).join("");
    var dots = dotsEl.querySelectorAll("button");

    var perView = 3, index = n, animating = false, timer = null;

    function calcPerView() {
      var w = window.innerWidth;
      return w <= 640 ? 1 : w <= 1024 ? 2 : 3;
    }
    function layout() {
      perView = calcPerView();
      var w = viewport.clientWidth / perView;
      for (var i = 0; i < slides.length; i++) slides[i].style.width = w + "px";
      move(false);
    }
    function move(animate) {
      track.classList.toggle("animate", !!animate && !reduceMotion);
      track.style.transform = "translateX(" + -index * (viewport.clientWidth / perView) + "px)";
      var active = ((index % n) + n) % n;
      for (var i = 0; i < dots.length; i++) {
        dots[i].setAttribute("aria-current", i === active ? "true" : "false");
      }
    }
    function normalize() {
      // after an animation, silently jump back to the middle copy
      if (index >= 2 * n) index -= n;
      else if (index < n) index += n;
      move(false);
      animating = false;
    }
    function go(target) {
      if (animating) return;
      animating = true;
      index = target;
      move(true);
      if (reduceMotion) normalize();
      else setTimeout(normalize, 520);
    }
    function next() { go(index + 1); }
    function prev() { go(index - 1); }

    root.querySelector(".prev").addEventListener("click", prev);
    root.querySelector(".next").addEventListener("click", next);
    dotsEl.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) go(Math.floor(index / n) * n + +b.getAttribute("data-i"));
    });

    function start() {
      if (reduceMotion || timer) return;
      timer = setInterval(next, 3000);
    }
    function stop() { clearInterval(timer); timer = null; }
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 100);
    });

    layout();
    start();
  }
})();
