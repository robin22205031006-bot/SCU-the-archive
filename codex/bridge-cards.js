/* Codex cards: flowing character banners, category frames and element ability bars.
 * Codex-only presentation. Colours default to each character's main ability branch;
 * admins change looks with the pencil on any card (saved to app_settings codex_cards
 * through the host, so every admin sees the same). Lore is never changed here, except
 * the rank control, which uses the host's checked archive write.
 * Motion is transform/opacity only, pauses off screen and honours motion-off and
 * reduced-motion. */
(function () {
  "use strict";
  var doc = document;
  var $id = function (id) {
    return doc.getElementById(id);
  };
  var escC = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function host() {
    try {
      return window.parent !== window ? window.parent.__SCU_CODEX_HOST__ || null : null;
    } catch (e) {
      return null;
    }
  }
  var LS = "scu-codex-cards";
  var local = null;
  function blank() {
    return { chars: {}, abilities: {}, tiers: {} };
  }
  function cards() {
    if (local) return local;
    var h = host();
    if (h && h.cards) return h.cards;
    if (!h) {
      try {
        local = JSON.parse(localStorage.getItem(LS) || "null") || blank();
      } catch (e) {
        local = blank();
      }
      return local;
    }
    return blank();
  }
  function canEdit() {
    var h = host();
    if (h) return !!h.admin && !doc.body.classList.contains("reader");
    try {
      var api = window.__codexApi || {};
      return !!(api.isAdm && api.isAdm());
    } catch (e) {
      return false;
    }
  }
  function motionOff() {
    return (
      doc.documentElement.dataset.motion === "off" ||
      (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)
    );
  }

  /* ---------- data: element, colours, style, frame ---------- */
  var BR_EL = {
    aether: "aether", judgement: "judgement", sun: "sun", moon: "moon", balance: "order", time: "time",
    order: "order", chaos: "chaos", mind: "mind", space: "space", curse: "curse", fire: "fire",
    water: "water", earth: "earth", air: "wind", lightning: "lightning", light: "light", shadow: "shadow",
    life: "nature", beast: "beast", venom: "venom", blood: "blood", arcane: "arcane", energy: "energy",
    resonance: "sound", assassin: "blade", soldier: "blade", blade: "blade", seal: "seal", tech: "tech",
    guardian: "guardian",
  };
  var GD_EL = { sky: "wind", nature: "nature", air: "wind", water: "water", fire: "fire", earth: "earth", lightning: "lightning" };
  var NAME_EL = [
    [/ice|frost|snow|cryo|glacier/i, "ice"], [/wind|gale|aero|air\b|sky|storm/i, "wind"], [/fire|flame|blaze|pyro|ember|inferno/i, "fire"],
    [/water|tide|hydro|wave|sea\b/i, "water"], [/lightning|thunder|volt|electr/i, "lightning"], [/earth|stone|rock|terra|geo/i, "earth"],
    [/shadow|dark|umbra|night/i, "shadow"], [/light|radian|holy|lumin/i, "light"], [/blood|hemo|vampir/i, "blood"],
    [/venom|poison|toxin/i, "venom"], [/beast|wolf|dragon|serpent|animal/i, "beast"], [/nature|plant|vine|life|heal/i, "nature"],
    [/time|chrono/i, "time"], [/space|portal|void|dimension/i, "space"], [/mind|dream|psych|telepath/i, "mind"],
    [/curse|hex|seal/i, "curse"], [/sound|resonan|sonic|song/i, "sound"], [/blade|sword|assassin|combat|martial/i, "blade"],
    [/tech|serum|cyber/i, "tech"], [/arcane|magic|spell|rune/i, "arcane"], [/energy|force|power/i, "energy"],
  ];
  var EL_STYLE = {
    wind: "gale", fire: "ember", blood: "ember", chaos: "ember", water: "tide", ice: "tide", nature: "verdant",
    earth: "verdant", beast: "verdant", venom: "verdant", light: "prism", energy: "prism", order: "prism",
    lightning: "storm", shadow: "umbra", curse: "umbra", sound: "bloom", sun: "bloom", mind: "fae", moon: "fae",
    space: "astral", time: "astral", arcane: "astral", aether: "astral", judgement: "regal", guardian: "regal",
    blade: "steel", seal: "steel", tech: "steel",
  };
  var STYLE_NAME = {
    verdant: "Verdant bokeh", prism: "Prism rays", ember: "Ember stars", tide: "Tide bubbles", bloom: "Bloom petals",
    fae: "Fae wings", astral: "Astral night", regal: "Regal crown", gale: "Gale streams", storm: "Storm arcs",
    umbra: "Umbra smoke", steel: "Steel sparks",
  };
  var STYLES = Object.keys(STYLE_NAME);
  var ELEMENTS = [
    "wind", "fire", "water", "ice", "earth", "lightning", "light", "shadow", "nature", "beast", "venom", "blood",
    "arcane", "energy", "sound", "aether", "judgement", "sun", "moon", "time", "space", "mind", "curse", "chaos",
    "order", "blade", "seal", "tech", "guardian",
  ];
  var FRAME_NAME = ["Hairline", "Bronze", "Silver", "Gold and ruby", "Jade and amethyst", "Violet orbs", "Emerald and gold", "Sapphire and gold", "Guardian crest"];
  /* Codex tree tiers and archive tiers share one ladder; Guardians have their own crest. */
  var TIER_FRAME = {
    Skills: 1, Primary: 2, Exceptional: 4, Laws: 5, Godly: 7, Bloodline: 5, Bloodlines: 5,
    Standard: 1, Rare: 2, Unique: 3, Ancient: 5, Legendary: 6, Mythic: 7, Role: 8, Guardian: 8,
  };
  function tierFrame(tier) {
    var t = cards().tiers || {};
    if (t[tier] != null) return t[tier];
    return TIER_FRAME[tier] != null ? TIER_FRAME[tier] : 2;
  }
  function safeInfo(k) {
    try {
      return info(k);
    } catch (e) {
      return null;
    }
  }
  function elementOfInfo(i) {
    if (!i) return "energy";
    var g = i.gr || {};
    if (i.br.id === "guardian") return GD_EL[g.gd] || "guardian";
    if (BR_EL[i.br.id]) {
      var nm = i.name || "";
      if (/ice|frost|cryo|snow/i.test(nm)) return "ice";
      return BR_EL[i.br.id];
    }
    var txt = (i.name || "") + " " + (i.br.nm || "");
    for (var j = 0; j < NAME_EL.length; j++) if (NAME_EL[j][0].test(txt)) return NAME_EL[j][1];
    return "energy";
  }
  function colorsOfInfo(i) {
    if (!i) return ["#9db4ff", "#eef2ff"];
    var g = (i.leaf && i.leaf.gc) || (i.gr && i.gr.gc);
    return g ? [g[0], g[1]] : [i.br.c1, i.br.c2];
  }
  /* A character's main ability: the rarest canon hold outside the Guardians (a role, not a power). */
  function mainKey(n) {
    var hold = (typeof HOLD !== "undefined" && HOLD[n]) || [];
    var list = hold.slice().sort(function (a, b) {
      return a.n - b.n;
    });
    for (var j = 0; j < list.length; j++) {
      var i = safeInfo(list[j].k);
      if (i && i.br.id !== "guardian") return list[j].k;
    }
    if (list.length) return list[0].k;
    try {
      var mine = mineKeys(n);
      if (mine.length) return mine[0];
    } catch (e) {}
    return null;
  }
  function charFrameAuto(n) {
    var hold = (typeof HOLD !== "undefined" && HOLD[n]) || [];
    var best = -1;
    var guard = false;
    hold.forEach(function (h) {
      var i = safeInfo(h.k);
      if (!i) return;
      if (i.br.id === "guardian") guard = true;
      best = Math.max(best, tierFrame(i.br.tier));
    });
    if (guard) return tierFrame("Guardian");
    return best < 0 ? 0 : best;
  }
  function lookOfChar(n) {
    var o = (cards().chars || {})[n] || {};
    var k = mainKey(n);
    var i = k ? safeInfo(k) : null;
    var el = o.element || (i ? elementOfInfo(i) : "energy");
    var col = i ? colorsOfInfo(i) : null;
    if (!col) {
      try {
        var g = (GCOL && GCOL[castRow(n)[5]]) || "#cfc8ba";
        col = [g, "#f4efe6"];
      } catch (e) {
        col = ["#cfc8ba", "#f4efe6"];
      }
    }
    return {
      style: o.style || EL_STYLE[el] || "prism",
      c1: o.c1 || col[0],
      c2: o.c2 || col[1],
      element: el,
      frame: o.frame != null ? o.frame : charFrameAuto(n),
      main: i ? i.name : "",
      mainKey: k,
      custom: !!(o.style || o.c1 || o.c2 || o.element || o.frame != null),
    };
  }
  function lookOfAbility(k, who) {
    var i = safeInfo(k);
    var name = i ? i.name : "";
    var o = (cards().abilities || {})[name] || {};
    var col = colorsOfInfo(i);
    /* A character's own colour wins inside their card (Ethan's green wind vs a blue wind guardian). */
    if (who) {
      var co = (cards().chars || {})[who] || {};
      if (mainKey(who) === k && (co.c1 || co.c2)) col = [co.c1 || col[0], co.c2 || col[1]];
    }
    return {
      c1: o.c1 || col[0],
      c2: o.c2 || col[1],
      element: o.element || elementOfInfo(i),
      frame: o.frame != null ? o.frame : i ? (i.br.id === "guardian" ? tierFrame("Guardian") : tierFrame(i.br.tier)) : 2,
      tier: i ? (i.br.id === "guardian" ? "Guardian" : i.br.tier) : "",
      name: name,
    };
  }

  /* ---------- art: element ornaments for the bar heads (picture 3) ---------- */
  var ORN = {
    wind: '<path d="M4 15c6 0 9-3 9-6s-2-4-4-4-3 2-2 3"/><path d="M2 20c9 0 14-2 17-6"/><path d="M8 25c6 0 10 1 13-3"/>',
    fire: '<path d="M14 27c-6 0-9-4-8-9 1-4 4-5 4-10 3 2 5 5 5 8 1-2 2-3 2-5 3 3 5 6 4 10-1 4-3 6-7 6z"/><path d="M14 27c-2 0-4-2-3-5 1-2 3-3 3-5 2 2 3 4 3 6 0 2-1 4-3 4z"/>',
    water: '<path d="M3 16c3-3 6-3 9 0s6 3 9 0 6-3 7 0"/><path d="M5 22c3-3 6-3 9 0s6 3 9 0"/><circle cx="21" cy="8" r="2"/><circle cx="25" cy="12" r="1.2"/>',
    ice: '<path d="M14 3v24M5 8l18 14M23 8 5 22"/><path d="M11 5l3 3 3-3M11 25l3-3 3 3"/>',
    earth: '<path d="M4 25l6-14 5 6 4-9 6 17z"/><path d="M10 11l2 5M19 8l1 6"/>',
    lightning: '<path d="M17 2 7 16h7l-3 12 11-16h-7z"/>',
    light: '<circle cx="14" cy="15" r="5"/><path d="M14 3v4M14 23v4M2 15h4M22 15h4M6 7l3 3M19 20l3 3M22 7l-3 3M9 20l-3 3"/>',
    shadow: '<path d="M22 6a10 10 0 1 0 0 18 8 8 0 0 1 0-18z"/><path d="M5 25c3-2 4-6 3-9"/>',
    nature: '<path d="M5 25C5 13 13 5 25 5c0 12-8 20-20 20z"/><path d="M5 25 18 12"/>',
    beast: '<path d="M4 20c3-8 9-13 17-13l4-4v7c0 7-5 12-12 12H4z"/><circle cx="18" cy="12" r="1.4"/><path d="M8 22l3-4M12 23l2-4"/>',
    venom: '<path d="M14 3c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z"/><path d="M11 18c0 2 1 4 3 4"/>',
    blood: '<path d="M14 3c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z"/><circle cx="11" cy="18" r="1.6"/>',
    arcane: '<circle cx="14" cy="15" r="10"/><path d="M14 5l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
    energy: '<circle cx="14" cy="15" r="4"/><circle cx="14" cy="15" r="9" stroke-dasharray="3 3"/><path d="M14 2v4M14 24v4"/>',
    sound: '<path d="M6 11v8M10 7v16M14 4v22M18 8v14M22 11v8"/>',
    aether: '<path d="M14 2l3 10 10 3-10 3-3 10-3-10-10-3 10-3z"/><circle cx="14" cy="15" r="3"/>',
    judgement: '<circle cx="14" cy="15" r="6"/><circle cx="14" cy="15" r="2"/><path d="M2 15c4-6 8-8 12-8s8 2 12 8c-4 6-8 8-12 8S6 21 2 15z"/>',
    sun: '<circle cx="14" cy="15" r="6"/><path d="M14 2v5M14 23v5M1 15h5M22 15h5M5 6l3 3M20 21l3 3M23 6l-3 3M8 21l-3 3"/>',
    moon: '<path d="M20 4a11 11 0 1 0 4 18A9 9 0 0 1 20 4z"/><path d="M22 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
    time: '<circle cx="14" cy="15" r="10"/><path d="M14 9v6l4 3"/><path d="M9 3h10"/>',
    space: '<ellipse cx="14" cy="15" rx="12" ry="5"/><circle cx="14" cy="15" r="4"/><circle cx="24" cy="9" r="1.2"/>',
    mind: '<path d="M8 22c-4-2-5-7-2-11 2-4 7-6 11-4 4 1 6 6 4 10l-3 2v4h-6v-3z"/><path d="M12 12c1-2 4-2 5 0"/>',
    curse: '<path d="M14 3l10 6v12l-10 6-10-6V9z"/><path d="M9 12l10 6M19 12 9 18"/>',
    chaos: '<path d="M14 2v24M2 14h24M6 6l16 16M22 6 6 22"/><circle cx="14" cy="14" r="3"/>',
    order: '<rect x="6" y="7" width="16" height="16" rx="1" transform="rotate(45 14 15)"/><circle cx="14" cy="15" r="3"/>',
    blade: '<path d="M4 26 22 6l3-1-1 3L6 26z"/><path d="M8 20l2 2M3 23l4 4"/>',
    seal: '<circle cx="14" cy="15" r="10"/><circle cx="14" cy="15" r="6"/><path d="M14 5v4M14 21v4M4 15h4M20 15h4"/>',
    tech: '<circle cx="14" cy="15" r="4"/><path d="M14 4v4M14 22v4M3 15h4M21 15h4M6 7l3 3M19 20l3 3M22 7l-3 3M9 20l-3 3"/>',
    guardian: '<path d="M14 3l10 4v7c0 7-4 11-10 13C8 25 4 21 4 14V7z"/><path d="M14 9v10M9 14h10"/>',
  };
  function ornSVG(el, cls) {
    return (
      '<svg class="' + (cls || "cxa-orn") + '" viewBox="0 0 28 30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ORN[el] || ORN.energy) + "</svg>"
    );
  }

  /* ---------- art: category frames (picture 2), drawn as SVG at any width ---------- */
  var FPAL = [
    { a: "#8a7f6a", b: "#3b352b", gem: null },
    { a: "#e0a066", b: "#7a3f16", gem: null },
    { a: "#f1f4f7", b: "#6f7882", gem: "#dfe8f2" },
    { a: "#ffd27a", b: "#8a5a12", gem: "#e0263a" },
    { a: "#7cf0dc", b: "#0f6b63", gem: "#a855f7" },
    { a: "#b4a8ff", b: "#3b2f8f", gem: "#a5f3fc" },
    { a: "#f5d58a", b: "#7a5a18", gem: "#22c55e", crystal: "#34d399" },
    { a: "#f5d58a", b: "#7a5a18", gem: "#38bdf8", crystal: "#60a5fa" },
  ];
  var fid = 0;
  function frameSVG(level, c1, c2) {
    level = Math.max(0, Math.min(8, level | 0));
    var guard = level === 8;
    var p = guard ? { a: "#f5d58a", b: "#7a5a18", gem: c1, crystal: c1 } : FPAL[level];
    var id = "cxf" + ++fid;
    var W = 400, cy = 20;
    var th = [1, 2.2, 2.6, 3.4, 3.8, 4.2, 4.6, 5][guard ? 7 : level];
    var span = [130, 150, 160, 175, 182, 188, 192, 194][guard ? 7 : level];
    var s = '<svg class="cxf" viewBox="0 0 400 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="' + p.a + '"/><stop offset="1" stop-color="' + p.b + '"/></linearGradient>' +
      '<linearGradient id="' + id + 's" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + id + 'r"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="' + (p.gem || p.a) + '"/><stop offset="1" stop-color="' + (p.gem || p.a) + '" stop-opacity=".6"/></radialGradient>' +
      '<clipPath id="' + id + 'c">';
    var body = "";
    if (level === 0) {
      body = '<path d="M' + (200 - span) + " " + cy + "H" + (200 + span) + '" stroke="url(#' + id + 'g)" stroke-width="1.2"/><path d="M196 ' + cy + "l4-3 4 3-4 3z" + '" fill="' + p.a + '"/>';
      s += '<rect x="60" y="17" width="280" height="6"/>';
    } else {
      /* two blades with stepped ends meeting at a centre notch */
      var y0 = cy - th / 2, y1 = cy + th / 2, L = 200 - span, R = 200 + span;
      var notch = 10 + level * 2;
      var blades =
        "M" + L + " " + cy + "L" + (L + 8) + " " + y0 + "H" + (200 - notch) + "L200 " + (y1 + 4 + level) + "L" + (200 + notch) + " " + y0 + "H" + (R - 8) + "L" + R + " " + cy + "L" + (R - 8) + " " + y1 + "H" + (200 + notch + 2) + "L200 " + (y1 + 7 + level) + "L" + (200 - notch - 2) + " " + y1 + "H" + (L + 8) + "Z";
      body += '<path d="' + blades + '" fill="url(#' + id + 'g)" stroke="' + p.b + '" stroke-width=".6"/>';
      if (level >= 3) {
        /* raised segments, like the gold and jade frames */
        var segs = [[L + 22, 200 - notch - 30], [200 + notch + 30, R - 22]];
        segs.forEach(function (sg) {
          body += '<path d="M' + sg[0] + " " + (y0 - 2) + "H" + sg[1] + "l-4 " + (th + 4) + "H" + (sg[0] + 4) + 'z" fill="url(#' + id + 'g)" stroke="' + p.b + '" stroke-width=".6" opacity=".95"/>';
        });
      }
      if (level >= 4) {
        /* swept wings under the centre */
        var wc = guard ? c2 || p.a : level === 4 ? p.gem : p.crystal || p.a;
        body += '<path d="M184 ' + (cy + 1) + "L200 " + (cy + 15 + level) + "L216 " + (cy + 1) + "L200 " + (cy + 6) + 'z" fill="' + wc + '" opacity=".9"/>';
        if (level >= 6) {
          for (var f = 0; f < 4; f++) {
            var dx = 6 + f * 7;
            body += '<path d="M' + (200 - dx) + " " + (cy + 2) + "L" + (200 - dx - 4) + " " + (cy + 12 + level - f * 2) + "L" + (200 - dx + 4) + " " + (cy + 4) + 'z" fill="' + wc + '" opacity="' + (0.85 - f * 0.15) + '"/>' +
              '<path d="M' + (200 + dx) + " " + (cy + 2) + "L" + (200 + dx + 4) + " " + (cy + 12 + level - f * 2) + "L" + (200 + dx - 4) + " " + (cy + 4) + 'z" fill="' + wc + '" opacity="' + (0.85 - f * 0.15) + '"/>';
          }
        }
      }
      if (level >= 5) {
        /* top fins */
        body += '<path d="M178 ' + (y0 + 1) + "Q190 " + (cy - 14) + " 200 " + (cy - 12) + "Q210 " + (cy - 14) + " 222 " + (y0 + 1) + 'z" fill="url(#' + id + 'g)" stroke="' + p.b + '" stroke-width=".6"/>';
      }
      if (guard) {
        body += '<path d="M200 ' + (cy - 15) + "l10 4v6c0 6-4 9-10 11-6-2-10-5-10-11v-6z" + '" fill="url(#' + id + 'g)" stroke="' + p.b + '" stroke-width=".8"/>' +
          '<path d="M200 ' + (cy - 11) + "l6 2.6v4c0 4-2.6 6-6 7.4-3.4-1.4-6-3.4-6-7.4v-4z" + '" fill="' + c1 + '"/>' +
          '<path d="M186 ' + (cy - 4) + "C176 " + (cy - 14) + " 164 " + (cy - 12) + " 156 " + (cy - 6) + "C166 " + (cy - 6) + " 176 " + (cy - 2) + ' 186 2z" fill="url(#' + id + 'g)" opacity=".9"/>' +
          '<path d="M214 ' + (cy - 4) + "C224 " + (cy - 14) + " 236 " + (cy - 12) + " 244 " + (cy - 6) + "C234 " + (cy - 6) + " 224 " + (cy - 2) + ' 214 2z" fill="url(#' + id + 'g)" opacity=".9"/>';
      }
      /* gems */
      if (p.gem) {
        var gr = 2.6 + level * 0.45;
        if (level === 2) body += '<path class="cxf-gem" d="M200 ' + (cy - 5) + "l4 5-4 5-4-5z" + '" fill="url(#' + id + 'r)"/>';
        else if (!guard) body += '<circle class="cxf-gem" cx="200" cy="' + (level >= 5 ? cy - 3 : cy + 1) + '" r="' + gr + '" fill="url(#' + id + 'r)" stroke="' + p.b + '" stroke-width=".8"/>';
        if (level >= 5) {
          [L + 40, R - 40].forEach(function (x) {
            body += '<circle cx="' + x + '" cy="' + cy + '" r="' + (gr + 2.5) + '" fill="url(#' + id + 'g)" stroke="' + p.b + '" stroke-width=".6"/><circle class="cxf-gem" cx="' + x + '" cy="' + cy + '" r="' + (gr - 0.3) + '" fill="url(#' + id + 'r)"/>';
          });
        } else if (level >= 2) {
          [L + 16, R - 16].forEach(function (x) {
            body += '<path d="M' + x + " " + (cy - 3.5) + "l3.5 3.5-3.5 3.5-3.5-3.5z" + '" fill="' + p.a + '" stroke="' + p.b + '" stroke-width=".5"/>';
          });
        }
      }
      s += '<path d="' + blades + '"/>';
    }
    s += "</clipPath></defs>" + body;
    if (level >= 1) s += '<g clip-path="url(#' + id + 'c)"><rect class="cxf-sheen" x="-60" y="0" width="60" height="40" fill="url(#' + id + 's)"/></g>';
    return s + "</svg>";
  }

  /* ---------- art: banner decorations per style (picture 1) ---------- */
  var DECOR = {
    verdant: "",
    prism: '<path d="M60 0 30 60M90 0 70 60M120 0 110 60M150 0 150 60" stroke="#fff" stroke-opacity=".18" stroke-width="10"/>',
    ember: '<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"><path d="M150 10l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/><path d="M118 30l2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6z"/></g><g stroke="#fff" stroke-opacity=".45" stroke-width="1.4"><path d="M120 60c0-10 4-18 8-22M126 60c0-8 2-14 6-20M134 60c0-12 6-20 10-24M142 60c0-8 4-12 8-16M150 60c0-10-2-16-6-22"/></g>',
    tide: '<g fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"><path d="M20 44a10 10 0 0 1 20 0 10 10 0 0 1 20 0 10 10 0 0 1 20 0 10 10 0 0 1 20 0"/><path d="M30 54a10 10 0 0 1 20 0 10 10 0 0 1 20 0 10 10 0 0 1 20 0"/></g>',
    bloom: '<g fill="#fff" fill-opacity=".75"><path d="M140 14c-8-10-18-4-12 6 2 4 8 6 12 4-2 6 2 12 8 10 8-2 4-14-8-20z"/><path d="M160 34c-5-6-11-2-7 4 1 2 5 4 7 2-1 4 1 7 5 6 5-1 2-8-5-12z" fill-opacity=".55"/></g>',
    fae: '<path d="M120 6c18 2 34 10 46 26-14-6-30-6-42-2 6-6 6-14-4-24z" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-opacity=".4"/><path d="M150 12c3-4 9-1 6 3l-3 3-3-3c-3-4 3-7 6-3" fill="#fff" fill-opacity=".6"/>',
    astral: '<g stroke="#fff" stroke-opacity=".45" stroke-width=".8" fill="#fff"><path d="M40 40 70 26 100 34 130 18" fill="none"/><circle cx="40" cy="40" r="1.6"/><circle cx="70" cy="26" r="1.6"/><circle cx="100" cy="34" r="1.6"/><circle cx="130" cy="18" r="1.6"/></g><path d="M156 12a12 12 0 1 0 6 22 10 10 0 0 1-6-22z" fill="#fff" fill-opacity=".8"/>',
    regal: '<g fill="#fff" fill-opacity=".22"><circle cx="120" cy="30" r="20"/></g><g stroke="#fff" stroke-opacity=".35" fill="none"><circle cx="120" cy="30" r="14"/><path d="M106 30h28M120 16v28M110 20l20 20M130 20l-20 20"/></g>',
    gale: '<g fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"><path d="M70 22c20-6 40-6 60 0s30 2 36-6c2 8-6 12-14 10"/><path d="M50 36c26-4 50-2 80 4"/><path d="M90 48c16-2 30-2 44 2"/></g><path d="M150 40c4-6 12-6 14 0-6 2-10 2-14 0z" fill="#fff" fill-opacity=".6"/>',
    storm: '<g fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" stroke-linejoin="round"><path d="M130 4l-10 20h10l-8 18"/><path d="M160 10l-6 12h6l-5 12" stroke-opacity=".4"/></g>',
    umbra: '<path d="M110 8c10 4 18 10 22 18 6-8 16-12 28-12-6 6-8 14-6 22-8-6-18-8-26-4-2-10-8-18-18-24z" fill="#000" fill-opacity=".35" stroke="#fff" stroke-opacity=".25"/>',
    steel: '<g stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"><path d="M118 46 150 10M150 46 118 10"/><path d="M114 42l8 8M146 42l8 8" stroke-opacity=".3"/></g>',
  };
  var RINGX = {
    regal: '<svg class="cxb-x top" viewBox="0 0 40 24" aria-hidden="true"><path d="M4 22 2 6l10 8 8-12 8 12 10-8-2 16z" fill="#ffd36b" stroke="#a8761c" stroke-width="1"/><circle cx="20" cy="2.6" r="2" fill="#ff5d7a"/></svg>',
    astral: '<svg class="cxb-x wing" viewBox="0 0 80 30" aria-hidden="true"><path d="M2 14 22 4l-4 10 4 10zM78 14 58 4l4 10-4 10z" fill="#ffd36b" stroke="#a8761c" stroke-width=".8"/></svg>',
    fae: '<svg class="cxb-x top" viewBox="0 0 40 24" aria-hidden="true"><path d="M20 22c0-8 4-14 10-16-4 4-4 8-2 10M20 22c0-8-4-14-10-16 4 4 4 8 2 10" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.4" stroke-linecap="round"/></svg>',
    bloom: '<svg class="cxb-x bot" viewBox="0 0 40 16" aria-hidden="true"><g fill="#ff8a5c"><circle cx="12" cy="8" r="5"/><circle cx="22" cy="10" r="4"/></g><g fill="#ffd0a8"><circle cx="12" cy="8" r="2"/><circle cx="22" cy="10" r="1.6"/></g></svg>',
    tide: '<svg class="cxb-x side" viewBox="0 0 24 40" aria-hidden="true"><g fill="none" stroke="#fff" stroke-opacity=".8"><circle cx="8" cy="8" r="5"/><circle cx="16" cy="22" r="3"/><circle cx="6" cy="32" r="2"/></g></svg>',
  };
  var PCOUNT = 7;
  function particles(style, big) {
    var n = big ? 12 : PCOUNT;
    var s = "";
    for (var i = 0; i < n; i++) {
      var r = (Math.sin((i + 1) * 12.9898 + style.length * 78.233) * 43758.5453) % 1;
      r = Math.abs(r);
      var x = 30 + ((i * 53) % 60) + r * 8;
      var y = 12 + ((i * 37) % 76);
      var sz = 0.6 + ((i * 7) % 5) * 0.22 + r * 0.4;
      var d = -(i * 0.83 + r * 2).toFixed(2);
      var t = (3.2 + ((i * 5) % 4) * 0.7 + r).toFixed(2);
      s += '<span style="--x:' + x.toFixed(1) + "%;--y:" + y + "%;--s:" + sz.toFixed(2) + ";--d:" + d + "s;--t:" + t + 's"></span>';
    }
    return '<span class="cxb-fx" aria-hidden="true">' + s + "</span>";
  }
  function bannerLayers(look, big) {
    return (
      '<span class="cxb-bg" aria-hidden="true"><span class="cxb-gloss"></span>' +
      '<svg class="cxb-decor" viewBox="0 0 170 60" preserveAspectRatio="xMaxYMid meet" fill="none">' + (DECOR[look.style] || "") + "</svg>" +
      particles(look.style, big) + "</span>"
    );
  }
  function styleVars(look) {
    return "--b1:" + look.c1 + ";--b2:" + look.c2;
  }
  function pen(kind, key, label) {
    return (
      '<span class="cxe-pen" role="button" tabindex="0" data-cxe="' + kind + '" data-cxek="' + escC(key) + '" aria-label="Edit ' + escC(label) + '" title="Edit card">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></span>'
    );
  }
  function bladeHTML(lk, label) {
    return (
      '<span class="cxa-blade" style="--a1:' + lk.c1 + ";--a2:" + lk.c2 + '" aria-hidden="true">' + ornSVG(lk.element) +
      '<span class="cxa-bar"><span class="cxa-flow"></span></span><span class="cxa-sp"><span></span><span></span><span></span><span></span></span></span>'
    );
  }

  /* ---------- painting ---------- */
  var io = null;
  function watch(el) {
    if (!("IntersectionObserver" in window)) {
      el.classList.add("cx-live");
      return;
    }
    if (!io)
      io = new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            e.target.classList.toggle("cx-live", e.isIntersecting);
          });
        },
        { rootMargin: "80px" },
      );
    io.observe(el);
  }
  function paintCastRow(row) {
    var n = row.dataset.xchar;
    if (!n) return;
    var lk = lookOfChar(n);
    var sig = lk.style + lk.c1 + lk.c2 + lk.element + lk.frame + (canEdit() ? 1 : 0);
    if (row.dataset.cxb === sig) return;
    row.dataset.cxb = sig;
    row.classList.add("cxb");
    row.setAttribute("data-sty", lk.style);
    row.style.setProperty("--b1", lk.c1);
    row.style.setProperty("--b2", lk.c2);
    var inner = row.querySelector(".in") || row;
    inner.querySelectorAll(".cxb-bg,.cxb-x,.cxe-pen,.cxb-ring").forEach(function (x) {
      x.remove();
    });
    inner.insertAdjacentHTML("afterbegin", bannerLayers(lk, false));
    var tile = inner.querySelector(".tile");
    if (tile) {
      tile.insertAdjacentHTML("beforeend", '<span class="cxb-ring" aria-hidden="true"></span>' + (RINGX[lk.style] || ""));
    }
    if (canEdit()) inner.insertAdjacentHTML("beforeend", pen("char", n, n));
    watch(row);
  }
  function paintAbilityRow(row) {
    var k = row.dataset.k;
    if (!k) return;
    var lk = lookOfAbility(k);
    var sig = lk.c1 + lk.c2 + lk.element + (canEdit() ? 1 : 0);
    if (row.dataset.cxa === sig) return;
    row.dataset.cxa = sig;
    row.classList.add("cxa");
    var gt = row.querySelector(".gt") || row;
    row.querySelectorAll(".cxa-blade,.cxe-pen").forEach(function (x) {
      x.remove();
    });
    var b = gt.querySelector("b");
    if (b) b.insertAdjacentHTML("afterend", bladeHTML(lk, lk.name));
    else gt.insertAdjacentHTML("beforeend", bladeHTML(lk, lk.name));
    if (canEdit()) (row.querySelector(".in") || row).insertAdjacentHTML("beforeend", pen("ab", k, lk.name));
    watch(row);
  }
  function paintHero(hero) {
    var t = hero.querySelector(".tier");
    if (!t) return;
    var tier = t.textContent.trim();
    var c1 = getComputedStyle(hero).getPropertyValue("--c1").trim() || "#ffd27a";
    var c2 = getComputedStyle(hero).getPropertyValue("--c2").trim() || "#fff";
    var isG = /guardian/i.test(tier);
    var lv = tierFrame(isG ? "Guardian" : tier);
    var sig = tier + lv + c1;
    if (hero.dataset.cxf === sig) return;
    hero.dataset.cxf = sig;
    hero.querySelectorAll(".cxf-wrap").forEach(function (x) {
      x.remove();
    });
    t.insertAdjacentHTML("afterend", '<span class="cxf-wrap cxf-hero" data-lv="' + lv + '" title="' + escC(tier + " · " + FRAME_NAME[lv] + " frame") + '">' + frameSVG(lv, c1, c2) + "</span>");
  }
  function paintSheet() {
    var sheet = $id("sheet");
    if (!sheet || sheet.hidden) return;
    var top = sheet.querySelector(".sh-top");
    if (!top) return;
    var h = top.querySelector("h3");
    var name = h ? h.textContent.trim() : "";
    var isChar = false;
    try {
      isChar = !!name && (CASTN.indexOf(name) >= 0 || (S.custom || []).indexOf(name) >= 0);
    } catch (e) {}
    var k = !isChar && typeof selK !== "undefined" && selK && safeInfo(selK) && safeInfo(selK).name === name ? selK : null;
    if (!isChar && !k) return;
    var sig = (isChar ? "c" : "a") + name + JSON.stringify(isChar ? (cards().chars || {})[name] || {} : (cards().abilities || {})[name] || {}) + (canEdit() ? 1 : 0);
    if (top.dataset.cxs === sig) return;
    top.dataset.cxs = sig;
    sheet.querySelectorAll(".cxs-head,.cxs-main,.cxe-pen").forEach(function (x) {
      x.remove();
    });
    top.classList.add("cxs-top");
    if (isChar) {
      var lk = lookOfChar(name);
      top.classList.add("cxb", "cxb-big");
      top.setAttribute("data-sty", lk.style);
      top.style.setProperty("--b1", lk.c1);
      top.style.setProperty("--b2", lk.c2);
      top.querySelectorAll(".cxb-bg,.cxb-ring,.cxb-x").forEach(function (x) {
        x.remove();
      });
      top.insertAdjacentHTML("afterbegin", bannerLayers(lk, true));
      var tile = top.querySelector(".tile");
      if (tile) tile.insertAdjacentHTML("beforeend", '<span class="cxb-ring" aria-hidden="true"></span>' + (RINGX[lk.style] || ""));
      if (canEdit()) top.insertAdjacentHTML("beforeend", pen("char", name, name));
      var frame = '<div class="cxs-head"><span class="cxf-wrap" data-lv="' + lk.frame + '" title="' + escC(FRAME_NAME[lk.frame] + " frame") + '">' + frameSVG(lk.frame, lk.c1, lk.c2) + "</span></div>";
      top.insertAdjacentHTML("afterend", frame);
      if (lk.mainKey) {
        var al = lookOfAbility(lk.mainKey, name);
        var main = '<button type="button" class="cxs-main" data-cxgo="' + escC(lk.mainKey) + '" style="--a1:' + al.c1 + ";--a2:" + al.c2 + '"><small>Main ability</small><b>' + escC(lk.main) + "</b>" + bladeHTML(al, lk.main) + "</button>";
        sheet.querySelector(".cxs-head").insertAdjacentHTML("afterend", main);
      }
      watch(top);
    } else {
      var a = lookOfAbility(k);
      if (canEdit()) top.insertAdjacentHTML("beforeend", pen("ab", k, a.name));
      top.insertAdjacentHTML(
        "afterend",
        '<div class="cxs-head"><span class="cxf-wrap" data-lv="' + a.frame + '" title="' + escC((a.tier ? a.tier + " · " : "") + FRAME_NAME[a.frame] + " frame") + '">' + frameSVG(a.frame, a.c1, a.c2) + '</span><div class="cxs-ab" style="--a1:' + a.c1 + ";--a2:" + a.c2 + '">' + bladeHTML(a, a.name) + "</div></div>",
      );
      watch(sheet.querySelector(".cxs-head"));
    }
  }
  function paintAll() {
    try {
      doc.querySelectorAll(".xgh.ch[data-xchar]").forEach(paintCastRow);
      doc.querySelectorAll(".gh.ch[data-k]").forEach(paintAbilityRow);
      var hero = $id("hero");
      if (hero) paintHero(hero);
      paintSheet();
    } catch (e) {}
  }
  function repaint() {
    doc.querySelectorAll("[data-cxb],[data-cxa],[data-cxf],[data-cxs]").forEach(function (el) {
      delete el.dataset.cxb;
      delete el.dataset.cxa;
      delete el.dataset.cxf;
      delete el.dataset.cxs;
    });
    paintAll();
  }
  window.__codexCardsUpdate = function () {
    local = null;
    repaint();
  };
  var pending = false;
  new MutationObserver(function (recs) {
    if (pending) return;
    var real = recs.some(function (r) {
      var t = r.target && r.target.nodeType === 1 ? r.target : r.target && r.target.parentElement;
      return !(t && t.closest && t.closest(".cxb-bg,.cxa-blade,.cxf-wrap,.cxe,.cxs-head,.cxs-main,.cxe-pen"));
    });
    if (!real) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      paintAll();
    });
  }).observe(doc.body, { childList: true, subtree: true });

  /* ---------- admin editor (pencil) ---------- */
  var draft = null;
  function closeEditor() {
    var el = $id("cxe");
    if (el) {
      el.dataset.open = "false";
      setTimeout(function () {
        el.remove();
      }, 260);
    }
    draft = null;
  }
  function selectHTML(id, label, opts, val) {
    return (
      '<label class="cxe-f"><span>' + label + '</span><select id="' + id + '" class="inp">' +
      opts.map(function (o) {
        return '<option value="' + escC(o[0]) + '"' + (String(val) === String(o[0]) ? " selected" : "") + ">" + escC(o[1]) + "</option>";
      }).join("") + "</select></label>"
    );
  }
  function rankNow(name, ability) {
    try {
      var f = window.__codexFeed;
      if (!f || !f.ranks) return 0;
      var map = window.__codexNameMap || {};
      var names = [name];
      for (var a in map) if (map[a] === name) names.push(a);
      var nz = window.__codexNorm || function (x) {
        return String(x).toLowerCase();
      };
      for (var i = 0; i < names.length; i++) {
        var r = f.ranks[names[i]];
        if (!r || !r.base) continue;
        for (var k in r.base) if (nz(k) === nz(ability)) return r.base[k];
      }
    } catch (e) {}
    return 0;
  }
  function previewHTML() {
    var d = draft;
    if (d.kind === "char") {
      var auto = lookOfChar(d.key);
      var lk = {
        style: d.look.style || auto.style, c1: d.look.c1 || auto.c1, c2: d.look.c2 || auto.c2,
        element: d.look.element || auto.element, frame: d.look.frame != null ? d.look.frame : auto.frame,
      };
      return (
        '<div class="cxe-prev"><div class="xgh ch cxb cx-live" data-sty="' + lk.style + '" style="' + styleVars(lk) + '"><span class="in ch">' + bannerLayers(lk, false) +
        '<span class="tile ch">' + (function () {
          try {
            return emC(d.key, 34);
          } catch (e) {
            return "";
          }
        })() + '<span class="cxb-ring"></span>' + (RINGX[lk.style] || "") + '</span><span class="gt"><b>' + escC(d.key) + "</b><i>" + escC(STYLE_NAME[lk.style]) + "</i></span></span></div>" +
        '<span class="cxf-wrap cx-live" data-lv="' + lk.frame + '">' + frameSVG(lk.frame, lk.c1, lk.c2) + "</span>" +
        (auto.mainKey ? '<div class="cxs-ab cx-live">' + bladeHTML({ c1: lk.c1, c2: lk.c2, element: lk.element }, auto.main) + "</div>" : "") + "</div>"
      );
    }
    var a = lookOfAbility(d.key);
    var la = { c1: d.look.c1 || a.c1, c2: d.look.c2 || a.c2, element: d.look.element || a.element };
    var fr = d.look.frame != null ? d.look.frame : a.frame;
    return '<div class="cxe-prev"><span class="cxf-wrap cx-live" data-lv="' + fr + '">' + frameSVG(fr, la.c1, la.c2) + '</span><div class="cxs-ab cx-live"><b class="cxe-an">' + escC(a.name) + "</b>" + bladeHTML(la, a.name) + "</div></div>";
  }
  function openEditor(kind, key) {
    if (!canEdit()) return;
    closeEditor();
    var c = cards();
    var isChar = kind === "char";
    var name = isChar ? key : (safeInfo(key) || {}).name || key;
    var stored = isChar ? (c.chars || {})[name] : (c.abilities || {})[name];
    draft = { kind: kind, key: key, name: name, look: Object.assign({}, stored || {}) };
    var auto = isChar ? lookOfChar(name) : lookOfAbility(key);
    var tier = isChar ? "" : auto.tier;
    var styleBtns = isChar
      ? '<div class="cxe-f"><span>Card style</span><div class="cxe-sty" role="radiogroup" aria-label="Card style"><button type="button" class="cxe-s" data-cxs="" aria-pressed="' + !draft.look.style + '">Auto<small>' + escC(STYLE_NAME[auto.style]) + "</small></button>" +
        STYLES.map(function (s) {
          return '<button type="button" class="cxe-s" data-cxs="' + s + '" data-sty="' + s + '" aria-pressed="' + (draft.look.style === s) + '"><i></i>' + escC(STYLE_NAME[s]) + "</button>";
        }).join("") + "</div></div>"
      : "";
    var els = [["", "Auto (" + auto.element + ")"]].concat(ELEMENTS.map(function (e) {
      return [e, e.charAt(0).toUpperCase() + e.slice(1)];
    }));
    var frames = [["", "Auto (" + FRAME_NAME[isChar ? charFrameAuto(name) : auto.frame] + ")"]].concat(FRAME_NAME.map(function (f, i) {
      return [String(i), f];
    }));
    var rankRow = "";
    if (isChar && auto.mainKey && host() && host().saveAbilityRank) {
      var r = rankNow(name, auto.main);
      rankRow = selectHTML("cxeRk", "Main ability power: " + escC(auto.main), [["", r ? "Rank " + r + " (now)" : "Not ranked"]].concat([1, 2, 3, 4, 5].map(function (x) {
        return [String(x), "Rank " + ["I", "II", "III", "IV", "V"][x - 1]];
      })), "");
    }
    var tierRow = !isChar && tier
      ? selectHTML("cxeTier", "Frame for every " + escC(tier) + " ability", [["", "Keep (" + FRAME_NAME[tierFrame(tier)] + ")"]].concat(FRAME_NAME.map(function (f, i) {
          return [String(i), f];
        })), "")
      : "";
    var el = doc.createElement("div");
    el.id = "cxe";
    el.className = "cxe";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "cxeT");
    el.innerHTML =
      '<div class="cxe-card"><button type="button" class="cxe-x" aria-label="Close">×</button>' +
      '<h3 id="cxeT">' + (isChar ? "Card look" : "Ability look") + " · " + escC(name) + "</h3>" +
      '<p class="cxe-sub">Saved for everyone in the Codex. Colours start from the ' + (isChar ? "character’s main ability" : "ability’s branch") + ".</p>" +
      '<div id="cxePrev">' + previewHTML() + "</div>" + styleBtns +
      '<div class="cxe-row"><label class="cxe-f cxe-c"><span>Main colour</span><input type="color" id="cxeC1" value="' + escC(draft.look.c1 || auto.c1) + '"></label>' +
      '<label class="cxe-f cxe-c"><span>Glow colour</span><input type="color" id="cxeC2" value="' + escC(draft.look.c2 || auto.c2) + '"></label>' +
      '<button type="button" class="btn ghost cxe-rc" id="cxeRc">Use ability colours</button></div>' +
      '<div class="cxe-row">' + selectHTML("cxeEl", "Element", els, draft.look.element || "") + selectHTML("cxeFr", isChar ? "Category frame" : "Frame", frames, draft.look.frame != null ? draft.look.frame : "") + "</div>" +
      rankRow + tierRow +
      '<p class="cxe-msg" id="cxeMsg" role="status"></p>' +
      '<div class="row cxe-acts"><button type="button" class="btn" id="cxeSave">Save</button>' +
      (isChar ? '<button type="button" class="btn ghost" id="cxeDet">Edit details</button>' : "") +
      '<button type="button" class="btn ghost" id="cxeReset">Reset to auto</button></div></div>';
    doc.body.appendChild(el);
    void el.offsetWidth;
    el.dataset.open = "true";
    var refresh = function () {
      $id("cxePrev").innerHTML = previewHTML();
    };
    el.addEventListener("click", function (e) {
      var t = e.target;
      if (t === el || t.closest(".cxe-x")) return closeEditor();
      var sb = t.closest(".cxe-s");
      if (sb) {
        draft.look.style = sb.dataset.cxs || undefined;
        el.querySelectorAll(".cxe-s").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === sb));
        });
        refresh();
      }
    });
    $id("cxeC1").oninput = function () {
      draft.look.c1 = this.value;
      refresh();
    };
    $id("cxeC2").oninput = function () {
      draft.look.c2 = this.value;
      refresh();
    };
    $id("cxeRc").onclick = function () {
      delete draft.look.c1;
      delete draft.look.c2;
      var a2 = isChar ? lookOfChar(name) : lookOfAbility(key);
      var base = isChar ? colorsOfInfo(a2.mainKey ? safeInfo(a2.mainKey) : null) : colorsOfInfo(safeInfo(key));
      $id("cxeC1").value = base[0].length === 7 ? base[0] : "#9db4ff";
      $id("cxeC2").value = base[1].length === 7 ? base[1] : "#eef2ff";
      refresh();
    };
    $id("cxeEl").onchange = function () {
      draft.look.element = this.value || undefined;
      refresh();
    };
    $id("cxeFr").onchange = function () {
      draft.look.frame = this.value === "" ? undefined : +this.value;
      refresh();
    };
    $id("cxeReset").onclick = function () {
      draft.look = {};
      save(true);
    };
    var det = $id("cxeDet");
    if (det)
      det.onclick = function () {
        closeEditor();
        try {
          (window.__codexApi || {}).editChar(name);
        } catch (e) {}
      };
    $id("cxeSave").onclick = function () {
      save(false);
    };
    setTimeout(function () {
      var f = el.querySelector(".cxe-s[aria-pressed=true]") || $id("cxeC1");
      if (f) f.focus();
    }, 30);
  }
  function msg(t, bad) {
    var m = $id("cxeMsg");
    if (m) {
      m.textContent = t;
      m.classList.toggle("bad", !!bad);
    }
  }
  function save(reset) {
    if (!draft) return;
    var c = JSON.parse(JSON.stringify(cards()));
    c.chars = c.chars || {};
    c.abilities = c.abilities || {};
    c.tiers = c.tiers || {};
    var isChar = draft.kind === "char";
    var look = {};
    ["style", "c1", "c2", "element", "frame"].forEach(function (k) {
      if (draft.look[k] != null && draft.look[k] !== "") look[k] = draft.look[k];
    });
    if (!isChar) delete look.style;
    var map = isChar ? c.chars : c.abilities;
    if (reset || !Object.keys(look).length) delete map[draft.name];
    else map[draft.name] = look;
    var tierSel = $id("cxeTier");
    var tier = !isChar ? lookOfAbility(draft.key).tier : "";
    if (!reset && tierSel && tierSel.value !== "" && tier) c.tiers[tier] = +tierSel.value;
    var rk = $id("cxeRk");
    var rankWant = !reset && rk && rk.value ? +rk.value : 0;
    var btn = $id("cxeSave");
    if (btn) btn.disabled = true;
    msg("Saving…");
    var h = host();
    var name = draft.name;
    var mainAb = isChar ? lookOfChar(name).main : "";
    var done = function (ok, text) {
      if (btn) btn.disabled = false;
      if (!ok) return msg(text || "Could not save.", true);
      closeEditor();
      repaint();
      try {
        var t = doc.createElement("div");
        t.className = "cxe-toast";
        t.setAttribute("role", "status");
        t.textContent = text || "Saved.";
        doc.body.appendChild(t);
        setTimeout(function () {
          t.remove();
        }, 3200);
      } catch (e) {}
    };
    if (!h) {
      local = c;
      try {
        localStorage.setItem(LS, JSON.stringify(c));
      } catch (e) {}
      return done(true, "Card look saved on this device.");
    }
    if (!h.saveCards) return done(false, "This app version cannot save card looks yet.");
    h.saveCards(c).then(function (res) {
      if (!res || !res.ok) return done(false, (res && res.message) || "Could not save.");
      local = res.cards || c;
      if (!rankWant) return done(true, res.message);
      return h.saveAbilityRank(name, mainAb, rankWant).then(function (r2) {
        if (r2 && !r2.ok) return done(true, res.message + " Rank not saved: " + r2.message);
        done(true, r2 && r2.changed ? res.message + " " + r2.message : res.message);
      });
    }, function () {
      done(false, "Could not save.");
    });
  }
  doc.addEventListener(
    "click",
    function (e) {
      var p = e.target && e.target.closest ? e.target.closest(".cxe-pen") : null;
      if (!p) return;
      e.preventDefault();
      e.stopPropagation();
      openEditor(p.dataset.cxe, p.dataset.cxek);
    },
    true,
  );
  doc.addEventListener(
    "keydown",
    function (e) {
      var p = e.target && e.target.closest ? e.target.closest(".cxe-pen") : null;
      if (p && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        e.stopPropagation();
        openEditor(p.dataset.cxe, p.dataset.cxek);
        return;
      }
      if (e.key === "Escape" && $id("cxe")) {
        e.stopPropagation();
        closeEditor();
      }
    },
    true,
  );
  /* main ability button on the character banner opens that ability */
  doc.addEventListener("click", function (e) {
    var m = e.target && e.target.closest ? e.target.closest(".cxs-main") : null;
    if (!m) return;
    try {
      openSheet(m.dataset.cxgo);
    } catch (err) {}
  });
  window.__codexCards = { lookOfChar: lookOfChar, lookOfAbility: lookOfAbility, frameSVG: frameSVG, tierFrame: tierFrame, open: openEditor, motionOff: motionOff };
  paintAll();
})();
