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
        "<span>" + row.querySelector(".spec-num").textContent + "</span>" +
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
      // The spatial canvas brings its own focus card
      if (!canHover.matches || list.closest(".spatial.is-canvas")) return;
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

  /* ---------- HUD: sound toggle (placeholder) + cursor readout ---------- */

  var sndButtons = document.querySelectorAll(".snd-toggle");

  function setSound(on) {
    sndButtons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(on));
      btn.querySelector("b").textContent = on ? "ON" : "OFF";
    });
    try {
      localStorage.setItem("snd", on ? "on" : "off");
    } catch (e) {}
  }

  sndButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setSound(btn.getAttribute("aria-pressed") !== "true");
    });
  });

  try {
    if (localStorage.getItem("snd") === "on") setSound(true);
  } catch (e) {}

  var cursorOut = document.querySelector("[data-cursor]");
  var cursorPending = false;
  var cursorXY = [0, 0];

  function pad4(n) {
    var s = String(Math.max(0, Math.round(n)));
    while (s.length < 4) s = "0" + s;
    return s;
  }

  if (cursorOut) {
    window.addEventListener(
      "pointermove",
      function (e) {
        cursorXY = [e.clientX, e.clientY];
        if (cursorPending) return;
        cursorPending = true;
        window.requestAnimationFrame(function () {
          cursorOut.textContent = "X " + pad4(cursorXY[0]) + " · Y " + pad4(cursorXY[1]);
          cursorPending = false;
        });
      },
      { passive: true }
    );
  }

  /* ---------- Spatial canvas: pannable, zoomable views of [data-spatial] lists ---------- */

  var canvasQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function signed(n) {
    var v = Math.round(n);
    return (v < 0 ? "-" : "+") + pad4(Math.abs(v));
  }

  function textOf(node) {
    return node ? node.textContent.trim() : "";
  }

  // Where each item sits on the plane, and what its focus card shows.
  var SPATIAL_KINDS = {
    archive: {
      unit: "nodes",
      zoom: 1.1,
      layout: function (item, i) {
        var img = item.querySelector(".spec-thumb img");
        var portrait = img && +img.getAttribute("height") > +img.getAttribute("width");
        var cols = 4;
        var row = Math.floor(i / cols);
        return {
          x: (i % cols) * 480 + (row % 2 ? 220 : 0),
          y: row * 580 + [0, 150, 40, 190][i % 4],
          w: portrait ? 270 : 370,
          rot: 0
        };
      },
      describe: function (item) {
        var src = item.querySelector(".spec-thumb img");
        var img = el("img", src.className);
        img.src = src.getAttribute("src");
        img.width = +src.getAttribute("width");
        img.height = +src.getAttribute("height");
        img.alt = "";
        var loc = item.querySelector(".spec-loc");
        return {
          id: textOf(item.querySelector(".spec-num")),
          title: textOf(item.querySelector(".spec-name")),
          media: img,
          rows: [
            ["Typology", textOf(item.querySelector(".spec-typ"))],
            ["Location", loc ? loc.firstChild.textContent.trim() : ""],
            ["Coords", textOf(item.querySelector(".spec-coord"))],
            ["Year", textOf(item.querySelector(".spec-year"))]
          ],
          href: item.querySelector("a").getAttribute("href"),
          cta: "[Enter record →]"
        };
      }
    },
    deck: {
      unit: "samples",
      zoom: 1.2,
      layout: function (item, i) {
        var cols = 5;
        var row = Math.floor(i / cols);
        return {
          x: (i % cols) * 290 + (row % 2 ? 145 : 0),
          y: row * 400 + (i % 2) * 30,
          w: 230,
          rot: [-3, 2, -1.5, 3, -2, 1.5][i % 6]
        };
      },
      describe: function (item) {
        var acoustic = item.querySelector(".specimen-acoustic");
        return {
          id: textOf(item.querySelector(".specimen-code")),
          title: textOf(item.querySelector(".specimen-name")),
          media: item.querySelector(".swatch").cloneNode(true),
          rows: [
            ["Finish", textOf(item.querySelector(".specimen-finish"))],
            ["Acoustic", acoustic ? acoustic.cloneNode(true) : ""],
            ["Use", textOf(item.querySelector(".specimen-use"))]
          ]
        };
      }
    }
  };

  function SpatialCanvas(list) {
    var kind = list.getAttribute("data-spatial");
    var spec = SPATIAL_KINDS[kind];
    if (!spec) return;

    var items = Array.prototype.slice.call(list.children);
    var label = list.getAttribute("data-spatial-label") || "Canvas";
    var reduce = reduceMotion.matches;
    var storeKey = "spatial-list-" + kind;

    /* Build the viewport around the existing list (the list itself is moved, not copied) */
    var wrap = el("div", "spatial spatial--" + kind);
    var viewport = el("div", "spatial-viewport");
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "region");
    viewport.setAttribute(
      "aria-label",
      label.replace(/[\[\]\/]/g, "").trim() + ". Drag or use the arrow keys to pan, plus and minus to zoom."
    );
    var grid = el("div", "spatial-grid");
    var stage = el("div", "spatial-stage");
    var world = el("div", "spatial-world");

    var hudTL = el("div", "spatial-hud spatial-hud--tl", label + " — " + items.length + " " + spec.unit);
    var hudTR = el("div", "spatial-hud spatial-hud--tr");
    var hudBL = el("div", "spatial-hud spatial-hud--bl");
    var hudBC = el("div", "spatial-hud spatial-hud--bc", "Drag to explore // Click to focus // Ctrl + scroll to zoom");

    var btnOut = el("button", "spatial-btn spatial-btn--nav", "−");
    var btnIn = el("button", "spatial-btn spatial-btn--nav", "+");
    var btnReset = el("button", "spatial-btn spatial-btn--nav", "[Reset]");
    var btnMode = el("button", "spatial-btn");
    btnOut.setAttribute("aria-label", "Zoom out");
    btnIn.setAttribute("aria-label", "Zoom in");
    [btnOut, btnIn, btnReset, btnMode].forEach(function (b) {
      b.type = "button";
      hudBL.appendChild(b);
    });

    var map = el("div", "spatial-map");
    map.setAttribute("aria-hidden", "true");
    var mapRect = el("b");
    var mapDots = items.map(function () {
      return map.appendChild(el("i"));
    });
    map.appendChild(mapRect);

    var card = el("aside", "spatial-card");
    card.setAttribute("aria-live", "polite");

    list.parentNode.insertBefore(wrap, list);
    world.appendChild(list);
    stage.appendChild(world);
    [grid, stage, hudTL, hudTR, hudBL, hudBC, map, card].forEach(function (n) {
      viewport.appendChild(n);
    });
    wrap.appendChild(viewport);

    var headerRow = wrap.previousElementSibling;
    if (headerRow && !headerRow.matches(".spec-cols, .specimen-cols")) headerRow = null;

    /* State */
    var cam = { x: 0, y: 0, s: 1 };
    var target = null;
    var vel = { x: 0, y: 0 };
    var tilt = { x: 0, y: 0 };
    var view = { w: 1, h: 1 };
    var box = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    var nodes = [];
    var drag = null;
    var suppressClick = false;
    var focused = null;
    var shown = null;
    var raf = 0;
    var active = false;
    var MIN_S = 0.3;
    var MAX_S = 2.2;

    function measureView() {
      view.w = viewport.clientWidth;
      view.h = viewport.clientHeight;
    }

    function layout() {
      items.forEach(function (item, i) {
        var p = spec.layout(item, i);
        item.style.setProperty("--x", p.x + "px");
        item.style.setProperty("--y", p.y + "px");
        item.style.setProperty("--w", p.w + "px");
        item.style.setProperty("--rot", p.rot + "deg");
      });
      // Heights depend on the images' aspect ratios, so measure after placing
      box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      nodes = items.map(function (item) {
        var n = {
          x: item.offsetLeft,
          y: item.offsetTop,
          w: item.offsetWidth,
          h: item.offsetHeight
        };
        box.minX = Math.min(box.minX, n.x);
        box.minY = Math.min(box.minY, n.y - 30);
        box.maxX = Math.max(box.maxX, n.x + n.w);
        box.maxY = Math.max(box.maxY, n.y + n.h);
        return n;
      });
      list.style.setProperty("--world-w", box.maxX + "px");
      list.style.setProperty("--world-h", box.maxY + "px");
      buildMap();
    }

    function fitCamera(extraZoom) {
      var bw = box.maxX - box.minX;
      var bh = box.maxY - box.minY;
      var s = Math.min((view.w - 120) / bw, (view.h - 150) / bh) * (extraZoom || 1);
      s = clamp(s, MIN_S, 1);
      return {
        x: view.w / 2 - (box.minX + bw / 2) * s,
        y: view.h / 2 - (box.minY + bh / 2) * s + 10,
        s: s
      };
    }

    // Opening view: the archive starts a little closer than "fit all" to invite dragging
    function homeCamera() {
      return fitCamera(kind === "archive" ? 1.3 : 1);
    }

    function clampCam(c) {
      var pad = 160;
      var cx = clamp((view.w / 2 - c.x) / c.s, box.minX - pad, box.maxX + pad);
      var cy = clamp((view.h / 2 - c.y) / c.s, box.minY - pad, box.maxY + pad);
      c.x = view.w / 2 - cx * c.s;
      c.y = view.h / 2 - cy * c.s;
      return c;
    }

    /* Minimap */
    var mapScale = 1;

    function buildMap() {
      var bw = box.maxX - box.minX;
      var bh = box.maxY - box.minY;
      mapScale = 150 / bw;
      map.style.height = Math.round(bh * mapScale) + "px";
      nodes.forEach(function (n, i) {
        mapDots[i].style.left = (n.x + n.w / 2 - box.minX) * mapScale + "px";
        mapDots[i].style.top = (n.y + n.h / 2 - box.minY) * mapScale + "px";
      });
    }

    /* Render the camera */
    function apply() {
      world.style.transform =
        "translate3d(" + cam.x.toFixed(2) + "px," + cam.y.toFixed(2) + "px,0) scale(" + cam.s.toFixed(4) + ")";
      stage.style.transform = reduce
        ? ""
        : "rotateX(" + (-tilt.y).toFixed(2) + "deg) rotateY(" + tilt.x.toFixed(2) + "deg)";
      grid.style.setProperty("--grid-size", (120 * cam.s).toFixed(2) + "px");
      grid.style.setProperty("--grid-x", cam.x.toFixed(2) + "px");
      grid.style.setProperty("--grid-y", cam.y.toFixed(2) + "px");

      var wx = (view.w / 2 - cam.x) / cam.s;
      var wy = (view.h / 2 - cam.y) / cam.s;
      hudTR.innerHTML =
        "X <b>" + signed(wx) + "</b> · Y <b>" + signed(wy) + "</b> · Z <b>" + cam.s.toFixed(2) + "</b>";

      mapRect.style.left = (-cam.x / cam.s - box.minX) * mapScale + "px";
      mapRect.style.top = (-cam.y / cam.s - box.minY) * mapScale + "px";
      mapRect.style.width = (view.w / cam.s) * mapScale + "px";
      mapRect.style.height = (view.h / cam.s) * mapScale + "px";
    }

    function tick() {
      raf = 0;
      if (!active) return;
      var moving = false;
      var dragging = drag && drag.moved;

      if (!dragging) {
        if (target) {
          var k = reduce ? 1 : 0.13;
          cam.x += (target.x - cam.x) * k;
          cam.y += (target.y - cam.y) * k;
          cam.s += (target.s - cam.s) * k;
          if (Math.abs(target.x - cam.x) < 0.3 && Math.abs(target.y - cam.y) < 0.3 && Math.abs(target.s - cam.s) < 0.001) {
            cam.x = target.x;
            cam.y = target.y;
            cam.s = target.s;
            target = null;
          } else {
            moving = true;
          }
        } else if (Math.abs(vel.x) + Math.abs(vel.y) > 0.1) {
          // Inertia after a drag
          cam.x += vel.x;
          cam.y += vel.y;
          vel.x *= 0.92;
          vel.y *= 0.92;
          clampCam(cam);
          moving = true;
        }
      }

      if (!reduce) {
        var tx = dragging ? clamp(vel.x * 0.35, -7, 7) : 0;
        var ty = dragging ? clamp(vel.y * 0.35, -7, 7) : 0;
        tilt.x += (tx - tilt.x) * 0.12;
        tilt.y += (ty - tilt.y) * 0.12;
        if (Math.abs(tilt.x) + Math.abs(tilt.y) > 0.02) moving = true;
      }

      apply();
      if (moving || dragging) kick();
    }

    function kick() {
      if (!raf) raf = window.requestAnimationFrame(tick);
    }

    function flyTo(c) {
      target = clampCam({ x: c.x, y: c.y, s: clamp(c.s, MIN_S, MAX_S) });
      vel.x = vel.y = 0;
      kick();
    }

    function zoomAt(px, py, factor) {
      var base = target || cam;
      var s = clamp(base.s * factor, MIN_S, MAX_S);
      var wx = (px - base.x) / base.s;
      var wy = (py - base.y) / base.s;
      flyTo({ x: px - wx * s, y: py - wy * s, s: s });
    }

    /* Focus card */
    function renderCard(item) {
      var d = spec.describe(item);
      card.textContent = "";

      var head = el("div", "spatial-card-head");
      head.appendChild(el("span", "", d.id + " // " + d.title.toUpperCase()));
      var close = el("button", "", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Close");
      close.addEventListener("click", function () {
        unfocus();
      });
      head.appendChild(close);

      var media = el("div", "spatial-card-media");
      media.appendChild(d.media);

      var body = el("div", "spatial-card-body");
      body.appendChild(el("h3", "spatial-card-title", d.title));
      var dl = el("dl", "spatial-card-meta");
      d.rows.forEach(function (r) {
        if (!r[1]) return;
        dl.appendChild(el("dt", "", r[0]));
        var dd = el("dd");
        if (typeof r[1] === "string") dd.textContent = r[1];
        else dd.appendChild(r[1]);
        dl.appendChild(dd);
      });
      body.appendChild(dl);
      if (d.href) {
        var cta = el("a", "spatial-card-cta", d.cta);
        cta.href = d.href;
        body.appendChild(cta);
      }

      card.appendChild(head);
      card.appendChild(media);
      card.appendChild(body);
    }

    function showCard(item) {
      if (shown === item) return;
      var swap = !!shown;
      shown = item;
      renderCard(item);
      card.classList.add("is-open");
      if (swap && !reduce) {
        card.classList.remove("is-swapping");
        void card.offsetWidth;
        card.classList.add("is-swapping");
      }
    }

    function hideCard() {
      shown = null;
      card.classList.remove("is-open", "is-swapping");
    }

    function focusItem(item) {
      var i = items.indexOf(item);
      if (i < 0) return;
      focused = item;
      items.forEach(function (it, j) {
        it.classList.toggle("is-focused", j === i);
        mapDots[j].classList.toggle("is-focused", j === i);
      });
      wrap.classList.add("has-focus");
      showCard(item);

      // Centre the node in the space left of the card
      var n = nodes[i];
      var s = spec.zoom;
      var cardSpace = view.w > 760 ? card.offsetWidth + 32 : 0;
      var sx = (view.w - cardSpace) / 2;
      var sy = view.h / 2 + 10;
      flyTo({ x: sx - (n.x + n.w / 2) * s, y: sy - (n.y + n.h / 2) * s, s: s });
    }

    function unfocus() {
      focused = null;
      items.forEach(function (it, j) {
        it.classList.remove("is-focused");
        mapDots[j].classList.remove("is-focused");
      });
      wrap.classList.remove("has-focus");
      hideCard();
    }

    /* Pointer: drag to pan (with a small threshold so clicks still work) */
    viewport.addEventListener("pointerdown", function (e) {
      if (!active || e.button !== 0) return;
      if (e.target.closest(".spatial-card, .spatial-hud, .spatial-map")) return;
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      target = null;
      vel.x = vel.y = 0;
    });

    viewport.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.lx;
      var dy = e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 5) return;
        drag.moved = true;
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch (err) {} // pointer already gone; the drag still works without capture
        viewport.classList.add("is-dragging");
      }
      cam.x += dx;
      cam.y += dy;
      clampCam(cam);
      vel.x = vel.x * 0.4 + (reduce ? 0 : dx) * 0.6;
      vel.y = vel.y * 0.4 + (reduce ? 0 : dy) * 0.6;
      kick();
    });

    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (drag.moved) {
        suppressClick = true;
        setTimeout(function () {
          suppressClick = false;
        }, 0);
      }
      drag = null;
      viewport.classList.remove("is-dragging");
      kick();
    }

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    // Links and images would otherwise start a native drag and steal the pan
    viewport.addEventListener("dragstart", function (e) {
      if (active) e.preventDefault();
    });

    /* Click: first click focuses a node, a second click opens it */
    viewport.addEventListener("click", function (e) {
      if (!active) return;
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.target.closest(".spatial-card, .spatial-hud, .spatial-map")) return;
      var item = items.filter(function (it) {
        return it.contains(e.target);
      })[0];
      if (!item) return;
      var link = e.target.closest("a");
      // Keyboard activation (detail 0) follows the link straight away
      if (link && e.detail === 0) return;
      if (item !== focused) {
        e.preventDefault();
        focusItem(item);
      } else if (!link) {
        unfocus();
      }
    });

    /* Hover previews the card; leaving returns to the focused node */
    items.forEach(function (item) {
      item.addEventListener("pointerenter", function () {
        if (!active || (drag && drag.moved)) return;
        showCard(item);
      });
      item.addEventListener("pointerleave", function () {
        if (!active || (drag && drag.moved)) return;
        if (focused) showCard(focused);
        else hideCard();
      });
    });

    /* Keyboard: tabbing onto a node flies to it; arrows pan; +/- zoom */
    viewport.addEventListener("focusin", function (e) {
      if (!active || drag) return;
      var item = items.filter(function (it) {
        return it === e.target || it.contains(e.target);
      })[0];
      if (item && e.target.matches(":focus-visible") && item !== focused) focusItem(item);
    });

    viewport.addEventListener("keydown", function (e) {
      if (!active) return;
      var step = 90;
      var base = target || cam;
      var handled = true;
      switch (e.key) {
        case "ArrowLeft": flyTo({ x: base.x + step, y: base.y, s: base.s }); break;
        case "ArrowRight": flyTo({ x: base.x - step, y: base.y, s: base.s }); break;
        case "ArrowUp": flyTo({ x: base.x, y: base.y + step, s: base.s }); break;
        case "ArrowDown": flyTo({ x: base.x, y: base.y - step, s: base.s }); break;
        case "+":
        case "=": zoomAt(view.w / 2, view.h / 2, 1.2); break;
        case "-":
        case "_": zoomAt(view.w / 2, view.h / 2, 1 / 1.2); break;
        case "0": unfocus(); flyTo(homeCamera()); break;
        case "Escape": if (focused) unfocus(); else handled = false; break;
        case "Enter":
        case " ":
          // Specimen cards are not links: Enter / Space toggles focus
          var item = e.target.closest && e.target.closest(".specimen");
          if (item && items.indexOf(item) > -1) {
            if (item === focused) unfocus();
            else focusItem(item);
          } else handled = false;
          break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });

    // Focus can make the browser scroll an overflow:hidden box; undo that
    viewport.addEventListener("scroll", function () {
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
    });

    /* Wheel: Ctrl/⌘ + scroll (and trackpad pinch) zooms, sideways scroll pans.
       Plain vertical scrolling is left alone so the page still scrolls. */
    viewport.addEventListener(
      "wheel",
      function (e) {
        if (!active) return;
        var rect = viewport.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0025));
        } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
          target = null;
          cam.x -= e.deltaX;
          clampCam(cam);
          kick();
        }
      },
      { passive: false }
    );

    /* HUD buttons + minimap */
    btnIn.addEventListener("click", function () {
      zoomAt(view.w / 2, view.h / 2, 1.25);
    });
    btnOut.addEventListener("click", function () {
      zoomAt(view.w / 2, view.h / 2, 1 / 1.25);
    });
    btnReset.addEventListener("click", function () {
      unfocus();
      flyTo(homeCamera());
    });
    btnMode.addEventListener("click", function () {
      var toList = wrap.classList.contains("is-canvas");
      try {
        if (toList) sessionStorage.setItem(storeKey, "1");
        else sessionStorage.removeItem(storeKey);
      } catch (e) {}
      setMode(!toList);
    });

    map.addEventListener("click", function (e) {
      var rect = map.getBoundingClientRect();
      var wx = box.minX + (e.clientX - rect.left) / mapScale;
      var wy = box.minY + (e.clientY - rect.top) / mapScale;
      var s = (target || cam).s;
      flyTo({ x: view.w / 2 - wx * s, y: view.h / 2 - wy * s, s: s });
    });

    window.addEventListener("resize", function () {
      if (!active) return;
      measureView();
      clampCam(cam);
      apply();
    });

    /* Switch between canvas and plain list */
    function setMode(canvas) {
      active = canvas;
      wrap.classList.toggle("is-canvas", canvas);
      wrap.classList.toggle("is-list", !canvas);
      if (headerRow) headerRow.classList.toggle("is-hidden", canvas);
      btnMode.textContent = canvas ? "[≡ List view]" : "[⌗ Canvas view]";
      if (kind === "deck") {
        items.forEach(function (it) {
          if (canvas) {
            it.tabIndex = 0;
            it.setAttribute("aria-label", textOf(it.querySelector(".specimen-name")) + ", show specimen details");
          } else {
            it.removeAttribute("tabindex");
            it.removeAttribute("aria-label");
          }
        });
      }
      if (canvas) {
        // Nodes enter the plane already revealed
        items.forEach(function (it) {
          it.classList.add("is-visible");
        });
        measureView();
        layout();
        var start = homeCamera();
        cam.x = start.x;
        cam.y = start.y;
        cam.s = start.s;
        clampCam(cam);
        apply();
      } else {
        unfocus();
        world.style.transform = "";
        stage.style.transform = "";
      }
    }

    function sync() {
      var available = canvasQuery.matches;
      wrap.classList.toggle("no-canvas", !available);
      var preferList = false;
      try {
        preferList = sessionStorage.getItem(storeKey) === "1";
      } catch (e) {}
      setMode(available && !preferList);
    }

    canvasQuery.addEventListener("change", sync);
    sync();

    // Images may still be loading when we first measure; re-measure once they land
    Array.prototype.forEach.call(list.querySelectorAll("img"), function (img) {
      if (!img.complete) {
        img.addEventListener("load", function () {
          if (active) {
            layout();
            apply();
          }
        }, { once: true });
      }
    });
  }

  document.querySelectorAll("[data-spatial]").forEach(function (list) {
    SpatialCanvas(list);
  });

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
