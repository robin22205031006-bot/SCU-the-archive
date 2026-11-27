/* Codex Atlas: the Codex's own map, redrawn from the Nexus atlas data the app supplies
 * (places, eras, landmarks with image-% positions, routes, weather tags, transitions).
 * Views: World (pins + light routes), Scenic (era art, weather, transitions), Top (clean
 * top-down) and Plan (Codex-only architectural blueprint: orthographic 2D, grid refs,
 * plan symbols, dimension lines in grid units, title block). Pinch/drag/wheel/double-tap
 * zoom with springs; weather canvas pauses off-screen and for motion-off/reduced motion. */
(function codexAtlas() {
  "use strict";
  var H = window.__codexHost || null;
  var API = window.__codexApi || null;
  var Spring = window.__codexSpring;
  var feed = function () {
    return window.__codexFeed || null;
  };
  if (!window.__codexLocalMap || !Spring) return;
  var A = feed() && feed().atlas;
  if (!A || !A.locations || !A.locations.length) return;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  function reduced() {
    try {
      if (document.documentElement.dataset.motion === "off") return true;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  /* ---------- state ---------- */
  var KEY = "cx-atlas";
  var st = { mode: "world", loc: A.locations[0].id, era: 0, sel: null };
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved && saved.mode) st = Object.assign(st, saved, { sel: null });
  } catch (e) {}
  var save = function () {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ mode: st.mode, loc: st.loc, era: st.era }));
    } catch (e) {}
  };
  var loc = function () {
    return (
      A.locations.find(function (l) {
        return l.id === st.loc;
      }) || A.locations[0]
    );
  };
  var era = function () {
    var L = loc();
    if (st.era >= L.eras.length) st.era = L.eras.length - 1;
    return L.eras[Math.max(0, st.era)];
  };

  /** What the current view shows: image, size, landmarks, routes and weather. */
  function scene() {
    var L = loc();
    if (st.mode === "world") {
      return {
        image: A.world.image,
        w: A.world.width,
        h: A.world.height,
        marks: A.locations.map(function (l) {
          return { id: l.id, name: l.name, x: l.worldX, y: l.worldY, note: l.epithet, place: true };
        }),
        routes: A.routes.map(function (r) {
          return [r.from, r.to, r.label];
        }),
        fx: ["mist"],
      };
    }
    if (st.mode === "scenic") {
      var E = era();
      return { image: E.image, w: E.width, h: E.height, marks: E.landmarks || [], routes: E.routes || [], fx: E.fx || [] };
    }
    var topMarks = (L.top && L.top.landmarks) || [];
    var aligned = topMarks.length > 0;
    return {
      image: L.top.image,
      w: L.top.width,
      h: L.top.height,
      marks: aligned ? topMarks : st.mode === "plan" ? era().landmarks || [] : [],
      routes: aligned ? L.top.routes || [] : st.mode === "plan" ? era().routes || [] : [],
      fx: [],
      aligned: aligned,
    };
  }

  /* ---------- markup ---------- */
  var MODES = [
    ["world", "World"],
    ["scenic", "Scenic"],
    ["top", "Top"],
    ["plan", "Plan"],
  ];
  function atlasHTML() {
    var L = loc();
    var title = st.mode === "world" ? "The Atlas" : L.name;
    var sub =
      st.mode === "world"
        ? "Eight realms of the Sentinels universe. Tap a realm to travel there."
        : st.mode === "plan"
          ? "Architectural plan · orthographic top view · 2D"
          : L.epithet;
    var modes = MODES.map(function (m) {
      return (
        '<button type="button" data-camode="' + m[0] + '" class="' + (st.mode === m[0] ? "on" : "") +
        '" aria-pressed="' + (st.mode === m[0]) + '">' + m[1] + "</button>"
      );
    }).join("");
    var places = A.locations.map(function (l) {
      return (
        '<button type="button" class="ca-place' + (l.id === st.loc && st.mode !== "world" ? " on" : "") +
        '" data-caloc="' + esc(l.id) + '"><b>' + esc(l.name) + "</b><small>" + esc(l.epithet) + "</small></button>"
      );
    }).join("");
    var eras =
      st.mode === "scenic"
        ? '<div class="ca-eras" role="tablist" aria-label="Eras">' +
          L.eras.map(function (e, i) {
            return (
              '<button type="button" role="tab" data-caera="' + i + '" aria-selected="' + (i === st.era) + '">' + esc(e.label) + "</button>"
            );
          }).join("") +
          '</div><p class="ca-sum" id="caSum">' + esc(era().summary) + "</p>"
        : "";
    return (
      '<div class="xpage ca" data-mode="' + st.mode + '">' +
      '<header class="ca-head"><div class="ca-title"><small>' + (st.mode === "plan" ? "SHEET CX-0" + (A.locations.indexOf(L) + 1) : "ATLAS OF THE SCU") +
      "</small><h2>" + esc(title) + "</h2><p>" + esc(sub) + '</p></div><div class="xseg ca-modes" role="group" aria-label="Map view">' + modes + "</div></header>" +
      '<div class="ca-stage" id="caStage" data-mode="' + st.mode + '" tabindex="0" aria-label="' + esc(title) + ' map. Drag to pan, pinch or scroll to zoom.">' +
      '<div class="ca-back" aria-hidden="true"><img id="caBlur" alt="" src="' + esc(scene().image) + '"></div>' +
      '<div class="ca-canvas" id="caCanvas">' +
      '<img class="ca-img" id="caImgA" alt="" draggable="false" src="' + esc(scene().image) + '">' +
      '<img class="ca-img ca-next" id="caImgB" alt="" draggable="false">' +
      '<svg class="ca-plan" id="caPlan" aria-hidden="true"></svg>' +
      '<svg class="ca-routes" id="caRoutes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>' +
      '<div class="ca-marks" id="caMarks"></div>' +
      "</div>" +
      '<canvas class="ca-fx atlas-keep" id="caFx" aria-hidden="true"></canvas>' +
      '<div class="ca-light" aria-hidden="true"></div><div class="ca-clouds" aria-hidden="true"><i></i><i></i><i></i></div><div class="ca-vig" aria-hidden="true"></div>' +
      '<div class="ca-flash" id="caFlash" aria-hidden="true"></div>' +
      '<div class="ca-ctl"><button type="button" data-cazoom="1" aria-label="Zoom in">+</button><button type="button" data-cazoom="-1" aria-label="Zoom out">−</button><button type="button" data-cazoom="0" aria-label="Reset view">⟲</button></div>' +
      (st.mode === "world" ? "" : '<button type="button" class="ca-up" data-camode="world" aria-label="Back to the world map">‹ World</button>') +
      '<div class="ca-rose" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><path d="M20 4 L24 20 L20 17 L16 20Z"/><path class="s" d="M20 36 L24 20 L20 23 L16 20Z"/><text x="20" y="3">N</text></svg></div>' +
      "</div>" +
      eras +
      '<div class="ca-places" role="group" aria-label="Realms">' + places + "</div>" +
      '<section class="ca-detail" id="caDetail" aria-live="polite"></section>' +
      "</div>"
    );
  }

  /* ---------- view transform (pan/zoom with springs) ---------- */
  var V = null;
  function setupView() {
    var stage = $("caStage");
    var canvas = $("caCanvas");
    if (!stage || !canvas) return;
    var sc = scene();
    var r = stage.getBoundingClientRect();
    var W = r.width, Hh = r.height;
    var k = Math.min(W / sc.w, Hh / sc.h);
    var w = Math.max(1, Math.round(sc.w * k)), h = Math.max(1, Math.round(sc.h * k));
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    var v = { W: W, H: Hh, w: w, h: h, z: 1, tx: 0, ty: 0 };
    var apply = function () {
      var x0 = (v.W - v.z * v.w) / 2 + v.tx;
      var y0 = (v.H - v.z * v.h) / 2 + v.ty;
      canvas.style.transform = "translate(" + x0.toFixed(2) + "px," + y0.toFixed(2) + "px) scale(" + v.z.toFixed(4) + ")";
      canvas.style.setProperty("--iz", (1 / v.z).toFixed(4));
      stage.classList.toggle("ca-zoomed", v.z > 1.6);
    };
    v.sz = new Spring(1, function (x) { v.z = x; apply(); }, { k: 220, c: 26 });
    v.sx = new Spring(0, function (x) { v.tx = x; apply(); }, { k: 220, c: 26 });
    v.sy = new Spring(0, function (x) { v.ty = x; apply(); }, { k: 220, c: 26 });
    v.clamp = function (z, tx, ty) {
      var m = 48;
      var ex = Math.max(0, (z * v.w - v.W) / 2) + m;
      var ey = Math.max(0, (z * v.h - v.H) / 2) + m;
      return [Math.max(-ex, Math.min(ex, tx)), Math.max(-ey, Math.min(ey, ty))];
    };
    v.set = function (z, tx, ty, animate) {
      z = Math.max(1, Math.min(5, z));
      var c = v.clamp(z, tx, ty);
      if (!animate || reduced()) {
        [[v.sz, z], [v.sx, c[0]], [v.sy, c[1]]].forEach(function (p) {
          p[0].x = p[1]; p[0].t = p[1]; p[0].v = 0; p[0].cb(p[1]);
        });
        return;
      }
      v.sz.to(z); v.sx.to(c[0]); v.sy.to(c[1]);
    };
    /** zoom to z' keeping stage point (px,py) fixed */
    v.zoomAt = function (nz, px, py, animate) {
      nz = Math.max(1, Math.min(5, nz));
      var x0 = (v.W - v.z * v.w) / 2 + v.tx, y0 = (v.H - v.z * v.h) / 2 + v.ty;
      var u = (px - x0) / v.z, q = (py - y0) / v.z;
      var nx0 = px - u * nz, ny0 = py - q * nz;
      v.set(nz, nx0 - (v.W - nz * v.w) / 2, ny0 - (v.H - nz * v.h) / 2, animate);
    };
    /** centre a point given in % of the map */
    v.focus = function (xp, yp, z) {
      var nz = z || Math.max(2.2, v.z);
      var px = (xp / 100) * v.w, py = (yp / 100) * v.h;
      v.set(nz, (v.w / 2 - px) * nz, (v.h / 2 - py) * nz, true);
    };
    apply();
    V = v;
    bindGestures(stage);
  }

  function bindGestures(stage) {
    if (stage.dataset.caBound === "1") return;
    stage.dataset.caBound = "1";
    var pts = new Map();
    var start = null;
    var moved = false;
    var lastTap = 0;
    var rel = function (e) {
      var r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".ca-ctl,.ca-up")) return;
      pts.set(e.pointerId, rel(e));
      moved = false;
      if (pts.size === 1) start = { p: rel(e), tx: V.tx, ty: V.ty, z: V.z };
      if (pts.size === 2) {
        var a = Array.from(pts.values());
        start = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: V.z, mid: { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 } };
      }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!pts.has(e.pointerId) || !V || !start) return;
      pts.set(e.pointerId, rel(e));
      if (pts.size === 1 && start.p) {
        var p = rel(e);
        var dx = p.x - start.p.x, dy = p.y - start.p.y;
        if (Math.hypot(dx, dy) > 6) moved = true;
        if (moved) {
          stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
          V.set(V.z, start.tx + dx, start.ty + dy, false);
        }
      } else if (pts.size === 2 && start.d) {
        var a = Array.from(pts.values());
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        moved = true;
        V.zoomAt(start.z * (d / start.d), start.mid.x, start.mid.y, false);
      }
    });
    var end = function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size === 1) {
        var only = Array.from(pts.values())[0];
        start = { p: only, tx: V.tx, ty: V.ty, z: V.z };
      } else if (!pts.size) start = null;
      if (!moved && e.type === "pointerup") {
        var now = Date.now();
        if (now - lastTap < 300 && !e.target.closest(".ca-mk")) {
          var p = rel(e);
          if (V.z > 2.6) V.set(1, 0, 0, true);
          else V.zoomAt(V.z * 2, p.x, p.y, true);
        }
        lastTap = now;
      }
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    stage.addEventListener(
      "wheel",
      function (e) {
        if (!V) return;
        e.preventDefault();
        var p = rel(e);
        V.zoomAt(V.z * Math.exp(-e.deltaY * 0.0015), p.x, p.y, false);
      },
      { passive: false },
    );
    stage.addEventListener(
      "click",
      function (e) {
        if (moved) {
          e.stopPropagation();
          e.preventDefault();
          moved = false;
        }
      },
      true,
    );
    stage.addEventListener("keydown", function (e) {
      if (!V) return;
      var step = 60;
      if (e.key === "+" || e.key === "=") V.zoomAt(V.z * 1.4, V.W / 2, V.H / 2, true);
      else if (e.key === "-") V.zoomAt(V.z / 1.4, V.W / 2, V.H / 2, true);
      else if (e.key === "ArrowLeft") V.set(V.z, V.tx + step, V.ty, true);
      else if (e.key === "ArrowRight") V.set(V.z, V.tx - step, V.ty, true);
      else if (e.key === "ArrowUp") V.set(V.z, V.tx, V.ty + step, true);
      else if (e.key === "ArrowDown") V.set(V.z, V.tx, V.ty - step, true);
      else if (e.key === "0") V.set(1, 0, 0, true);
      else return;
      e.preventDefault();
    });
  }

  /* ---------- layers: markers, routes, plan ---------- */
  var PLAN_SYMBOL = [
    [/palace|tower|temple|hall|fort|castle|gate|wall|house|church|mosque|keep|citadel|market|library|academy|school|arena|shrine|bridge|bazaar|cathedral|monastery|ruin|city|village|town|quarter|district/i, "struct"],
    [/lake|falls|river|sea|spring|pool|harbou?r|port|bay|well|aqueduct|lagoon|canal|water|sunken/i, "water"],
    [/mountain|peak|cliff|hill|ridge|volcano|chasm|pass|caves?|crater|glacier/i, "rise"],
  ];
  var symFor = function (name) {
    for (var i = 0; i < PLAN_SYMBOL.length; i++) if (PLAN_SYMBOL[i][0].test(name)) return PLAN_SYMBOL[i][1];
    return "point";
  };
  function markById(sc, id) {
    return sc.marks.find(function (m) {
      return m.id === id;
    });
  }
  function curve(a, b, bend) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.hypot(dx, dy) || 1;
    var cx = mx - (dy / len) * len * bend, cy = my + (dx / len) * len * bend;
    return "M" + a.x.toFixed(2) + " " + a.y.toFixed(2) + " Q" + cx.toFixed(2) + " " + cy.toFixed(2) + " " + b.x.toFixed(2) + " " + b.y.toFixed(2);
  }
  function paintMarks(sc) {
    var box = $("caMarks");
    if (!box) return;
    box.innerHTML = sc.marks
      .map(function (m, i) {
        return (
          '<button type="button" class="ca-mk' + (m.place ? " place" : "") + (st.sel === m.id ? " on" : "") +
          '" data-camk="' + esc(m.id) + '" style="left:' + m.x + "%;top:" + m.y + "%;--i:" + i + '" aria-label="' + esc(m.name) + '">' +
          '<span class="ca-pin" aria-hidden="true"><i></i></span><span class="ca-lbl">' + (st.mode === "plan" ? String(i + 1).padStart(2, "0") + " · " : "") + esc(m.name) + "</span></button>"
        );
      })
      .join("");
  }
  function paintRoutes(sc) {
    var svg = $("caRoutes");
    if (!svg) return;
    if (st.mode === "plan") {
      svg.innerHTML = "";
      return;
    }
    var html = "";
    sc.routes.forEach(function (r, i) {
      var a = markById(sc, r[0]), b = markById(sc, r[1]);
      if (!a || !b) return;
      var d = curve(a, b, st.mode === "world" ? 0.18 : 0.1);
      html +=
        '<path class="ca-rt-glow" d="' + d + '"/><path class="ca-rt" d="' + d + '" style="--i:' + i + '"/>' +
        (reduced() ? "" : '<circle class="ca-rt-dot" r="0.7"><animateMotion dur="' + (5 + (i % 3)) + 's" repeatCount="indefinite" path="' + d + '"/></circle>');
    });
    svg.innerHTML = html;
  }
  function paintPlan(sc) {
    var svg = $("caPlan");
    if (!svg) return;
    if (st.mode !== "plan") {
      svg.innerHTML = "";
      return;
    }
    var VW = 1000, VH = Math.round((1000 * sc.h) / sc.w);
    svg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
    // sheet units per on-screen pixel: labels and symbols keep a readable size on any screen
    var k = Math.max(1, VW / Math.max(240, V ? V.w : 400));
    svg.style.setProperty("--k", k.toFixed(3));
    var M = 18 * k;
    var X = function (p) { return (p / 100) * VW; };
    var Y = function (p) { return (p / 100) * VH; };
    var cols = 10, rows = Math.max(4, Math.round((cols * VH) / VW));
    var out = '<defs><pattern id="caMinor" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 H0 V20" class="g1"/></pattern><pattern id="caMajor" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#caMinor)"/><path d="M100 0 H0 V100" class="g2"/></pattern></defs>';
    out += '<rect class="ca-paper" width="' + VW + '" height="' + VH + '"/><rect width="' + VW + '" height="' + VH + '" fill="url(#caMajor)"/>';
    out += '<rect class="ca-draw frame" x="' + M + '" y="' + M + '" width="' + (VW - 2 * M) + '" height="' + (VH - 2 * M) + '" pathLength="1"/>';
    for (var c = 0; c < cols; c++) {
      var cx = M + ((VW - 2 * M) / cols) * (c + 0.5);
      out += '<text class="ref" x="' + cx.toFixed(1) + '" y="' + (M / 2).toFixed(1) + '">' + String.fromCharCode(65 + c) + '</text><text class="ref" x="' + cx.toFixed(1) + '" y="' + (VH - M / 2).toFixed(1) + '">' + String.fromCharCode(65 + c) + "</text>";
    }
    for (var rr = 0; rr < rows; rr++) {
      var ry = M + ((VH - 2 * M) / rows) * (rr + 0.5);
      out += '<text class="ref" x="' + (M / 2).toFixed(1) + '" y="' + ry.toFixed(1) + '">' + (rr + 1) + '</text><text class="ref" x="' + (VW - M / 2).toFixed(1) + '" y="' + ry.toFixed(1) + '">' + (rr + 1) + "</text>";
    }
    // dimension lines along routes (lengths in grid units: 1 u = 1% of the sheet width)
    sc.routes.forEach(function (r, i) {
      var a = markById(sc, r[0]), b = markById(sc, r[1]);
      if (!a || !b) return;
      var x1 = X(a.x), y1 = Y(a.y), x2 = X(b.x), y2 = Y(b.y);
      var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      var nx = (-dy / len) * 9 * k, ny = (dx / len) * 9 * k;
      var units = Math.round((len / VW) * 100);
      var mx = (x1 + x2) / 2 + nx * 1.6, my = (y1 + y2) / 2 + ny * 1.6;
      var ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (ang > 90 || ang < -90) ang += 180;
      out +=
        '<path class="ca-draw dim" pathLength="1" style="--d:' + (300 + i * 90) + 'ms" d="M' + (x1 + nx).toFixed(1) + " " + (y1 + ny).toFixed(1) + " L" + (x2 + nx).toFixed(1) + " " + (y2 + ny).toFixed(1) + '"/>' +
        '<path class="ca-draw tick" pathLength="1" d="M' + x1.toFixed(1) + " " + y1.toFixed(1) + " l" + (nx * 1.5).toFixed(1) + " " + (ny * 1.5).toFixed(1) + " M" + x2.toFixed(1) + " " + y2.toFixed(1) + " l" + (nx * 1.5).toFixed(1) + " " + (ny * 1.5).toFixed(1) + '"/>' +
        '<text class="dimt" transform="translate(' + mx.toFixed(1) + " " + my.toFixed(1) + ") rotate(" + ang.toFixed(1) + ')">' + units + " u</text>";
    });
    // plan symbols, numbered
    sc.marks.forEach(function (m, i) {
      var x = X(m.x), y = Y(m.y), s = symFor(m.name), d = "", q = k;
      var u = function (n) {
        return (n * q).toFixed(1);
      };
      if (s === "struct") d = "M" + (x - 11 * q) + " " + (y - 11 * q) + " h" + u(22) + " v" + u(22) + " h" + u(-22) + "Z M" + (x - 11 * q) + " " + (y - 11 * q) + " l" + u(22) + " " + u(22) + " M" + (x + 11 * q) + " " + (y - 11 * q) + " l" + u(-22) + " " + u(22);
      else if (s === "water") d = "M" + (x - 12 * q) + " " + y + " a" + u(12) + " " + u(12) + " 0 1 0 " + u(24) + " 0 a" + u(12) + " " + u(12) + " 0 1 0 " + u(-24) + " 0 M" + (x - 7 * q) + " " + (y + q) + " q" + u(3.5) + " " + u(-4) + " " + u(7) + " 0 t" + u(7) + " 0";
      else if (s === "rise") d = "M" + x + " " + (y - 13 * q) + " L" + (x + 12 * q) + " " + (y + 9 * q) + " L" + (x - 12 * q) + " " + (y + 9 * q) + "Z M" + (x - 5 * q) + " " + (y + 2 * q) + " h" + u(10);
      else d = "M" + x + " " + (y - 11 * q) + " L" + (x + 10 * q) + " " + (y - 5.5 * q) + " L" + (x + 10 * q) + " " + (y + 5.5 * q) + " L" + x + " " + (y + 11 * q) + " L" + (x - 10 * q) + " " + (y + 5.5 * q) + " L" + (x - 10 * q) + " " + (y - 5.5 * q) + "Z";
      out += '<path class="ca-draw sym ' + s + '" pathLength="1" style="--d:' + (500 + i * 70) + 'ms" d="' + d + '"/><text class="num" x="' + (x + 16 * q).toFixed(1) + '" y="' + (y - 12 * q).toFixed(1) + '">' + String(i + 1).padStart(2, "0") + "</text>";
    });
    // north arrow, scale bar and title block
    var L = loc();
    out +=
      '<g class="scale" transform="translate(' + (M + 22 * k).toFixed(1) + " " + (VH - M - 38 * k).toFixed(1) + ')"><path class="ca-draw" pathLength="1" d="M0 0 H100 M0 ' + (-6 * k).toFixed(1) + " V" + (6 * k).toFixed(1) + " M50 " + (-4 * k).toFixed(1) + " V" + (4 * k).toFixed(1) + " M100 " + (-6 * k).toFixed(1) + " V" + (6 * k).toFixed(1) + '"/><text x="0" y="' + (-12 * k).toFixed(1) + '">0</text><text x="50" y="' + (-12 * k).toFixed(1) + '">5</text><text x="100" y="' + (-12 * k).toFixed(1) + '">10 u</text></g>' +
      '<g class="tblock" transform="translate(' + (VW - M - 282 * Math.min(k, 1.9)).toFixed(1) + " " + (VH - M - 114 * Math.min(k, 1.9)).toFixed(1) + ") scale(" + Math.min(k, 1.9).toFixed(3) + ')"><rect class="ca-draw" pathLength="1" width="270" height="104"/><path class="ca-draw" pathLength="1" d="M0 34 H270 M0 60 H270 M0 82 H270 M150 60 V104"/>' +
      '<text class="tb1" x="12" y="24">' + esc(L.name.toUpperCase()) + '</text><text x="12" y="52">TOP PLAN · ORTHOGRAPHIC · 2D</text><text x="12" y="76">' + esc((sc.aligned ? L.top.era : era().label) || "").toUpperCase() + '</text><text x="12" y="98">SHEET CX-0' + (A.locations.indexOf(L) + 1) + '</text><text x="160" y="98">1 u = 1% WIDTH</text></g>';
    svg.innerHTML = out;
  }
  function paintDetail(sc) {
    var box = $("caDetail");
    if (!box) return;
    var L = loc();
    var sel = st.sel ? markById(sc, st.sel) : null;
    if (st.mode === "world") {
      box.innerHTML =
        '<h4>Realms</h4><div class="ca-realms">' +
        A.locations.map(function (l) {
          return '<button type="button" class="ca-realm" data-caloc="' + esc(l.id) + '"><b>' + esc(l.name) + "</b><small>" + esc(l.epithet) + "</small><i>" + l.eras.length + " era" + (l.eras.length === 1 ? "" : "s") + "</i></button>";
        }).join("") +
        "</div>" +
        (A.routes.length ? '<h4>Routes</h4><ul class="ca-routelist">' + A.routes.map(function (r) {
          var a = A.locations.find(function (l) { return l.id === r.from; }), b = A.locations.find(function (l) { return l.id === r.to; });
          return "<li><b>" + esc(r.label) + "</b><small>" + esc(a ? a.name : r.from) + " → " + esc(b ? b.name : r.to) + "</small></li>";
        }).join("") + "</ul>" : "");
      return;
    }
    var card = "";
    if (sel) {
      card =
        '<div class="ca-card"><h3>' + esc(sel.name) + "</h3>" + (sel.faction ? '<p class="ca-fac">' + esc(sel.faction) + "</p>" : "") +
        "<p>" + esc(sel.note || "") + "</p>" +
        (sel.characters && sel.characters.length
          ? '<div class="chips">' + sel.characters.map(function (c) { return '<button type="button" class="chip" data-cxch="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>"
          : "") +
        "</div>";
    }
    var note = "";
    if (st.mode === "top" && !sc.marks.length) note = '<p class="note">No landmarks are plotted on this top view yet. Scenic view shows them on the era art.</p>';
    if (st.mode === "plan" && !sc.aligned) note = '<p class="note">This plan is drawn from the era landmarks as a diagram, because no landmarks are plotted on the top view yet.</p>';
    var legend =
      st.mode === "plan"
        ? '<h4>Legend</h4><ul class="ca-legend"><li><i class="struct"></i>Structure</li><li><i class="water"></i>Water</li><li><i class="rise"></i>High ground</li><li><i class="point"></i>Point of interest</li><li><i class="dimk"></i>Route, length in grid units</li></ul>'
        : "";
    box.innerHTML =
      card + note +
      (sc.marks.length
        ? "<h4>" + (st.mode === "plan" ? "Index" : "Landmarks") + '</h4><div class="ca-index">' +
          sc.marks.map(function (m, i) {
            return '<button type="button" class="ca-ix' + (st.sel === m.id ? " on" : "") + '" data-camk="' + esc(m.id) + '"><span>' + String(i + 1).padStart(2, "0") + "</span>" + esc(m.name) + "</button>";
          }).join("") + "</div>"
        : "") + legend;
  }

  /* ---------- weather canvas ---------- */
  var FX = { raf: 0, parts: [], kinds: [], ctx: null, w: 0, h: 0, visible: true };
  function fxStart(kinds) {
    fxStop();
    var cv = $("caFx");
    if (!cv || reduced() || !kinds || !kinds.length) return;
    var r = cv.getBoundingClientRect();
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + "px";
    cv.style.height = r.height + "px";
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    FX.ctx = ctx; FX.w = r.width; FX.h = r.height; FX.kinds = kinds;
    var n = Math.min(140, Math.round((r.width * r.height) / 9000));
    FX.parts = [];
    for (var i = 0; i < n; i++) FX.parts.push(spawn(kinds[i % kinds.length], true));
    var last = performance.now();
    var tick = function (now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (FX.visible) drawFx(dt, now / 1000);
      FX.raf = requestAnimationFrame(tick);
    };
    FX.raf = requestAnimationFrame(tick);
  }
  function fxStop() {
    if (FX.raf) cancelAnimationFrame(FX.raf);
    FX.raf = 0;
    if (FX.ctx) FX.ctx.clearRect(0, 0, FX.w, FX.h);
  }
  function spawn(kind, anywhere) {
    var w = FX.w, h = FX.h, R = Math.random;
    var p = { k: kind, x: R() * w, y: anywhere ? R() * h : 0, a: R() * 6.28, s: 0.6 + R() * 0.8, life: R() };
    if (kind === "snow") { p.vy = 18 + R() * 30; p.vx = -6 + R() * 12; p.r = 1 + R() * 2.2; if (!anywhere) p.y = -5; }
    else if (kind === "ash") { p.vy = 10 + R() * 18; p.vx = 8 + R() * 16; p.r = 1 + R() * 1.8; if (!anywhere) p.y = -5; }
    else if (kind === "embers" || kind === "lanterns" || kind === "spores") {
      p.vy = kind === "lanterns" ? -(8 + R() * 10) : kind === "spores" ? -(5 + R() * 8) : -(20 + R() * 35);
      p.vx = -5 + R() * 10; p.r = kind === "lanterns" ? 2.5 + R() * 2.5 : kind === "spores" ? 1 + R() * 1.5 : 1 + R() * 1.8;
      if (!anywhere) p.y = h + 6;
    } else if (kind === "fireflies") { p.vx = -8 + R() * 16; p.vy = -8 + R() * 16; p.r = 1.4 + R() * 1.4; }
    else if (kind === "mist") { p.vx = 4 + R() * 8; p.vy = 0; p.r = 60 + R() * 110; p.y = R() * h; if (!anywhere) p.x = -p.r; }
    else if (kind === "wind") { p.vx = 120 + R() * 140; p.vy = -4 + R() * 8; p.r = 30 + R() * 60; if (!anywhere) p.x = -p.r; }
    else if (kind === "rift") { p.vx = 0; p.vy = 0; p.r = 10 + R() * 26; }
    return p;
  }
  var COL = {
    snow: "235,244,255", ash: "170,165,160", embers: "255,150,70", lanterns: "255,196,110", spores: "190,240,150",
    fireflies: "220,255,140", mist: "220,230,245", wind: "230,240,255", rift: "190,120,255",
  };
  function drawFx(dt, t) {
    var c = FX.ctx, w = FX.w, h = FX.h;
    if (!c) return;
    c.clearRect(0, 0, w, h);
    for (var i = 0; i < FX.parts.length; i++) {
      var p = FX.parts[i];
      p.life += dt * 0.25;
      if (p.k === "fireflies") { p.a += dt * 1.6; p.vx += Math.cos(p.a) * 6 * dt; p.vy += Math.sin(p.a * 1.3) * 6 * dt; }
      p.x += (p.vx + (p.k === "snow" || p.k === "lanterns" ? Math.sin(t * 1.3 + p.a) * 8 : 0)) * dt;
      p.y += p.vy * dt;
      var out = p.y > h + 12 || p.y < -14 || p.x > w + p.r + 10 || p.x < -p.r - 40;
      if (p.k === "fireflies" || p.k === "rift") out = p.life > 1.6;
      if (out) { FX.parts[i] = spawn(p.k, p.k === "fireflies" || p.k === "rift"); continue; }
      var col = COL[p.k] || "255,255,255";
      if (p.k === "mist") {
        var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, "rgba(" + col + ",0.10)"); g.addColorStop(1, "rgba(" + col + ",0)");
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
      } else if (p.k === "wind") {
        c.strokeStyle = "rgba(" + col + ",0.18)"; c.lineWidth = 1;
        c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x - p.r / 2, p.y - 3, p.x - p.r, p.y); c.stroke();
      } else if (p.k === "rift") {
        var al = Math.max(0, Math.sin(p.life * 3.9)) * 0.55;
        c.strokeStyle = "rgba(" + col + "," + al.toFixed(3) + ")"; c.lineWidth = 1.4;
        c.beginPath(); c.arc(p.x, p.y, p.r, p.a, p.a + 1.6 + Math.sin(t + p.a)); c.stroke();
      } else {
        var glow = p.k === "embers" || p.k === "lanterns" || p.k === "fireflies";
        var alpha = p.k === "fireflies" ? 0.25 + Math.abs(Math.sin(t * 2 + p.a)) * 0.7 : p.k === "embers" ? 0.5 + Math.random() * 0.4 : 0.75;
        if (glow) {
          var gg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          gg.addColorStop(0, "rgba(" + col + "," + (alpha * 0.55).toFixed(3) + ")"); gg.addColorStop(1, "rgba(" + col + ",0)");
          c.fillStyle = gg; c.beginPath(); c.arc(p.x, p.y, p.r * 4, 0, 6.283); c.fill();
        }
        c.fillStyle = "rgba(" + col + "," + alpha.toFixed(3) + ")";
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
      }
    }
  }

  /* ---------- mount + interactions ---------- */
  var io = null;
  function paintAll() {
    var sc = scene();
    var stg = $("caStage");
    if (stg) stg.classList.toggle("ca-noghost", st.mode === "plan" && !sc.aligned);
    paintMarks(sc);
    paintRoutes(sc);
    paintPlan(sc);
    paintDetail(sc);
    fxStart(sc.fx);
  }
  function mount() {
    var stage = $("caStage");
    if (!stage) return;
    setupView();
    paintAll();
    if (io) io.disconnect();
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (es) {
        FX.visible = es.some(function (e) { return e.isIntersecting; });
      });
      io.observe(stage);
    }
  }
  function goEra(i) {
    var L = loc();
    if (i < 0 || i >= L.eras.length || i === st.era) return;
    st.era = i;
    st.sel = null;
    save();
    var E = era();
    var a = $("caImgA"), b = $("caImgB"), stage = $("caStage"), flash = $("caFlash"), blur = $("caBlur");
    document.querySelectorAll("[data-caera]").forEach(function (x, j) {
      x.setAttribute("aria-selected", String(j === i));
    });
    var sum = $("caSum");
    if (sum) sum.textContent = E.summary;
    if (!a || !b || !stage) return paintAll();
    b.onload = function () {
      b.onload = null;
      stage.classList.remove("t-quake", "t-war", "t-growth", "t-calm");
      void stage.offsetWidth;
      if (!reduced()) stage.classList.add("t-" + (L.transition || "calm"));
      if (flash) { flash.className = "ca-flash go-" + (L.transition || "calm"); }
      b.classList.add("show");
      setTimeout(function () {
        a.src = E.image;
        b.classList.remove("show");
        if (blur) blur.src = E.image;
      }, reduced() ? 0 : 950);
      paintAll();
    };
    b.src = E.image;
  }
  function openLoc(id, fromPin) {
    var go = function () {
      st.loc = id;
      st.era = Math.max(0, loc().eras.length - 1);
      st.sel = null;
      if (st.mode === "world") st.mode = "scenic";
      save();
      render();
    };
    if (fromPin && V && !reduced()) {
      var l = A.locations.find(function (x) { return x.id === id; });
      if (l) {
        V.focus(l.worldX, l.worldY, 4);
        var stage = $("caStage");
        if (stage) stage.classList.add("ca-dive");
        setTimeout(go, 520);
        return;
      }
    }
    go();
  }
  document.addEventListener("click", function (e) {
    if (typeof tab === "undefined" || tab !== "map") return;
    var t = e.target;
    var m = t.closest && t.closest("[data-camode]");
    if (m) {
      st.mode = m.dataset.camode;
      st.sel = null;
      save();
      render();
      return;
    }
    var l = t.closest && t.closest("[data-caloc]");
    if (l) return openLoc(l.dataset.caloc, false);
    var er = t.closest && t.closest("[data-caera]");
    if (er) return goEra(+er.dataset.caera);
    var z = t.closest && t.closest("[data-cazoom]");
    if (z && V) {
      var dz = +z.dataset.cazoom;
      if (!dz) V.set(1, 0, 0, true);
      else V.zoomAt(V.z * (dz > 0 ? 1.5 : 1 / 1.5), V.W / 2, V.H / 2, true);
      return;
    }
    var mk = t.closest && t.closest("[data-camk]");
    if (mk) {
      var sc = scene();
      var it = markById(sc, mk.dataset.camk);
      if (!it) return;
      if (it.place) return openLoc(it.id, true);
      st.sel = it.id;
      paintMarks(sc);
      paintDetail(sc);
      if (V) V.focus(it.x, it.y);
      var card = document.querySelector(".ca-card");
      if (card && mk.classList.contains("ca-ix")) card.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "nearest" });
    }
  });
  window.addEventListener("resize", function () {
    if (typeof tab === "undefined" || tab !== "map" || !$("caStage")) return;
    clearTimeout(window.__caRz);
    window.__caRz = setTimeout(mount, 180);
  });

  /* ---------- Codex integration ---------- */
  if (typeof viewHTML === "function") {
    var _vh = viewHTML;
    // eslint-disable-next-line no-global-assign
    viewHTML = function () {
      if (typeof tab !== "undefined" && tab === "map") return atlasHTML();
      return _vh.apply(this, arguments);
    };
  }
  if (typeof render === "function") {
    var _r = render;
    // eslint-disable-next-line no-global-assign
    render = function () {
      _r.apply(this, arguments);
      if (typeof tab !== "undefined" && tab === "map") {
        try {
          requestAnimationFrame(mount);
        } catch (e) {
          if (window.console) console.warn("[codex] atlas skipped", e);
        }
      } else fxStop();
    };
  }
  window.__codexAtlas = { state: st, scene: scene, symFor: symFor };
  try {
    if (typeof tab !== "undefined" && tab === "map") render();
  } catch (e) {}
})();
