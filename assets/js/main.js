(function () {
  var root = document.documentElement;
  var STORAGE_KEY = "theme";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Theme (dark sheet by default) ---------- */

  function currentTheme() {
    return root.getAttribute("data-theme") || "dark";
  }

  function updateToggleLabel() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-label", "Switch to " + next + " mode");
    });
  }

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var theme = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {}
      updateToggleLabel();
    });
  });

  updateToggleLabel();

  /* ---------- Mobile menu ---------- */

  var menuBtn = document.querySelector(".menu-toggle");
  var navLinks = document.querySelector(".nav-links");

  function setMenu(open) {
    if (!menuBtn || !navLinks) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navLinks.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });

    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });

    window.matchMedia("(min-width: 801px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Header state + elevation readout ---------- */

  var header = document.querySelector(".site-header");
  var elevation = document.querySelector("[data-elevation]");
  var lastY = window.scrollY;
  var ticking = false;

  function formatElevation(y) {
    // 100px of scroll reads as one metre of elevation
    var m = (y / 100).toFixed(2);
    while (m.length < 6) m = "0" + m;
    return "+" + m;
  }

  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
      if (!document.body.classList.contains("menu-open")) {
        header.classList.toggle("is-hidden", y > lastY && y > 400);
      }
    }
    if (elevation) elevation.textContent = formatElevation(y);
    lastY = y;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- Active section: nav link + sheet name ---------- */

  var sectionLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );
  var sheetLabel = document.querySelector("[data-sheet]:not(section)");
  var sheets = document.querySelectorAll("section[data-sheet]");

  if ("IntersectionObserver" in window && sheets.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          sectionLinks.forEach(function (a) {
            if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
          if (sheetLabel) sheetLabel.textContent = entry.target.getAttribute("data-sheet");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sheets.forEach(function (el) {
      sectionObserver.observe(el);
    });
  }

  /* ---------- Reveal on scroll ---------- */

  var reveals = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    reveals.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Specimen index: floating preview ---------- */

  var list = document.querySelector(".spec-list");
  var preview = document.querySelector(".preview");
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 800px)");

  if (list && preview) {
    var inner = preview.querySelector(".preview-inner");
    var rows = Array.prototype.slice.call(list.querySelectorAll(".spec-row"));
    var figures = [];

    // One figure per row, built from the row's own image so the render
    // tool only ever has to update a single <img> per project.
    rows.forEach(function (row, i) {
      var src = row.querySelector(".spec-thumb img");
      var fig = document.createElement("figure");
      var img = document.createElement("img");
      img.src = src.getAttribute("src");
      img.width = src.width || src.getAttribute("width");
      img.height = src.height || src.getAttribute("height");
      img.className = src.className;
      img.alt = "";
      img.decoding = "async";
      var cap = document.createElement("figcaption");
      cap.innerHTML =
        "<span>PL. " + row.querySelector(".spec-num").textContent + "</span>" +
        "<span>" + row.querySelector(".spec-coord").textContent + "</span>";
      fig.appendChild(cap);
      fig.appendChild(img);
      inner.appendChild(fig);
      figures.push(fig);
    });

    var mouse = { x: 0, y: 0 };
    var pos = { x: 0, y: 0, r: 0 };
    var current = -1;
    var running = false;
    var stopTimer = null;

    function target() {
      var w = preview.offsetWidth;
      var fig = figures[current] || figures[0];
      var h = fig ? fig.offsetHeight : w;
      var gap = 36;
      var x = mouse.x + gap;
      if (x + w > window.innerWidth - 32) x = mouse.x - w - gap;
      var y = mouse.y - h / 2;
      y = Math.max(72, Math.min(y, window.innerHeight - h - 32));
      return { x: x, y: y };
    }

    function frame() {
      if (!running) return;
      var t = target();
      var ease = reduceMotion.matches ? 1 : 0.16;
      var dx = t.x - pos.x;
      pos.x += dx * ease;
      pos.y += (t.y - pos.y) * ease;
      // Lean slightly into the direction of travel
      var r = reduceMotion.matches ? 0 : Math.max(-5, Math.min(5, dx * 0.03));
      pos.r += (r - pos.r) * 0.12;
      preview.style.transform =
        "translate3d(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px,0) rotate(" + pos.r.toFixed(2) + "deg)";
      window.requestAnimationFrame(frame);
    }

    function show(i) {
      if (!canHover.matches) return;
      clearTimeout(stopTimer);
      if (!running) {
        var t = target();
        pos.x = t.x;
        pos.y = t.y;
        running = true;
        window.requestAnimationFrame(frame);
      }
      figures.forEach(function (f, j) {
        f.classList.toggle("is-current", j === i);
      });
      current = i;
      preview.classList.add("is-active");
    }

    function hide() {
      preview.classList.remove("is-active");
      stopTimer = setTimeout(function () {
        running = false;
        current = -1;
        figures.forEach(function (f) {
          f.classList.remove("is-current");
        });
      }, 450);
    }

    list.addEventListener("pointermove", function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    rows.forEach(function (row, i) {
      row.addEventListener("pointerenter", function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        show(i);
      });
    });

    list.addEventListener("pointerleave", hide);
  }

  /* ---------- Material ticker: duplicate the track for a seamless loop ---------- */

  var ticker = document.querySelector(".ticker");
  if (ticker) {
    var track = ticker.querySelector(".ticker-track");
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    ticker.appendChild(clone);
    ticker.classList.add("is-ready");
  }

  /* ---------- Footer year ---------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
