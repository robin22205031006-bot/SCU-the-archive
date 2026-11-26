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
  /** Which season the ghost marks compare against: the chosen one, else the previous, else the next. */
  function cmpIndex(d, i, st) {
    if (d.seasons.length < 2) return null;
    if (st && st.cmpTo != null && st.cmpTo !== i && d.seasons[st.cmpTo]) return st.cmpTo;
    return i > 0 ? i - 1 : 1;
  }
  function avgOf(stats) {
    if (!stats || !stats.length) return null;
    var t = 0;
    stats.forEach(function (x) {
      t += x.value;
    });
    return Math.round(t / stats.length);
  }
  /** Ascension line: power index across seasons. Codex-only. */
  function trendHTML(d, i, ci) {
    var pts = d.seasons.map(function (x) {
      return avgOf(x.stats);
    });
    var have = pts.filter(function (v) {
      return v != null;
    }).length;
    if (have < 2) return "";
    var n = d.seasons.length;
    var W = 300;
    var H = 96;
    var px = function (j) {
      return n === 1 ? W / 2 : 18 + (j * (W - 36)) / (n - 1);
    };
    var py = function (v) {
      return H - 18 - (v / 100) * (H - 34);
    };
    var line = [];
    pts.forEach(function (v, j) {
      if (v != null) line.push(px(j).toFixed(1) + "," + py(v).toFixed(1));
    });
    var area = "M" + line[0] + " L" + line.join(" L") + " L" + line[line.length - 1].split(",")[0] + "," + (H - 18) + " L" + line[0].split(",")[0] + "," + (H - 18) + " Z";
    var cur = pts[i] == null ? null : { x: px(i), y: py(pts[i]) };
    return (
      '<div class="cxtr"><div class="cxtr-h"><h4>Ascension line</h4><span>Power index by season</span></div>' +
      '<svg class="cxtr-svg" viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="Power index across seasons">' +
      '<line class="cxtr-base" x1="12" x2="' + (W - 12) + '" y1="' + (H - 18) + '" y2="' + (H - 18) + '"/>' +
      '<path class="cxtr-area" d="' + area + '"/>' +
      '<polyline class="cxtr-line" points="' + line.join(" ") + '"/>' +
      pts
        .map(function (v, j) {
          if (v == null) return "";
          var cls = "cxtr-pt" + (j === ci ? " vs" : "");
          return (
            '<g class="' + cls + '" data-cxtrend="' + j + '" role="button" tabindex="0" aria-label="' +
            escH(d.seasons[j].label) + ", index " + v + '"><circle class="cxtr-hit" cx="' + px(j).toFixed(1) + '" cy="' + py(v).toFixed(1) +
            '" r="14"/><circle class="cxtr-dot" cx="' + px(j).toFixed(1) + '" cy="' + py(v).toFixed(1) + '" r="4"/>' +
            '<text class="cxtr-v" x="' + px(j).toFixed(1) + '" y="' + (py(v) - 9).toFixed(1) + '" text-anchor="middle">' + v + "</text>" +
            '<text class="cxtr-l" x="' + px(j).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + escH(d.seasons[j].label.replace(/^Season\s*/i, "S")) + "</text></g>"
          );
        })
        .join("") +
      (cur
        ? '<g class="cxtr-cur" data-x="' + cur.x.toFixed(1) + '" data-y="' + cur.y.toFixed(1) + '"><rect x="-7" y="-7" width="14" height="14" rx="2" transform="rotate(45)"/></g>'
        : "") +
      "</svg></div>"
    );
  }
  function panelHTML(d, i, cmp) {
    var s = d.seasons[i];
    var stt = dState[curChar] || {};
    var ci = cmpIndex(d, i, stt);
    var prev = ci == null ? null : d.seasons[ci];
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
          (!s.stats.some(function (x) {
            return x.value > 0;
          }) &&
          !(s.profiles || []).some(function (p) {
            return p.stats.some(function (x) {
              return x.value > 0;
            });
          })
            ? '<p class="note cxd-empty" role="status">No stats are recorded for this character yet, so every gauge reads zero. Staff set them in the Nexus dossier, and they appear here at once.</p>'
            : "") +
          wheelHTML(s) +
          '<div class="cxd-stats' +
          (cmp && prev ? " cmp" : "") +
          '">' +
          gauges +
          "</div>" +
          (prev && cmp
            ? '<div class="cxd-vsr"><span>Against</span><div class="xseg cxd-vs" role="group" aria-label="Compare against">' +
              d.seasons
                .map(function (x, j) {
                  if (j === i) return "";
                  return (
                    '<button type="button" data-cxvs="' +
                    j +
                    '" class="' +
                    (j === ci ? "on" : "") +
                    '" aria-pressed="' +
                    (j === ci) +
                    '">' +
                    escH(x.label) +
                    "</button>"
                  );
                })
                .join("") +
              "</div></div>"
            : "") +
          (prev
            ? '<p class="note cxd-cmpn">' +
              (cmp
                ? "Ghost marks show " + escH(prev.series) + " · " + escH(prev.label) + "."
                : "Turn on compare to measure this season against any other.") +
              "</p>"
            : "") +
          trendHTML(d, i, ci)
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
            '<button class="cxr-p" role="tab" type="button" data-key="' +
            escH(s.key) +
            '" data-cxs="' +
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
    var paint = function (dir, quiet) {
      var y0 = window.scrollY;
      panel.innerHTML = panelHTML(d, st.i, st.cmp);
      panel.classList.remove("in-l", "in-r", "in");
      if (!quiet) {
        void panel.offsetWidth;
        panel.classList.add(dir > 0 ? "in-r" : dir < 0 ? "in-l" : "in");
      }
      var cur = panel.querySelector(".cxtr-cur");
      if (cur) {
        var tx = +cur.dataset.x;
        var ty = +cur.dataset.y;
        var fx = st.trX != null ? st.trX : tx;
        var fy = st.trY != null ? st.trY : ty;
        var ox = fx;
        var oy = fy;
        var put = function () {
          cur.style.transform = "translate(" + ox.toFixed(2) + "px," + oy.toFixed(2) + "px)";
        };
        new Spring(fx, function (v) {
          ox = v;
          put();
        }, { k: 190, c: 20 }).to(tx);
        new Spring(fy, function (v) {
          oy = v;
          put();
        }, { k: 190, c: 20 }).to(ty);
        st.trX = tx;
        st.trY = ty;
      }
      if (quiet) window.scrollTo(window.scrollX, y0);
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
        paint(0, true);
      };
    root.addEventListener("click", function (e) {
      var vs = e.target.closest("[data-cxvs]");
      if (vs) {
        st.cmpTo = +vs.dataset.cxvs;
        paint(0, true);
        return;
      }
      var tp = e.target.closest("[data-cxtrend]");
      if (tp) select(+tp.dataset.cxtrend, false);
    });
    root.addEventListener("keydown", function (e) {
      var tp = e.target.closest && e.target.closest("[data-cxtrend]");
      if (tp && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        select(+tp.dataset.cxtrend, false);
      }
    });
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
  function toneOf(st) {
    var t = String(st || "").toLowerCase();
    if (/presum/.test(t)) return "presumed";
    if (/dead|deceased|killed|died/.test(t)) return "dead";
    if (/missing|unknown/.test(t)) return "missing";
    if (/seal/.test(t)) return "sealed";
    if (/retir|inactive/.test(t)) return "retired";
    if (/alive|active|return/.test(t)) return "alive";
    return "other";
  }
  function statusFor(n) {
    var f = feed();
    if (!f || !f.status) return null;
    if (f.status[n]) return f.status[n];
    var map = window.__codexNameMap || {};
    for (var app in map) if (map[app] === n && f.status[app]) return f.status[app];
    return null;
  }
  function statusHTML(n) {
    var tl = statusFor(n);
    if (!tl || !tl.steps || !tl.steps.length) return "";
    var changes = tl.steps.filter(function (x) {
      return x.transition;
    }).length;
    return (
      '<section class="sec cxst" aria-label="Status history"><div class="cxst-h"><h4>Status history</h4><span class="cxst-now tone-' +
      toneOf(tl.current) +
      '"><i></i>Now: ' +
      escH(tl.current || "Unknown") +
      "</span></div>" +
      '<ol class="cxst-chain">' +
      tl.steps
        .map(function (x, i) {
          var tag = x.season ? "button" : "div";
          return (
            "<li class=\"cxst-step tone-" +
            toneOf(x.status) +
            (x.transition ? " chg" : "") +
            '" style="--i:' +
            i +
            '">' +
            (i ? '<span class="cxst-link" aria-hidden="true"></span>' : "") +
            "<" +
            tag +
            ' class="cxst-node"' +
            (x.season ? ' type="button" data-cxseason="' + escH(x.season) + '"' : "") +
            ' title="' +
            escH(x.label) +
            '"><span class="cxst-gem" aria-hidden="true"></span><small>' +
            escH(x.short) +
            "</small><b>" +
            escH(x.status) +
            "</b>" +
            (x.transition && x.from
              ? '<em class="cxst-from">from ' + escH(x.from) + "</em>"
              : "") +
            "</" +
            tag +
            "></li>"
          );
        })
        .join("") +
      "</ol>" +
      '<p class="note">' +
      (changes
        ? changes + " status change" + (changes === 1 ? "" : "s") + " recorded."
        : "No status change recorded.") +
      (tl.steps.some(function (x) {
        return x.season;
      }) && document.querySelector("#sheet .cxd")
        ? " Tap a season to open it in the dossier."
        : "") +
      "</p></section>"
    );
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-cxseason]") : null;
    if (!b) return;
    var pill = document.querySelector('#sheet .cxr-p[data-key="' + CSS.escape(b.dataset.cxseason) + '"]');
    if (!pill) return;
    pill.click();
    var box = document.querySelector("#sheet .cxd");
    if (box) box.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  });
  function paintSheetExtras(name) {
    var sheet = $id("sheet");
    if (!sheet || sheet.querySelector(".sealedbox") || sheet.querySelector(".cxrel,.cxst,.cxmask")) return;
    var f = feed();
    var anchor = sheet.querySelector(".cxd") || sheet.querySelector(".desc");
    if (!anchor) return;
    var html = statusHTML(name);
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

  /* ---------- 6. Bonds orrery (Codex take on the Nexus constellation) ---------- */
  // Codex's own Bloodlines web is the source of truth: blood ties inside, bonds and
  // contracts in the middle, conflicts at the edge (its own type colours).
  var RINGS = [
    { id: 1, label: "Blood" },
    { id: 2, label: "Bonds & contracts" },
    { id: 3, label: "Conflicts" },
  ];
  var BOND_COL = { 1: "#E5544A", 2: "#7FA8DC", 3: "#F2A15A" };
  var TYPE_COL = { blood: "#E5544A", bond: "#7FA8DC", contract: "#B79CFF", conflict: "#F2A15A" };
  var SYM = { Brothers: 1, Siblings: 1, Twins: 1, Married: 1, "Oldest friends": 1, "Fell in love": 1, Sisters: 1, Cousins: 1 };
  var bondsCenter = null;
  var bondsHide = {};
  function ringOfType(t) {
    return t === "blood" ? 1 : t === "conflict" ? 3 : 2;
  }
  /** Archive bond types mapped onto the Codex's four edge types. */
  function typeOfRel(rel) {
    if (/parent|child|sibling|spouse|ancestor|descend|kin|family|brother|sister|mother|father|son|daughter|cousin/.test(rel)) return "blood";
    if (/rival|enemy|nemesis|foe|hunt|betray|kill|conflict/.test(rel)) return "conflict";
    if (/contract|pact|vow|oath/.test(rel)) return "contract";
    return "bond";
  }
  function cxName(app) {
    return codexNameOf(app) || app;
  }
  function sealed(n) {
    try {
      return API && API.stAt && API.stAt(n) === "unseen";
    } catch (e) {
      return false;
    }
  }
  function bondIndex() {
    var adj = {};
    var pairs = {};
    var key = function (a, b) {
      return a < b ? a + "|" + b : b + "|" + a;
    };
    var add = function (edge) {
      if (!edge.a || !edge.b || edge.a === edge.b) return;
      if (sealed(edge.a) || sealed(edge.b)) return;
      (adj[edge.a] = adj[edge.a] || []).push({ n: edge.b, e: edge });
      (adj[edge.b] = adj[edge.b] || []).push({ n: edge.a, e: edge });
    };
    // 1. canon: the Codex Bloodlines web
    try {
      if (typeof BL !== "undefined" && BL && BL.N && BL.E) {
        var byId = {};
        BL.N.forEach(function (n) {
          var c = null;
          try {
            c = typeof castOf === "function" ? castOf(n.n) : null;
          } catch (e) {}
          byId[n.id] = c || n.n;
        });
        BL.E.forEach(function (e) {
          var a = byId[e[0]];
          var b = byId[e[1]];
          if (!a || !b || a === b) return;
          pairs[key(a, b)] = 1;
          add({ a: a, b: b, type: e[2], label: e[3] || "", ring: ringOfType(e[2]), src: "codex" });
        });
      }
    } catch (e) {}
    // 2. archive bonds only where the Codex says nothing about that pair
    var f = feed();
    ((f && f.bonds) || []).forEach(function (b) {
      var a = cxName(b.a);
      var c = cxName(b.b);
      if (!a || !c || a === c || pairs[key(a, c)]) return;
      var t = typeOfRel(b.rel);
      add({ a: a, b: c, type: t, label: b.label ? b.rel + ": " + b.label : b.rel, ring: ringOfType(t), src: "archive" });
    });
    return adj;
  }
  function groupsOf(n) {
    var f = feed();
    return ((f && f.groups) || []).filter(function (g) {
      return g.members.some(function (m) {
        return cxName(m) === n;
      });
    });
  }
  function tileHTML(n, sz) {
    var url = window.__codexPortrait && window.__codexPortrait[n];
    if (url) return '<img class="cx-pt" alt="" decoding="async" src="' + escH(url) + '">';
    try {
      return typeof emC === "function" ? emC(n, sz) : "";
    } catch (e) {
      return "";
    }
  }
  function bondsHTML() {
    var f = feed();
    var adj = bondIndex();
    var names = Object.keys(adj).sort(function (a, b) {
      return adj[b].length - adj[a].length || a.localeCompare(b);
    });
    var total = 0;
    names.forEach(function (n) {
      total += adj[n].length;
    });
    total = Math.round(total / 2);
    var hero = "";
    try {
      hero = heroX(
        {
          c1: "#E48AD0",
          c2: "#FFD3F2",
          id: "balance",
          nm: "Bonds",
          bl: "The Codex Bloodlines web as an orrery: blood ties close in, bonds and contracts in the middle, conflicts at the edge. Archive bonds fill pairs the Codex is silent on. Tap anyone to bring them to the centre.",
          tier: "PEOPLE",
        },
        [
          [total, "bonds"],
          [names.length, "characters"],
          [((f && f.groups) || []).length, "groups"],
        ],
      );
    } catch (e) {
      hero = '<h2 class="xh">Bonds</h2>';
    }
    if (!names.length) {
      return (
        '<div class="xpage">' +
        hero +
        '<div class="empty"><h4>No bonds yet</h4><p>' +
        (f && f.masked && f.masked.characters
          ? "Bonds are hidden by the spoiler mask."
          : "No bonds are open yet. Move the reveal dial forward, or add bonds in the archive.") +
        "</p></div></div>"
      );
    }
    if (!bondsCenter || !adj[bondsCenter]) bondsCenter = names[0];
    var legend = RINGS.slice()
      .sort(function (a, b) {
        return a.id - b.id;
      })
      .map(function (r) {
        var count = adj[bondsCenter].filter(function (x) {
          return x.e.ring === r.id;
        }).length;
        return (
          '<button type="button" class="fc cxo-lg" data-cxring="' +
          r.id +
          '" aria-pressed="' +
          !bondsHide[r.id] +
          '" style="--bc:' +
          BOND_COL[r.id] +
          '"><i></i>' +
          escH(r.label) +
          " <b>" +
          count +
          "</b></button>"
        );
      })
      .join("");
    return (
      '<div class="xpage cxo-page">' +
      hero +
      '<div class="cxo-bar"><label class="sfield"><span>Centre on</span><input class="inp" id="cxoQ" list="cxoL" placeholder="Search a character" autocomplete="off"></label><datalist id="cxoL">' +
      names
        .map(function (n) {
          return '<option value="' + escH(n) + '"></option>';
        })
        .join("") +
      '</datalist><div class="fchips cxo-legend" role="group" aria-label="Bond rings">' +
      legend +
      "</div></div>" +
      '<div class="cxo-wrap"><div class="cxo" id="cxo" role="group" aria-label="Bond orrery"><div class="cxo-ring r1"></div><div class="cxo-ring r2"></div><div class="cxo-ring r3"></div><div class="cxo-links"></div><div class="cxo-nodes"></div></div>' +
      '<aside class="cxo-panel" id="cxoP" aria-live="polite"></aside></div></div>'
    );
  }
  var oNodes = {};
  function layoutBonds(fromName) {
    var stage = $id("cxo");
    if (!stage) return;
    var adj = bondIndex();
    var c = bondsCenter;
    document.querySelectorAll("[data-cxring]").forEach(function (lg) {
      var r = +lg.dataset.cxring;
      var b = lg.querySelector("b");
      if (b)
        b.textContent = String(
          (adj[c] || []).filter(function (x) {
            return x.e.ring === r;
          }).length,
        );
    });
    var list = (adj[c] || []).filter(function (x) {
      return !bondsHide[x.e.ring];
    });
    // one node per neighbour, closest ring wins (blood > bonds > conflicts)
    var best = {};
    list.forEach(function (x) {
      var cur = best[x.n];
      if (!cur || x.e.ring < cur.ring) best[x.n] = { n: x.n, ring: x.e.ring, rel: x.e.label || x.e.type, type: x.e.type };
    });
    var W = stage.clientWidth;
    var R = { 1: W * 0.2, 2: W * 0.32, 3: W * 0.44 };
    var byRing = { 1: [], 2: [], 3: [] };
    Object.keys(best).forEach(function (n) {
      byRing[best[n].ring].push(best[n]);
    });
    var target = {};
    target[c] = { x: 0, y: 0, s: 1, center: true, ring: 0 };
    var overflow = {};
    [1, 2, 3].forEach(function (ring) {
      var arr = byRing[ring].sort(function (a, b) {
        return a.n.localeCompare(b.n);
      });
      var cap = Math.max(4, Math.floor((2 * Math.PI * R[ring]) / 64));
      if (arr.length > cap) {
        overflow[ring] = arr.length - (cap - 1);
        arr = arr.slice(0, cap - 1);
      }
      var off = ring * 0.6;
      var count = arr.length + (overflow[ring] ? 1 : 0);
      arr.forEach(function (x, i) {
        var a = off + (i / Math.max(1, count)) * Math.PI * 2;
        target[x.n] = { x: Math.cos(a) * R[ring], y: Math.sin(a) * R[ring], s: 0.78, ring: ring, rel: x.rel, type: x.type };
      });
      if (overflow[ring]) {
        var a2 = off + (arr.length / count) * Math.PI * 2;
        target["__more" + ring] = { x: Math.cos(a2) * R[ring], y: Math.sin(a2) * R[ring], s: 0.7, ring: ring, more: overflow[ring] };
      }
    });
    var nodesBox = stage.querySelector(".cxo-nodes");
    var start = fromName && oNodes[fromName] ? oNodes[fromName]._pos : { x: 0, y: 0 };
    // leave
    Object.keys(oNodes).forEach(function (n) {
      if (target[n]) return;
      var el = oNodes[n];
      delete oNodes[n];
      el.classList.add("out");
      el.style.transform =
        "translate(" + el._pos.x.toFixed(1) + "px," + el._pos.y.toFixed(1) + "px) scale(.4)";
      setTimeout(function () {
        el.remove();
      }, reduced() ? 0 : 420);
    });
    // enter / move
    Object.keys(target).forEach(function (n, idx) {
      var t = target[n];
      var el = oNodes[n];
      if (!el) {
        el = document.createElement("button");
        el.type = "button";
        el.className = "cxo-n";
        if (t.more) {
          el.innerHTML = '<span class="cxo-t more">+' + t.more + "</span><small>more</small>";
          el.dataset.cxomore = String(t.ring);
        } else {
          el.innerHTML = '<span class="cxo-t ch">' + tileHTML(n, 30) + "</span><small>" + escH(n) + "</small>";
          el.dataset.cxon = n;
        }
        el._pos = { x: start.x, y: start.y };
        el.style.transform = "translate(" + start.x + "px," + start.y + "px) scale(.3)";
        el.style.opacity = "0";
        nodesBox.appendChild(el);
        oNodes[n] = el;
        void el.offsetWidth;
      }
      el.classList.toggle("ctr", !!t.center);
      el.style.setProperty("--bc", t.center ? "var(--c1)" : TYPE_COL[t.type] || BOND_COL[t.ring] || "var(--c1)");
      el.style.setProperty("--d", Math.min(idx * 18, 360) + "ms");
      el.setAttribute(
        "aria-label",
        t.center ? n + ", centre" : t.more ? t.more + " more in this ring" : n + ", " + (t.rel || "bond"),
      );
      el._pos = { x: t.x, y: t.y };
      el.style.opacity = "1";
      el.style.transform =
        "translate(" + t.x.toFixed(1) + "px," + t.y.toFixed(1) + "px) scale(" + (t.center ? 1.45 : t.s) + ")";
    });
    // spokes: transform-only lines from the centre
    var links = stage.querySelector(".cxo-links");
    links.innerHTML = Object.keys(target)
      .filter(function (n) {
        return !target[n].center;
      })
      .map(function (n, i) {
        var t = target[n];
        var len = Math.hypot(t.x, t.y);
        var ang = (Math.atan2(t.y, t.x) * 180) / Math.PI;
        return (
          '<i style="--bc:' +
          (TYPE_COL[t.type] || BOND_COL[t.ring] || "var(--c1)") +
          ";--len:" +
          len.toFixed(1) +
          ";--ang:" +
          ang.toFixed(2) +
          "deg;--d:" +
          Math.min(i * 18, 360) +
          'ms"></i>'
        );
      })
      .join("");
    paintBondPanel();
  }
  function paintBondPanel() {
    var p = $id("cxoP");
    if (!p) return;
    var n = bondsCenter;
    var adj = bondIndex();
    var row = typeof castRow === "function" ? castRow(n) : [n, "", ""];
    var groups = groupsOf(n);
    var byRing = {};
    (adj[n] || []).forEach(function (x) {
      (byRing[x.e.ring] = byRing[x.e.ring] || []).push(x);
    });
    p.innerHTML =
      '<div class="cxo-ph"><span class="tile ch">' +
      tileHTML(n, 42) +
      "</span><div><h3>" +
      escH(n) +
      "</h3>" +
      (row[2] ? "<p>" + escH(row[2]) + "</p>" : "") +
      "</div></div>" +
      (groups.length
        ? '<div class="sec"><h4>Member of</h4><div class="chips">' +
          groups
            .map(function (g) {
              return '<span class="chip"><i class="dot" style="background:var(--c1)"></i>' + escH(g.name) + " <small>" + escH(g.kind) + "</small></span>";
            })
            .join("") +
          "</div></div>"
        : "") +
      [1, 2, 3]
        .filter(function (r) {
          return byRing[r];
        })
        .map(function (r) {
          var label = RINGS.find(function (x) {
            return x.id === r;
          }).label;
          return (
            '<div class="sec"><h4>' +
            escH(label) +
            '</h4><ul class="cxo-bl">' +
            byRing[r]
              .map(function (x) {
                var e = x.e;
                var sym = SYM[e.label];
                var who = function (nm) {
                  return nm === n
                    ? "<b>" + escH(nm) + "</b>"
                    : '<button type="button" class="nmb" data-cxon="' + escH(nm) + '">' + escH(nm) + "</button>";
                };
                var line = sym
                  ? who(e.a) + " &amp; " + who(e.b) + ": " + escH(e.label)
                  : who(e.a) + " → " + who(e.b) + (e.label ? ": " + escH(e.label) : "");
                return (
                  '<li style="--bc:' +
                  (TYPE_COL[e.type] || BOND_COL[r]) +
                  '">' +
                  line +
                  '<small class="cxo-src">' +
                  escH(e.type) +
                  (e.src === "archive" ? " · from the archive" : "") +
                  "</small></li>"
                );
              })
              .join("") +
            "</ul></div>"
          );
        })
        .join("") +
      '<div class="row"><button type="button" class="btn" data-cxodossier="' +
      escH(n) +
      '">Open dossier</button></div>';
  }
  function mountBonds() {
    var stage = $id("cxo");
    if (!stage) return;
    oNodes = {};
    layoutBonds(null);
    var q = $id("cxoQ");
    if (q)
      q.addEventListener("change", function () {
        var adj = bondIndex();
        var v = q.value.trim();
        var hit = Object.keys(adj).find(function (n) {
          return n.toLowerCase() === v.toLowerCase();
        });
        if (hit) {
          bondsCenter = hit;
          layoutBonds(null);
          q.value = "";
        }
      });
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var node = t.closest("[data-cxon]");
    if (node && $id("cxo")) {
      var n = node.dataset.cxon;
      if (n === bondsCenter) return;
      var from = n;
      bondsCenter = n;
      layoutBonds(from);
      return;
    }
    var more = t.closest("[data-cxomore]");
    if (more) {
      var p = $id("cxoP");
      if (p) p.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "nearest" });
      return;
    }
    var lg = t.closest("[data-cxring]");
    if (lg) {
      var r = +lg.dataset.cxring;
      bondsHide[r] = !bondsHide[r];
      lg.setAttribute("aria-pressed", String(!bondsHide[r]));
      layoutBonds(null);
      return;
    }
    var dz = t.closest("[data-cxodossier]");
    if (dz && typeof openCharacter === "function") openCharacter(dz.dataset.cxodossier);
  });
  /** App-only destination reached through history (back button, reload, saved link). */
  function hostPageHTML(id) {
    var n =
      (API &&
        API.NT.find(function (m) {
          return m[0] === id;
        })) ||
      [id, id];
    var hero = "";
    try {
      hero = heroX(
        { c1: "#93B6FF", c2: "#DCE7FF", id: "balance", nm: n[1], bl: "This page lives in the app. Your place in the Codex is kept.", tier: "OPENS IN THE APP" },
        [],
      );
    } catch (e) {
      hero = "<h2>" + escH(n[1]) + "</h2>";
    }
    return (
      '<div class="xpage">' +
      hero +
      '<div class="row" style="justify-content:center"><button type="button" class="btn" data-cxopen="' +
      escH(HOSTP[id]) +
      '">Open ' +
      escH(n[1]) +
      '</button><button type="button" class="btn ghost" data-nt="home">Back to the Codex home</button></div></div>'
    );
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-cxopen]") : null;
    if (b && H) {
      try {
        H.navigate(b.dataset.cxopen);
      } catch (err) {}
    }
  });
  if (H && H.badge) document.documentElement.classList.add("cx-badge");
  if (typeof viewHTML === "function") {
    var _vhx = viewHTML;
    // eslint-disable-next-line no-global-assign
    viewHTML = function () {
      if (tab === "bonds") return bondsHTML();
      if (H && HOSTP[tab]) return hostPageHTML(tab);
      return _vhx.apply(this, arguments);
    };
  }
  if (typeof render === "function") {
    var _rbx = render;
    // eslint-disable-next-line no-global-assign
    render = function () {
      _rbx.apply(this, arguments);
      if (tab === "bonds") {
        try {
          mountBonds();
        } catch (e) {
          if (window.console) console.warn("[codex] bonds skipped", e);
        }
      }
    };
  }
  // Codex's first render ran before this bridge loaded: redraw if it opened on Bonds.
  try {
    if (tab === "bonds" || (H && HOSTP[tab])) render();
  } catch (e) {}
  window.addEventListener("resize", function () {
    if (tab !== "bonds") return;
    clearTimeout(window.__cxoRz);
    window.__cxoRz = setTimeout(function () {
      layoutBonds(null);
    }, 200);
  });

  /* ---------- 7. ability ranks (I-V) on every ability chip ---------- */
  function appNamesOf(n) {
    var map = window.__codexNameMap || {};
    var out = [n];
    for (var app in map) if (map[app] === n && out.indexOf(app) < 0) out.push(app);
    return out;
  }
  function ranksOf(n) {
    var f = feed();
    if (!f || !f.ranks) return null;
    var names = appNamesOf(n);
    for (var i = 0; i < names.length; i++) if (f.ranks[names[i]]) return f.ranks[names[i]];
    return null;
  }
  function rankIn(map, ability) {
    if (!map) return 0;
    if (map[ability]) return map[ability];
    var nz = window.__codexNorm || function (x) {
      return String(x).toLowerCase();
    };
    var want = nz(ability);
    for (var k in map) if (nz(k) === want) return map[k];
    return 0;
  }
  function rankBadge(r) {
    var f = feed();
    var meta = (f && f.rankMeta && f.rankMeta[r - 1]) || { roman: String(r), title: "", color: "var(--c1)" };
    return (
      '<span class="cx-rk rk' + r + '" style="--rk:' + escH(meta.color) + '" title="Rank ' + escH(meta.roman) + (meta.title ? " · " + escH(meta.title) : "") +
      '" aria-label="Rank ' + escH(meta.roman) + '"><i aria-hidden="true"></i>' + escH(meta.roman) + "</span>"
    );
  }
  function paintRanks() {
    var sheet = $id("sheet");
    if (!sheet || sheet.hidden) return;
    var h = sheet.querySelector(".sh-top h3");
    if (!h) return;
    var rk = ranksOf(h.textContent.trim());
    if (!rk) return;
    var pill = sheet.querySelector('.cxr-p[aria-selected="true"]');
    var sk = pill ? pill.dataset.key : null;
    var seasonMap = sk && rk.seasons ? rk.seasons[sk] : null;
    sheet.querySelectorAll(".chip[data-go], .cxd-ab, .cxc-i").forEach(function (c) {
      if (c.dataset.rk) return;
      var inSeason = !!c.closest(".cxd");
      var label = c.classList.contains("cxc-i") ? (c.querySelector("small") || {}).textContent : c.textContent;
      label = String(label || "").trim();
      if (!label || label === "Character") {
        c.dataset.rk = "0";
        return;
      }
      var r = inSeason ? rankIn(seasonMap, label) || rankIn(rk.base, label) : rankIn(rk.base, label);
      c.dataset.rk = String(r || 0);
      if (!r) return;
      if (c.classList.contains("cxc-i")) {
        var g = c.querySelector(".cxc-g");
        if (g) g.insertAdjacentHTML("afterend", rankBadge(r));
      } else c.insertAdjacentHTML("beforeend", rankBadge(r));
    });
  }
  var _deco1 = deco;
  deco = function (root) {
    _deco1(root);
    try {
      paintRanks();
    } catch (e) {}
  };

  /* ---------- 8. full-screen detail pages: a close button that is always reachable ---------- */
  function paintClose() {
    var sheet = $id("sheet");
    if (!sheet || sheet.hidden || sheet.querySelector(".cx-close")) return;
    sheet.insertAdjacentHTML(
      "afterbegin",
      '<button type="button" class="cx-close" aria-label="Close details" data-tip="Close">×</button>',
    );
  }
  document.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest(".cx-close")) {
      try {
        closeSheet();
      } catch (err) {}
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var sheet = $id("sheet");
    var modal = $id("modal");
    if (sheet && !sheet.hidden && (!modal || modal.hidden)) {
      try {
        closeSheet();
      } catch (err) {}
    }
  });
  var _deco2 = deco;
  deco = function (root) {
    _deco2(root);
    try {
      paintClose();
    } catch (e) {}
  };

  /* ---------- 9. premium Codex navigation: gliding gem, magnetic dock, sigil, fan, flow ---------- */
  (function navFx() {
    var dock = $id("dock");
    if (!dock) return;
    var gem = document.createElement("span");
    gem.className = "cx-navgem";
    gem.setAttribute("aria-hidden", "true");
    document.body.appendChild(gem);
    var gx = 0, gy = 0, gw = 0, gh = 0, gshow = 0;
    var put = function () {
      gem.style.transform =
        "translate(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px) scale(" + (gw / 100).toFixed(4) + "," + (gh / 100).toFixed(4) + ")";
      gem.style.opacity = String(gshow);
    };
    var sx = new Spring(0, function (v) { gx = v; put(); }, { k: 230, c: 22 });
    var sy = new Spring(0, function (v) { gy = v; put(); }, { k: 230, c: 22 });
    var sw = new Spring(0, function (v) { gw = v; put(); }, { k: 260, c: 24 });
    var sh = new Spring(0, function (v) { gh = v; put(); }, { k: 260, c: 24 });
    var first = true;
    function placeGem() {
      var on = dock.querySelector('.dk[aria-current="true"]') || dock.querySelector(".dk.sig");
      if (!on || !dock.getClientRects().length || getComputedStyle(dock).display === "none") {
        gshow = 0;
        put();
        return;
      }
      var r = on.getBoundingClientRect();
      var pad = 4;
      var tx = r.left - pad, ty = r.top - pad, tw = r.width + pad * 2, th = r.height + pad * 2;
      gshow = 1;
      if (first || reduced()) {
        first = false;
        sx.x = gx = tx; sy.x = gy = ty; sw.x = gw = tw; sh.x = gh = th;
        sx.to(tx); sy.to(ty); sw.to(tw); sh.to(th);
        put();
        return;
      }
      sx.to(tx); sy.to(ty); sw.to(tw); sh.to(th);
    }
    function decorateDock() {
      var sig = dock.querySelector(".dk.sig");
      if (sig && !sig.querySelector(".cx-sigrings")) {
        sig.insertAdjacentHTML(
          "afterbegin",
          '<span class="cx-sigrings" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="r1" cx="50" cy="50" r="44"/><circle class="r2" cx="50" cy="50" r="36"/><path class="tk" d="M50 2 L53 9 L47 9Z M50 98 L53 91 L47 91Z M2 50 L9 47 L9 53Z M98 50 L91 47 L91 53Z"/></svg></span>',
        );
      }
      placeGem();
    }
    function fanRibbon() {
      var rib = $id("rib");
      if (!rib || rib.hidden || rib.dataset.cxFan === rib.innerHTML.length + "") return;
      rib.dataset.cxFan = rib.innerHTML.length + "";
      var items = rib.querySelectorAll(".rb");
      var n = items.length;
      var vertical = window.matchMedia("(min-width:768px)").matches;
      items.forEach(function (it, i) {
        var o = i - (n - 1) / 2;
        it.style.setProperty("--i", String(i));
        it.style.setProperty("--fx", vertical ? (o * o * 2.2).toFixed(1) + "px" : "0px");
        it.style.setProperty("--fy", vertical ? "0px" : (o * o * 1.6).toFixed(1) + "px");
        it.style.setProperty("--fr", vertical ? "0deg" : (o * 1.2).toFixed(2) + "deg");
      });
      rib.classList.remove("cx-fan");
      void rib.offsetWidth;
      rib.classList.add("cx-fan");
    }
    new MutationObserver(function () {
      requestAnimationFrame(function () {
        decorateDock();
        fanRibbon();
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-current"] });
    window.addEventListener("resize", function () {
      first = true;
      placeGem();
    });
    decorateDock();

    // magnetic lean toward the pointer (mouse/pen only, never on touch)
    var hoverable = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    if (hoverable) {
      dock.addEventListener("pointermove", function (e) {
        if (reduced()) return;
        dock.querySelectorAll(".dk").forEach(function (b) {
          var r = b.getBoundingClientRect();
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var dx = e.clientX - cx, dy = e.clientY - cy;
          var d = Math.hypot(dx, dy);
          var t = Math.max(0, 1 - d / 140);
          b.style.transform = "translate(" + (dx * 0.08 * t).toFixed(2) + "px," + (dy * 0.08 * t).toFixed(2) + "px) scale(" + (1 + 0.22 * t).toFixed(3) + ")";
        });
      });
      dock.addEventListener("pointerleave", function () {
        dock.querySelectorAll(".dk").forEach(function (b) {
          b.style.transform = "";
        });
      });
    }

    // tap ripple on dock and ribbon buttons
    document.addEventListener("pointerdown", function (e) {
      var b = e.target && e.target.closest ? e.target.closest(".dk,.rb") : null;
      if (!b || reduced()) return;
      var r = b.getBoundingClientRect();
      var rp = document.createElement("span");
      rp.className = "cx-ripple";
      rp.style.left = e.clientX - r.left + "px";
      rp.style.top = e.clientY - r.top + "px";
      b.appendChild(rp);
      setTimeout(function () {
        rp.remove();
      }, 700);
      if (b.classList.contains("sig")) {
        b.classList.remove("cx-burst");
        void b.offsetWidth;
        b.classList.add("cx-burst");
      }
    });

    // flow transition: the page slides the way you travelled, with an ink sweep
    var sweep = document.createElement("span");
    sweep.className = "cx-sweep";
    sweep.setAttribute("aria-hidden", "true");
    document.body.appendChild(sweep);
    var order = function (id) {
      return API ? API.NT.findIndex(function (m) { return m[5] === id || m[0] === id; }) : 0;
    };
    var lastTab = typeof tab !== "undefined" ? tab : "";
    if (typeof render === "function") {
      var _rflow = render;
      // eslint-disable-next-line no-global-assign
      render = function () {
        var prev = lastTab;
        _rflow.apply(this, arguments);
        if (typeof tab === "undefined" || tab === prev) return;
        lastTab = tab;
        if (reduced()) return;
        var dir = order(tab) >= order(prev) ? "r" : "l";
        var view = $id("view");
        if (view) {
          view.classList.remove("cx-flow-r", "cx-flow-l", "iris");
          void view.offsetWidth;
          view.classList.add("cx-flow-" + dir);
        }
        sweep.classList.remove("go-r", "go-l");
        void sweep.offsetWidth;
        sweep.classList.add("go-" + dir);
      };
    }
  })();
  // One pass per frame at most, and never postponed by spring counters ticking.
  var decoPending = false;
  var TICKERS = ".cxg-v,.cxw-avg,[data-pi]";
  new MutationObserver(function (records) {
    if (decoPending) return;
    var real = records.some(function (r) {
      var t = r.target && r.target.nodeType === 1 ? r.target : r.target && r.target.parentElement;
      return !(t && t.closest && t.closest(TICKERS));
    });
    if (!real) return;
    decoPending = true;
    requestAnimationFrame(function () {
      decoPending = false;
      deco(document.body);
    });
  }).observe(document.body, { childList: true, subtree: true });
  deco(document.body);
})();
