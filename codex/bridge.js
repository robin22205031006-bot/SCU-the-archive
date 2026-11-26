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
  var SHORT = {
    power: "Power",
    agility: "Agility",
    tactical_iq: "Tactics",
    clan_mastery: "Clan",
    weapon_proficiency: "Weapons",
    wisdom: "Wisdom",
    vitality: "Vitality",
  };
  var NS = "http://www.w3.org/2000/svg";
  /** Items the carousel can show: the character, then each ability, Codex holder rules applied. */
  function profileItems(s) {
    var items = [{ name: "Character", sub: "Whole-character profile", stats: s.stats, key: null }];
    var profs = s.profiles || [];
    var okNames = splitAbilities(
      profs.map(function (p) {
        return p.name;
      }),
    ).show.map(function (x) {
      return x.n;
    });
    var used = {};
    profs.forEach(function (p) {
      if (okNames.indexOf(p.name) < 0) return;
      used[p.name] = 1;
      items.push({ name: p.name, sub: "Ability profile", stats: p.stats, key: findKey(p.name) });
    });
    splitAbilities(s.abilities).show.forEach(function (x) {
      if (used[x.n]) return;
      used[x.n] = 1;
      items.push({ name: x.n, sub: "No profile recorded for this ability", stats: null, key: x.key });
    });
    return items.slice(0, 16);
  }
  function wheelHTML(s) {
    var base = s.stats.length
      ? s.stats
      : s.profiles && s.profiles[0]
        ? s.profiles[0].stats
        : [];
    if (!base.length) return "";
    var n = base.length;
    var R = 100;
    var rings = [25, 50, 75, 100]
      .map(function (r) {
        return '<circle r="' + r + '" class="cxw-ring' + (r === 100 ? " out" : "") + '"/>';
      })
      .join("");
    var spokes = "";
    var petals = "";
    var labels = "";
    base.forEach(function (x, i) {
      var ang = (360 / n) * i;
      var rad = ((ang - 90) * Math.PI) / 180;
      spokes += '<line class="cxw-spoke" x1="0" y1="0" x2="' + (R * Math.cos(rad)).toFixed(1) + '" y2="' + (R * Math.sin(rad)).toFixed(1) + '"/>';
      petals +=
        '<g transform="rotate(' + ang.toFixed(2) + ')" data-k="' + escH(x.key) + '">' +
        '<path class="cxw-petal" d="M0 -22 L 10.5 -52 L 0 -100 L -10.5 -52 Z"/>' +
        '<circle class="cxw-tip" r="3.6" cy="-22"/></g>';
      var lx = 119 * Math.cos(rad);
      var ly = 119 * Math.sin(rad);
      labels +=
        '<text class="cxw-lab" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" dominant-baseline="central">' +
        escH(SHORT[x.key] || String(x.label).split(" ")[0]) + "</text>";
    });
    var items = profileItems(s);
    var gems = items
      .map(function (it, i) {
        var svg = "";
        if (it.key) {
          try {
            svg = typeof emA === "function" ? emA(it.key, 34) : "";
          } catch (e) {
            svg = "";
          }
        }
        if (!svg)
          svg = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7z" fill="currentColor"/></svg>';
        return (
          '<button type="button" class="cxc-i" role="option" data-cxp="' + i + '" aria-selected="' + (i === 0) +
          '" tabindex="' + (i === 0 ? 0 : -1) + '"><span class="cxc-g">' + svg + "</span><small>" + escH(it.name) + "</small></button>"
        );
      })
      .join("");
    return (
      '<div class="cxw" data-n="' + n + '">' +
      '<div class="cxw-stage"><svg class="cxw-svg" viewBox="-140 -140 280 280" role="img" aria-label="Stat wheel">' +
      '<g class="cxw-spin">' + rings + spokes + "</g>" + petals +
      '<circle class="cxw-hub" r="21"/>' + labels +
      '<text class="cxw-avg" x="0" y="-3" text-anchor="middle" dominant-baseline="central">0</text>' +
      '<text class="cxw-avgl" x="0" y="12" text-anchor="middle">INDEX</text></svg></div>' +
      '<div class="cxc"><button type="button" class="cxc-a" data-cxa="-1" aria-label="Previous profile">‹</button>' +
      '<div class="cxc-t" role="listbox" aria-label="Stat profile">' + gems + "</div>" +
      '<button type="button" class="cxc-a" data-cxa="1" aria-label="Next profile">›</button></div>' +
      '<div class="cxc-cap" aria-live="polite"><b>' + escH(items[0].name) + "</b><small>" + escH(items[0].sub) + "</small></div></div>"
    );
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
      (s.stats.length || (s.profiles && s.profiles.length)
        ? '<div class="cxd-sh"><h4>Rune gauges</h4><span class="cxd-pi">Power index <b data-pi="' +
          avg +
          '">' +
          avg +
          "</b></span></div>" +
          wheelHTML(s) +
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
  /** Rune wheel + profile carousel: one selection drives petals, gauges and the index with springs. */
  function wireWheel(panel, season, st) {
    var root = panel.querySelector(".cxw");
    if (!root) return;
    var items = profileItems(season);
    var box = panel.querySelector(".cxd-stats");
    var pi = panel.querySelector("[data-pi]");
    var track = root.querySelector(".cxc-t");
    var cap = root.querySelector(".cxc-cap");
    var avgT = root.querySelector(".cxw-avg");
    var petals = {};
    st.pet = st.pet || {};
    root.querySelectorAll("g[data-k]").forEach(function (g) {
      var k = g.dataset.k;
      var path = g.querySelector(".cxw-petal");
      var tip = g.querySelector(".cxw-tip");
      petals[k] = new Spring(st.pet[k] || 0, function (v) {
        var p = Math.max(0, Math.min(1.08, v / 100));
        path.style.transform = "scale(" + (0.55 + 0.45 * Math.min(1, p)).toFixed(4) + "," + p.toFixed(4) + ")";
        tip.style.transform = "translateY(" + (-78 * p).toFixed(2) + "px)";
        tip.style.opacity = p < 0.02 ? "0" : "1";
      }, { k: 150, c: 17 });
    });
    var cur = 0;
    var avgSp = new Spring(0, function (v) {
      avgT.textContent = String(Math.round(v));
    }, { k: 160, c: 20 });
    var apply = function (idx, focus) {
      cur = idx;
      var it = items[idx];
      var vals = it.stats || null;
      var sum = 0;
      var count = 0;
      Object.keys(petals).forEach(function (k) {
        var m = vals
          ? vals.find(function (x) {
              return x.key === k;
            })
          : null;
        var v = m ? m.value : 0;
        sum += v;
        count++;
        petals[k].to(v);
        st.pet[k] = v;
      });
      var avg = Math.round(sum / Math.max(1, count));
      avgSp.to(avg);
      if (box) {
        box.classList.toggle("prof", idx > 0);
        box.querySelectorAll(".cxg").forEach(function (g) {
          var m = vals
            ? vals.find(function (x) {
                return x.key === g.dataset.k;
              })
            : null;
          var v = m ? m.value : 0;
          if (g._sp) g._sp.to(v);
          st.vals[g.dataset.k] = v;
        });
      }
      if (pi) pi.textContent = String(avg);
      cap.innerHTML = "<b>" + escH(it.name) + "</b><small>" + escH(it.sub) + "</small>";
      root.querySelectorAll(".cxc-i").forEach(function (b, j) {
        b.setAttribute("aria-selected", String(j === idx));
        b.tabIndex = j === idx ? 0 : -1;
        if (j === idx) {
          var left = b.offsetLeft - track.clientWidth / 2 + b.offsetWidth / 2;
          try {
            track.scrollTo({ left: left, behavior: reduced() ? "auto" : "smooth" });
          } catch (e) {
            track.scrollLeft = left;
          }
          if (focus) b.focus({ preventScroll: true });
        }
      });
    };
    root.addEventListener("click", function (e) {
      var a = e.target.closest("[data-cxa]");
      if (a) return apply(Math.max(0, Math.min(items.length - 1, cur + +a.dataset.cxa)), false);
      var b = e.target.closest("[data-cxp]");
      if (b) apply(+b.dataset.cxp, false);
    });
    track.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home") return apply(0, true);
      if (e.key === "End") return apply(items.length - 1, true);
      if (d) {
        e.preventDefault();
        apply(Math.max(0, Math.min(items.length - 1, cur + d)), true);
      }
    });
    // Start from the character profile; keep the carousel hint when there is only one stop.
    var vals0 = items[0].stats;
    var sum0 = 0;
    Object.keys(petals).forEach(function (k) {
      var m = vals0
        ? vals0.find(function (x) {
            return x.key === k;
          })
        : null;
      var v = m ? m.value : 0;
      sum0 += v;
      petals[k].to(v);
      st.pet[k] = v;
    });
    avgSp.to(Math.round(sum0 / Math.max(1, Object.keys(petals).length)));
    if (items.length < 2) root.classList.add("solo");
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
      wireWheel(panel, d.seasons[st.i], st);
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

  /* ---------- 5. portraits, family relations, spoiler-mask notice ---------- */
  var REL_GROUPS = [
    ["Parents", "parent", "in"],
    ["Children", "parent", "out"],
    ["Siblings", "sibling", "both"],
    ["Spouse", "spouse", "both"],
    ["Ancestors", "ancestor", "in"],
    ["Descendants", "ancestor", "out"],
  ];
  function codexNameOf(appName) {
    var map = window.__codexNameMap || {};
    return map[appName] || null;
  }
  function relationsFor(n) {
    var f = feed();
    if (!f || !f.relations || !f.relations.length) return [];
    var out = [];
    REL_GROUPS.forEach(function (g) {
      var seen = {};
      var names = [];
      f.relations.forEach(function (r) {
        if (r.rel !== g[1]) return;
        var a = codexNameOf(r.a);
        var b = codexNameOf(r.b);
        var other = null;
        if (g[2] === "in" && b === n) other = a;
        else if (g[2] === "out" && a === n) other = b;
        else if (g[2] === "both") other = a === n ? b : b === n ? a : null;
        if (other && other !== n && !seen[other]) {
          seen[other] = 1;
          names.push(other);
        }
      });
      if (names.length) out.push({ label: g[0], names: names });
    });
    return out;
  }
  function paintSheetExtras(name) {
    var sheet = $id("sheet");
    if (!sheet || sheet.querySelector(".sealedbox") || sheet.querySelector(".cxrel")) return;
    var f = feed();
    var anchor = sheet.querySelector(".cxd") || sheet.querySelector(".desc");
    if (!anchor) return;
    var html = "";
    var groups = relationsFor(name);
    if (groups.length) {
      html +=
        '<section class="sec cxrel" aria-label="Family"><h4>Family</h4>' +
        groups
          .map(function (g) {
            return (
              '<div class="cxrel-g"><small>' +
              escH(g.label) +
              '</small><div class="chips">' +
              g.names
                .map(function (o) {
                  return (
                    '<button type="button" class="chip" data-cxch="' +
                    escH(o) +
                    '">' +
                    escH(o) +
                    "</button>"
                  );
                })
                .join("") +
              "</div></div>"
            );
          })
          .join("") +
        "</section>";
    }
    if (f && f.masked && (f.masked.characters || f.masked.series) && !sheet.querySelector(".cxmask")) {
      html +=
        '<p class="note cxmask" role="status">Some archive details (status, role, abilities, seasons and family) are hidden by the spoiler mask.</p>';
    }
    if (html) anchor.insertAdjacentHTML("afterend", html);
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-cxch]") : null;
    if (!b) return;
    var n = b.dataset.cxch;
    if (typeof openCharacter === "function") openCharacter(n);
  });
  /** Swap the glyph for the portrait in cast tiles and the sheet header (HTML only, never inside SVG graphs). */
  function swapPortrait(tile, name) {
    var url = window.__codexPortrait && window.__codexPortrait[name];
    if (!url || !tile || tile.dataset.pt === name) return;
    var svg = tile.querySelector("svg.em");
    if (!svg) return;
    var img = document.createElement("img");
    img.className = "cx-pt";
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.src = url;
    svg.replaceWith(img);
    tile.classList.add("has-pt");
    tile.dataset.pt = name;
  }
  function paintPortraits(root) {
    if (!window.__codexPortrait) return;
    root.querySelectorAll("[data-xchar] .tile").forEach(function (t) {
      var host = t.closest("[data-xchar]");
      if (host) swapPortrait(t, host.dataset.xchar);
    });
    var top = root.querySelector("#sheet .sh-top");
    if (top) {
      var h = top.querySelector("h3");
      var t2 = top.querySelector(".tile");
      if (h && t2) swapPortrait(t2, h.textContent.trim());
    }
  }
  if (typeof renderChar === "function") {
    var _rcx2 = renderChar;
    // eslint-disable-next-line no-global-assign
    renderChar = function (n) {
      _rcx2.apply(this, arguments);
      try {
        paintSheetExtras(n);
        paintPortraits(document);
      } catch (e) {
        if (window.console) console.warn("[codex] extras skipped", e);
      }
    };
  }
  var _deco0 = deco;
  deco = function (root) {
    _deco0(root);
    try {
      paintPortraits(root || document);
    } catch (e) {}
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
