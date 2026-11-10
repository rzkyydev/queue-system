(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav shadow on scroll ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 8) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  revealEls.forEach(function (el) {
    var delay = el.getAttribute("data-delay");
    if (delay !== null) {
      el.style.setProperty("--d", delay);
    }
  });
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Copy overlay URL ---------- */
  var copyBtn = document.getElementById("copy-url");
  var copyLabel = document.getElementById("copy-label");
  var overlayUrl = "http://127.0.0.1:3333/overlay";

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var done = function () {
        copyLabel.textContent = "Copied";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyLabel.textContent = "Copy URL";
          copyBtn.classList.remove("copied");
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(overlayUrl).then(done, function () {
          fallbackCopy(done);
        });
      } else {
        fallbackCopy(done);
      }
    });
  }

  function fallbackCopy(cb) {
    var ta = document.createElement("textarea");
    ta.value = overlayUrl;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      cb();
    } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- Permission mockup ---------- */
  var seg = document.getElementById("mock-seg");
  var whitelistBlock = document.getElementById("mock-whitelist");
  var feedbackText = document.getElementById("mock-feedback-text");

  if (seg) {
    var feedbacks = {
      everyone: "Anyone can use <code>!skip</code>",
      mod: "Only moderators can use <code>!skip</code>",
      whitelist: "Only whitelisted usernames can use <code>!skip</code>"
    };

    seg.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-mode]");
      if (!btn) return;

      seg.querySelectorAll("button").forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      var mode = btn.dataset.mode;
      var showWhitelist = mode === "whitelist";
      whitelistBlock.classList.toggle("hidden", !showWhitelist);
      if (feedbackText) feedbackText.innerHTML = feedbacks[mode] || "";
    });
  }

  /* ---------- Overlay preview marquee ---------- */
  var marquee = document.getElementById("ov-marquee");
  var title = document.getElementById("ov-title");

  if (marquee && title && !reducedMotion) {
    function updateMarquee() {
      var overflow = title.scrollWidth > marquee.clientWidth;
      marquee.classList.toggle("scrolling", overflow);
      if (overflow && !title.getAttribute("data-cloned")) {
        title.setAttribute("data-cloned", "1");
        var clone = title.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        marquee.appendChild(clone);
      }
    }
    window.addEventListener("load", updateMarquee);
    window.addEventListener("resize", updateMarquee);
    updateMarquee();
  }
})();
