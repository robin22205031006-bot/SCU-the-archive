/* Codex host bridge (body): runs after every Codex script.
 * 1. Routing: host tabs open the app's own pages; Codex tabs keep the app URL in sync.
 * 2. Interface picker inside the Codex so readers can switch UI without leaving it.
 * 3. Season dossier: season rail, identity, rune gauges and compare, drawn in Codex style
 *    from the same dossier data the Nexus dossier reads (entities.stats.dossier).
 * 4. Spring motion for pills, segmented controls and the reveal dial (transform/opacity only). */
(function () {
  "use strict";
  var H = window.__codexHost || null;
  var API = window.__codexApi || null;
  var $id = function (id) {
    return document.getElementById(id);
  };
  var escH = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var feed = function () {
    return window.__codexFeed || null;
  };
  function reduced() {
    try {
      if (document.documentElement.dataset.motion === "off") return true;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  /* ---------- spring engine: one value, retargetable, velocity preserved ---------- */
  function Spring(value, onUpdate, opts) {
    this.x = value;
    this.v = 0;
    this.t = value;
    this.k = (opts && opts.k) || 210;
    this.c = (opts && opts.c) || 24;
    this.cb = onUpdate;
    this.raf = 0;
    this.last = 0;
    onUpdate(value);
  }
  Spring.prototype.to = function (target) {
    this.t = target;
    if (reduced()) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.x = target;
      this.v = 0;
      this.cb(target);
      return;
    }
    if (this.raf) return;
    var self = this;
    this.last = performance.now();
    var step = function (now) {
      var dt = Math.min(0.032, (now - self.last) / 1000);
      self.last = now;
      // two half steps keep stiff springs stable on slow frames
      for (var i = 0; i < 2; i++) {
        var h = dt / 2;
        var a = -self.k * (self.x - self.t) - self.c * self.v;
        self.v += a * h;
        self.x += self.v * h;
      }
      if (Math.abs(self.v) < 0.002 && Math.abs(self.x - self.t) < 0.0005) {
        self.x = self.t;
        self.v = 0;
        self.cb(self.x);
        self.raf = 0;
        return;
      }
      self.cb(self.x);
      self.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  };
  window.__codexSpring = Spring;

  /* ---------- 1. routing ---------- */
  var NATIVE = {
    home: "/",
    characters: "/characters",
    series: "/series",
    clans: "/clans",
    orgs: "/orgs",
    abilities: "/abilities",
    arsenal: "/arsenal",
    timeline: "/timeline",
    graph: "/graph",
  };
  var HOSTP = {
    map: "/map",
    story: "/story",
    fandom: "/fandom",
    ai: "/ai",
    vault: "/vault",
    fx: "/ability-fx",
    action: "/ability-action",
    atlas: "/atlas",
    season: "/season",
    reader: "/reader",
    profile: "/profile",
    appadmin: "/admin",
    ingest: "/ingest",
  };
  if (H && API) {
    document.addEventListener(
      "click",
      function (e) {
        var b = e.target && e.target.closest ? e.target.closest("[data-nt]") : null;
        if (!b) return;
        var id = b.dataset.nt;
        var n = API.NT.find(function (m) {
          return m[0] === id;
        });
        if (n && n[4] === "host" && HOSTP[id]) {
          e.preventDefault();
          e.stopImmediatePropagation();
          try {
            H.navigate(HOSTP[id]);
          } catch (err) {}
        }
      },
      true,
    );
    var report = function () {
      try {
        var id = API.ntNow()[0];
        if (NATIVE[id]) H.route(NATIVE[id]);
      } catch (e) {}
    };
    window.addEventListener("hashchange", function () {
      setTimeout(report, 0);
    });
    window.__codexGoto = function (id) {
      try {
        if (NATIVE[id] && API.ntNow()[0] !== id) location.hash = "#/" + id;
      } catch (e) {}
    };
    // Non staff readers never get the Codex's local editing switch inside the app.
    document.addEventListener(
      "click",
      function (e) {
        var f = feed();
        var b = e.target && e.target.closest ? e.target.closest("[data-adm]") : null;
        if (b && !(f && f.staff)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    try {
      H.ready && H.ready();
    } catch (e) {}
  }

  /* ---------- 2. interface picker ---------- */
  var UI_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>';
  function openUiPicker() {
    var f = feed();
    var modes = (f && f.modes) || [];
    if (!modes.length || !H) return;
    var m = $id("modal");
    var trig = document.activeElement;
    m.innerHTML =
      '<div class="mbox wide cx-ui" role="dialog" aria-modal="true" aria-labelledby="cxuiT"><h3 id="cxuiT">Interface</h3><p class="note" style="margin:0 0 8px">Every interface reads the same archive. Nexus and Codex are the two fully animated signature styles.</p><div class="list cx-ui-list">' +
      modes
        .map(function (md, i) {
          var on = md.id === f.mode;
          return (
            '<button class="cr cx-ui-card' +
            (on ? " on" : "") +
            (md.signature ? " sig" : "") +
            '" data-cxmode="' +
            escH(md.id) +
            '" style="--i:' +
            i +
            '" aria-pressed="' +
            on +
            '"><span class="av">' +
            escH(md.label.charAt(0)) +
            '</span><span class="cx-ui-t"><b>' +
            escH(md.label) +
            (md.signature ? ' <em class="cx-sig">Signature</em>' : "") +
            "</b><i>" +
            escH(md.desc) +
            "</i></span>" +
            (on ? '<span class="ck" aria-hidden="true">✓</span>' : "") +
            "</button>"
          );
        })
        .join("") +
      '</div><div class="row"><button class="btn ghost" id="cxuiClose">Close</button></div></div>';
    m.hidden = false;
    var close = function () {
      m.hidden = true;
      m.innerHTML = "";
      m.onclick = null;
      document.removeEventListener("keydown", onKey, true);
      if (trig && trig.focus) trig.focus();
    };
    var onKey = function (e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    m.onclick = function (e) {
      if (e.target === m) return close();
      var b = e.target.closest("[data-cxmode]");
      if (b) {
        close();
        try {
          H.setMode(b.dataset.cxmode);
        } catch (err) {}
      }
    };
    $id("cxuiClose").onclick = close;
    setTimeout(function () {
      var first = m.querySelector(".cx-ui-card.on") || m.querySelector(".cx-ui-card");
      if (first) first.focus();
    }, 0);
  }
  window.__codexOpenUi = openUiPicker;
  if (H) {
    var tb = document.querySelector(".top .tb");
    if (tb && !$id("bUi")) {
      tb.insertAdjacentHTML(
        "afterbegin",
        '<button class="ib" id="bUi" aria-label="Interface style" data-tip="Interface style">' +
          UI_ICON +
          "</button>",
      );
      $id("bUi").onclick = openUiPicker;
    }
  }

  /* settings slide: hide the local admin switch for readers, add the interface row */
  function patchSettings(root) {
    var box = root.querySelector("#stylebox");
    if (!box || box.dataset.cx === "1") return;
    box.dataset.cx = "1";
    var f = feed();
    box.querySelectorAll(".xopt").forEach(function (row) {
      var b = row.querySelector("b");
      if (b && /Admin editing/.test(b.textContent || "")) {
        if (!(f && f.staff)) row.remove();
        else {
          var i = row.querySelector("i");
          if (i) i.textContent = "Local Codex edits on this device. Archive writes stay in the app's admin.";
        }
      }
    });
    if (H) {
      box.insertAdjacentHTML(
        "afterbegin",
        '<div class="xopt"><span><b>Interface</b><i>Switch to Nexus, Classic, Manga or Minimal. Your place in the archive is kept.</i></span><button class="btn ghost" id="cxSetUi">Change interface</button></div>',
      );
      var btn = $id("cxSetUi");
      if (btn) btn.onclick = openUiPicker;
    }
  }

  /* ---------- 3. season dossier ---------- */
  var dState = {}; // codex name -> { i, cmp, vals }
  var STATUS_COL = {
    alive: "#4FCB97",
    dead: "#F05A66",
    missing: "#E9B84F",
    "presumed dead": "#E47A5C",
    sealed: "#A88BEA",
  };
  function dossierFor(codexName) {
    var f = feed();
    if (!f || !f.dossiers) return null;
    if (f.dossiers[codexName]) return f.dossiers[codexName];
    var map = window.__codexNameMap || {};
    for (var app in map) {
      if (map[app] === codexName && f.dossiers[app]) return f.dossiers[app];
    }
    var n = window.__codexNorm ? window.__codexNorm(codexName) : codexName.toLowerCase();
    for (var k in f.dossiers) {
      var kn = window.__codexNorm ? window.__codexNorm(k) : k.toLowerCase();
      if (kn === n || n.indexOf(kn + " ") === 0) return f.dossiers[k];
    }
    return null;
  }
  /** Exact Codex lookup. The Codex's own keyByName falls back to its first ability, so never use it raw. */
  function findKey(name) {
    try {
      var want = typeof clean === "function" ? clean(name) : name;
      for (var b = 0; b < BR.length; b++)
        for (var g = 0; g < BR[b].g.length; g++) {
          if (clean(BR[b].g[g].n) === want) return b + "|" + g;
          for (var l = 0; l < BR[b].g[g].k.length; l++)
            if (clean(BR[b].g[g].k[l].n) === want) return b + "|" + g + "|" + l;
        }
    } catch (e) {}
    return null;
  }
  var curChar = "";
  /** Codex is the authority on who holds what: split the app's list for this character. */
  function splitAbilities(names) {
    var held = null;
    try {
      held = (typeof HOLD !== "undefined" && HOLD[curChar]) || null;
    } catch (e) {}
    var codexKnows = !!held;
    var show = [];
    var hidden = 0;
    (names || []).forEach(function (nm) {
      var key = findKey(nm);
      if (!key) return show.push({ n: nm, key: null });
      if (!codexKnows) return show.push({ n: nm, key: key });
      var grp = key.split("|").slice(0, 2).join("|");
      var mine = held.some(function (x) {
        return x.k === grp;
      });
      if (mine) show.push({ n: nm, key: key });
      else hidden++;
    });
    return { show: show, hidden: hidden };
  }
  function abilityChip(it) {
    if (it.key) {
      var svg = "";
      try {
        svg = typeof emA === "function" ? emA(it.key, 20) : "";
      } catch (e) {
        svg = "";
      }
      return (
        '<button class="chip cxd-ab" data-go="' +
        escH(it.key) +
        '"><span style="display:inline-grid;width:20px;height:20px">' +
        svg +
        "</span>" +
        escH(it.n) +
        "</button>"
      );
    }
    return '<span class="chip cxd-ab canon">' + escH(it.n) + "</span>";
  }
  function factRow(label, value) {
    if (!value || (Array.isArray(value) && !value.length)) return "";
    var v = Array.isArray(value) ? value.join(" · ") : value;
    return '<div class="cxd-f"><span>' + escH(label) + "</span><b>" + escH(v) + "</b></div>";
  }
  function panelHTML(d, i, cmp) {
    var s = d.seasons[i];
    var prev = i > 0 ? d.seasons[i - 1] : null;
    var st = String(s.status || "").toLowerCase();
    var sc = STATUS_COL[st] || "var(--c1)";
    var avg = s.stats.length
      ? Math.round(
          s.stats.reduce(function (a, x) {
            return a + x.value;
          }, 0) / s.stats.length,
        )
      : 0;
    var roles = (s.roles && s.roles.length ? s.roles : s.role ? [s.role] : [])
      .map(function (r) {
        return '<span class="cxd-role">' + escH(r) + "</span>";
      })
      .join("");
    var gauges = s.stats
      .map(function (x) {
        var pv = null;
        if (prev) {
          var pm = prev.stats.find(function (y) {
            return y.key === x.key;
          });
          pv = pm ? pm.value : null;
        }
        var dl = pv == null ? "" : x.value - pv;
        var dTxt = dl === "" ? "" : dl > 0 ? "+" + dl : dl < 0 ? "−" + Math.abs(dl) : "±0";
        return (
          '<div class="cxg" data-k="' +
          escH(x.key) +
          '" data-v="' +
          x.value +
          '" data-pv="' +
          (pv == null ? "" : pv) +
          '"><span class="cxg-l">' +
          escH(x.label) +
          '</span><span class="cxg-t"><i class="cxg-f"></i><i class="cxg-tipw"><i class="cxg-tip"></i></i><i class="cxg-ghw"><i class="cxg-gh"></i></i></span><span class="cxg-v">0</span><span class="cxg-d ' +
          (dl > 0 ? "up" : dl < 0 ? "dn" : "eq") +
          '">' +
          dTxt +
          "</span></div>"
        );
      })
      .join("");
    return (
      '<div class="cxd-id">' +
      (s.codename ? '<div class="cxd-cn"><small>Codename</small><b>' + escH(s.codename) + "</b></div>" : "") +
      '<div class="cxd-meta">' +
      (s.status
        ? '<span class="cxd-st" style="--sc:' + sc + '"><i></i>' + escH(s.status) + "</span>"
        : "") +
      roles +
      "</div></div>" +
      (s.impact ? '<blockquote class="cxd-q">' + escH(s.impact) + "</blockquote>" : "") +
      (s.stats.length
        ? '<div class="cxd-sh"><h4>Rune gauges</h4><span class="cxd-pi">Power index <b data-pi="' +
          avg +
          '">' +
          avg +
          "</b></span></div>" +
          (s.profiles && s.profiles.length
            ? '<div class="xseg cxd-prof" role="group" aria-label="Stat profile"><button type="button" class="on" aria-pressed="true" data-cxp="-1">Character</button>' +
              s.profiles
                .map(function (p, pi) {
                  return (
                    '<button type="button" aria-pressed="false" data-cxp="' +
                    pi +
                    '">' +
                    escH(p.name) +
                    "</button>"
                  );
                })
                .join("") +
              "</div>"
            : "") +
          '<div class="cxd-stats' +
          (cmp && prev ? " cmp" : "") +
          '">' +
          gauges +
          "</div>" +
          (prev
            ? '<p class="note cxd-cmpn">' +
              (cmp
                ? "Ghost marks show " + escH(prev.label) + "."
                : "Turn on compare to see the change from " + escH(prev.label) + ".")
              + "</p>"
            : "")
        : '<p class="note">No stat profile recorded for this season yet.</p>') +
      (function () {
        var sp = splitAbilities(s.abilities);
        if (!sp.show.length && !sp.hidden) return "";
        return (
          '<div class="sec"><h4>Abilities this season</h4>' +
          (sp.show.length
            ? '<div class="chips">' + sp.show.map(abilityChip).join("") + "</div>"
            : '<p class="note">None recorded for this season.</p>') +
          (sp.hidden
            ? '<p class="note">' +
              sp.hidden +
              " archive entr" +
              (sp.hidden === 1 ? "y is" : "ies are") +
              " left out: the Codex lists " +
              (sp.hidden === 1 ? "it" : "them") +
              " under other characters.</p>"
            : "") +
          "</div>"
        );
      })() +
      '<div class="cxd-facts">' +
      factRow("Bloodline", s.bloodline) +
      factRow("Organizations", s.orgs) +
      factRow("Weapons", s.weapons) +
      factRow("Gender", s.gender) +
      factRow("Philosophy", s.philosophy) +
      "</div>" +
      (s.story ? '<p class="desc cxd-story">' + escH(s.story) + "</p>" : "")
    );
  }
  function animateGauges(root, st) {
    root.querySelectorAll(".cxg").forEach(function (g) {
      var k = g.dataset.k;
      var v = +g.dataset.v || 0;
      var pv = g.dataset.pv === "" ? null : +g.dataset.pv;
      var fill = g.querySelector(".cxg-f");
      var tipw = g.querySelector(".cxg-tipw");
      var ghw = g.querySelector(".cxg-ghw");
      var out = g.querySelector(".cxg-v");
      var from = st.vals[k] != null ? st.vals[k] : 0;
      var setP = function (x) {
        var p = Math.max(0, Math.min(1.08, x / 100));
        fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
        tipw.style.transform = "translateX(" + (p * 100 - 100).toFixed(3) + "%)";
        out.textContent = String(Math.max(0, Math.round(x)));
      };
      var sp = new Spring(from, setP, { k: 160, c: 19 });
      g._sp = sp;
      sp.to(v);
      st.vals[k] = v;
      if (pv != null) ghw.style.transform = "translateX(" + (pv - 100) + "%)";
    });
  }
  /** Ability stat profiles: the gauges spring from the character profile to the ability's. */
  function wireProfiles(panel, season, st) {
    var bar = panel.querySelector(".cxd-prof");
    if (!bar) return;
    var box = panel.querySelector(".cxd-stats");
    var pi = panel.querySelector("[data-pi]");
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cxp]");
      if (!b) return;
      var idx = +b.dataset.cxp;
      bar.querySelectorAll("[data-cxp]").forEach(function (x) {
        var on = x === b;
        x.classList.toggle("on", on);
        x.setAttribute("aria-pressed", String(on));
      });
      var src = idx >= 0 && season.profiles[idx] ? season.profiles[idx].stats : season.stats;
      if (box) box.classList.toggle("prof", idx >= 0);
      var sum = 0;
      box.querySelectorAll(".cxg").forEach(function (g) {
        var m = src.find(function (x) {
          return x.key === g.dataset.k;
        });
        var v = m ? m.value : 0;
        sum += v;
        if (g._sp) g._sp.to(v);
        st.vals[g.dataset.k] = v;
      });
      if (pi) pi.textContent = String(Math.round(sum / Math.max(1, src.length)));
    });
  }
  function placeLens(rail, st, instant) {
    var lens = rail.querySelector(".cxr-lens");
    var on = rail.querySelector('[aria-selected="true"]');
    if (!lens || !on) return;
    var x = on.offsetLeft;
    var w = on.offsetWidth;
    if (!st.lx || instant) {
      st.lx = new Spring(x, function (v) {
        st._x = v;
        lens.style.transform = "translateX(" + v.toFixed(2) + "px) scaleX(" + ((st._w || w) / 100).toFixed(4) + ")";
      }, { k: 260, c: 26 });
      st.lw = new Spring(w, function (v) {
        st._w = v;
        lens.style.transform = "translateX(" + (st._x || x).toFixed(2) + "px) scaleX(" + (v / 100).toFixed(4) + ")";
      }, { k: 260, c: 26 });
      return;
    }
    st.lx.to(x);
    st.lw.to(w);
    var left = x - rail.clientWidth / 2 + w / 2;
    try {
      rail.scrollTo({ left: left, behavior: reduced() ? "auto" : "smooth" });
    } catch (e) {
      rail.scrollLeft = left;
    }
  }
  function mountDossier(name) {
    var sheet = $id("sheet");
    if (!sheet || sheet.querySelector(".sealedbox") || sheet.querySelector(".cxd")) return;
    var d = dossierFor(name);
    if (!d || !d.seasons || !d.seasons.length) return;
    curChar = name;
    var st = dState[name] || (dState[name] = { i: d.seasons.length - 1, cmp: false, vals: {} });
    if (st.i >= d.seasons.length) st.i = d.seasons.length - 1;
    st.lx = null;
    st.vals = {};
    var anchor = sheet.querySelector(".desc") || sheet.querySelector(".sh-top");
    if (!anchor) return;
    var html =
      '<section class="sec cxd" aria-label="Season dossier"><div class="cxd-head"><h4>Season dossier</h4>' +
      (d.seasons.length > 1
        ? '<button class="cxd-cmp" type="button" aria-pressed="' + st.cmp + '"><i></i>Compare</button>'
        : "") +
      '</div><div class="cxr" role="tablist" aria-label="Seasons"><span class="cxr-lens" aria-hidden="true"></span>' +
      d.seasons
        .map(function (s, i) {
          return (
            '<button class="cxr-p" role="tab" type="button" data-cxs="' +
            i +
            '" aria-selected="' +
            (i === st.i) +
            '" tabindex="' +
            (i === st.i ? 0 : -1) +
            '"><small>' +
            escH(s.series || "Season") +
            "</small><b>" +
            escH(s.label) +
            "</b></button>"
          );
        })
        .join("") +
      '</div><div class="cxd-panel" role="tabpanel"></div></section>';
    anchor.insertAdjacentHTML("afterend", html);
    var root = sheet.querySelector(".cxd");
    // Wear the character's own colours, like the sheet header does.
    var top = sheet.querySelector(".sh-top");
    if (top && top.getAttribute("style")) root.setAttribute("style", top.getAttribute("style"));
    var rail = root.querySelector(".cxr");
    var panel = root.querySelector(".cxd-panel");
    var paint = function (dir) {
      panel.innerHTML = panelHTML(d, st.i, st.cmp);
      panel.classList.remove("in-l", "in-r", "in");
      void panel.offsetWidth;
      panel.classList.add(dir > 0 ? "in-r" : dir < 0 ? "in-l" : "in");
      animateGauges(panel, st);
      wireProfiles(panel, d.seasons[st.i], st);
    };
    var select = function (i, focus) {
      if (i < 0 || i >= d.seasons.length || i === st.i) return;
      var dir = i > st.i ? 1 : -1;
      st.i = i;
      rail.querySelectorAll(".cxr-p").forEach(function (b, j) {
        b.setAttribute("aria-selected", String(j === i));
        b.tabIndex = j === i ? 0 : -1;
        if (j === i && focus) b.focus();
      });
      placeLens(rail, st, false);
      paint(dir);
    };
    rail.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cxs]");
      if (b) select(+b.dataset.cxs, false);
    });
    rail.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home") return select(0, true);
      if (e.key === "End") return select(d.seasons.length - 1, true);
      if (n) {
        e.preventDefault();
        select(st.i + n, true);
      }
    });
    var cmpBtn = root.querySelector(".cxd-cmp");
    if (cmpBtn)
      cmpBtn.onclick = function () {
        st.cmp = !st.cmp;
        cmpBtn.setAttribute("aria-pressed", String(st.cmp));
        var box = panel.querySelector(".cxd-stats");
        if (box) box.classList.toggle("cmp", st.cmp && st.i > 0);
        var note = panel.querySelector(".cxd-cmpn");
        var prev = d.seasons[st.i - 1];
        if (note && prev)
          note.textContent = st.cmp
            ? "Ghost marks show " + prev.label + "."
            : "Turn on compare to see the change from " + prev.label + ".";
      };
    placeLens(rail, st, true);
    paint(0);
    requestAnimationFrame(function () {
      placeLens(rail, st, true);
      var on = rail.querySelector('[aria-selected="true"]');
      if (on) rail.scrollLeft = on.offsetLeft - rail.clientWidth / 2 + on.offsetWidth / 2;
    });
  }
  if (typeof renderChar === "function") {
    var _rcx = renderChar;
    // eslint-disable-next-line no-global-assign
    renderChar = function (n) {
      _rcx.apply(this, arguments);
      try {
        mountDossier(n);
      } catch (e) {
        if (window.console) console.warn("[codex] dossier skipped", e);
      }
    };
  }
  window.__codexFeedUpdate = function (next) {
    window.__codexFeed = next;
  };

  /* ---------- 4. spring motion on segmented controls and the reveal dial ---------- */
  var segMem = new Map();
  function segKey(seg) {
    var b = seg.querySelector("button");
    if (!b) return "";
    var attrs = Array.prototype.map
      .call(b.attributes, function (a) {
        return a.name.indexOf("data-") === 0 ? a.name : "";
      })
      .join("");
    return attrs + "|" + seg.children.length;
  }
  function decorateSeg(seg) {
    if (seg.dataset.cxSeg === "1") return;
    var on = seg.querySelector('button.on,button[aria-pressed="true"],button[aria-checked="true"]');
    if (!on) return;
    seg.dataset.cxSeg = "1";
    seg.classList.add("cx-seg");
    var ind = document.createElement("span");
    ind.className = "cx-seg-ind";
    ind.setAttribute("aria-hidden", "true");
    seg.insertBefore(ind, seg.firstChild);
    var key = segKey(seg);
    var x = on.offsetLeft;
    var w = on.offsetWidth;
    var y = on.offsetTop;
    var h = on.offsetHeight;
    ind.style.height = h + "px";
    ind.style.top = y + "px";
    var prev = segMem.get(key);
    var cx = prev ? prev.x : x;
    var cw = prev ? prev.w : w;
    var paint = function () {
      ind.style.transform = "translateX(" + cx.toFixed(2) + "px) scaleX(" + (cw / 100).toFixed(4) + ")";
    };
    var sx = new Spring(cx, function (v) {
      cx = v;
      paint();
    }, { k: 300, c: 28 });
    var sw = new Spring(cw, function (v) {
      cw = v;
      paint();
    }, { k: 300, c: 28 });
    sx.to(x);
    sw.to(w);
    segMem.set(key, { x: x, w: w });
    // Clicks that do not re-render (local toggles) still glide.
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !seg.contains(b)) return;
      sx.to(b.offsetLeft);
      sw.to(b.offsetWidth);
      segMem.set(key, { x: b.offsetLeft, w: b.offsetWidth });
    });
  }
  function decorateDial(dial) {
    if (dial.dataset.cxDial === "1") return;
    dial.dataset.cxDial = "1";
    var hnd = dial.querySelector("b");
    if (!hnd) return;
    var sp = new Spring(1, function (v) {
      hnd.style.transform = "scale(" + v.toFixed(4) + ")";
    }, { k: 380, c: 18 });
    dial.addEventListener("pointerdown", function () {
      sp.to(1.45);
    });
    var up = function () {
      sp.to(1);
    };
    dial.addEventListener("pointerup", up);
    dial.addEventListener("pointercancel", up);
    dial.addEventListener("pointerleave", up);
  }
  var deco = function (root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(".xseg,.seg").forEach(decorateSeg);
    root.querySelectorAll(".dial").forEach(decorateDial);
    var slide = $id("slide");
    if (slide && !slide.hidden) patchSettings(slide);
  };
  var decoT = 0;
  new MutationObserver(function () {
    cancelAnimationFrame(decoT);
    decoT = requestAnimationFrame(function () {
      deco(document.body);
    });
  }).observe(document.body, { childList: true, subtree: true });
  deco(document.body);
})();
