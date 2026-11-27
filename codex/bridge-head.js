/* Codex host bridge (head): runs before the Codex scripts.
 * When the Codex is embedded by the SCU app (same origin iframe), the app publishes
 * window.__SCU_CODEX_FEED__ (archive data) and window.__SCU_CODEX_HOST__ (navigation)
 * on the parent window. The Codex keeps its own story data as the source of truth and
 * only ADDS characters and abilities it has not catalogued yet. Opened on its own, the
 * Codex behaves exactly as the standalone page. */
(function () {
  "use strict";
  var host = null;
  var feed = null;
  try {
    if (window.parent && window.parent !== window) {
      host = window.parent.__SCU_CODEX_HOST__ || null;
      feed = window.parent.__SCU_CODEX_FEED__ || null;
    }
  } catch (e) {
    host = null;
    feed = null;
  }
  window.__codexHost = host;
  window.__codexFeed = feed;
  if (host) document.documentElement.classList.add("cx-hosted");
  try {
    if (host && host.motion === false) document.documentElement.dataset.motion = "off";
  } catch (e) {}

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[’'`]/g, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
  window.__codexNorm = norm;
  /** app name -> Codex cast name, filled while merging. */
  var nameMap = {};
  window.__codexNameMap = nameMap;
  window.__codexAdded = { cast: [], abilities: [] };
  /** Codex cast name -> portrait URL (already validated by the app). */
  window.__codexPortrait = {};

  /** Extra dock destinations that open the app's own pages. */
  var extra = [
    ["bonds", "Bonds", "people", "ring3", "local", "bonds"],
    ["fx", "Ability FX", "power", "bolt", "host", "fx"],
    ["action", "Ability in Action", "power", "blade", "host", "action"],
    ["season", "Seasons", "time", "spiral", "host", "season"],
    ["reader", "Reader", "commons", "feather", "host", "reader"],
    ["profile", "Profile", "commons", "figure", "host", "profile"],
  ];
  if (feed && feed.staff) {
    extra.push(["appadmin", "Archive Admin", "commons", "crown", "host", "appadmin"]);
    extra.push(["ingest", "Ingest", "commons", "talisman", "host", "ingest"]);
  }
  window.__codexExtraTabs = host ? extra : [];
  // The app supplies atlas data: Map becomes the Codex's own map instead of the Classic page.
  window.__codexLocalMap = !!(host && feed && feed.atlas && feed.atlas.locations && feed.atlas.locations.length);

  function castIndex(CAST) {
    var keys = new Map();
    CAST.forEach(function (r) {
      var names = [r[0]].concat(String(r[2] || "").split(/,|\/|\bor\b/));
      names.forEach(function (x) {
        var k = norm(x);
        if (k && !keys.has(k)) keys.set(k, r[0]);
      });
    });
    return keys;
  }
  function findCast(CAST, keys, cands) {
    for (var i = 0; i < cands.length; i++) {
      var k = norm(cands[i]);
      if (!k) continue;
      if (keys.has(k)) return keys.get(k);
      // "Zayn" matches "Zayn Hayes", like the Codex's own castOf prefix rule.
      for (var j = 0; j < CAST.length; j++) {
        var c = norm(CAST[j][0]);
        if (c.indexOf(k + " ") === 0 || k.indexOf(c + " ") === 0) return CAST[j][0];
      }
    }
    return null;
  }

  function mergeCast(CAST) {
    var list = (feed && feed.characters) || [];
    var keys = castIndex(CAST);
    var inCast = function (n) {
      return CAST.some(function (r) {
        return r[0] === n;
      });
    };
    list.forEach(function (ch) {
      if (!ch || !ch.name) return;
      var hit = null;
      if (Object.prototype.hasOwnProperty.call(ch, "codex")) {
        // The app's shared matcher already decided: a Codex name, or null = a new person.
        hit = ch.codex && inCast(ch.codex) ? ch.codex : null;
        if (!hit && ch.codex == null && keys.has(norm(ch.name))) hit = keys.get(norm(ch.name));
      } else {
        hit = findCast(CAST, keys, [ch.name].concat(ch.aliases || []));
      }
      if (hit) {
        nameMap[ch.name] = hit;
        if (ch.image && !window.__codexPortrait[hit]) window.__codexPortrait[hit] = ch.image;
        // Fill blanks only: the Codex text always wins when it has its own.
        var row = CAST.find(function (r) {
          return r[0] === hit;
        });
        if (row && !row[4] && ch.desc) row[4] = ch.desc;
        return;
      }
      if (inCast(ch.name)) {
        nameMap[ch.name] = ch.name;
        return;
      }
      CAST.push([ch.name, ch.realName || "", (ch.aliases || []).join(", "), ch.bloodline || "", ch.desc || "", "others"]);
      keys.set(norm(ch.name), ch.name);
      nameMap[ch.name] = ch.name;
      if (ch.image) window.__codexPortrait[ch.name] = ch.image;
      window.__codexAdded.cast.push(ch.name);
    });
  }

  /* Archive abilities are filed the Codex way: into the branch (and so the tier) they belong
     to; as a technique under the holder's ability family when the holders already own a family
     in that branch, otherwise as a new ability in the branch. */
  var BRANCH_RULES = [
    ["aether", /aether|soul layer|void eras/],
    ["time", /\btime\b|chrono|temporal/],
    ["space", /portal|teleport|dimension|\brift|\bwarp|spatial/],
    ["mind", /mind|telepath|dream|nightmare|fear|illusion|memory|psych|hypno|empath/],
    ["curse", /curse|\bhex\b|malediction/],
    ["chaos", /chaos|entropy/],
    ["order", /command|authority|\border\b|decree/],
    ["judgement", /judg|verdict/],
    ["blood", /blood|hemo|sanguin/],
    ["lightning", /lightning|electr|thunder|astrapo|volt|storm/],
    ["fire", /fire|flame|pyro|burn|blaze|inferno|ember|lava|magma|heat/],
    ["water", /water|hydro|ice\b|cryo|frost|snow|mist|tide|ocean|wave/],
    ["air", /wind|air\b|aero|gale|gust|breeze|tornado|cyclone|sky/],
    ["earth", /earth|stone|rock|geo|terra|metal|sand|crystal|quake/],
    ["light", /\blight\b|radian|holy|solar|lumin|photon/],
    ["shadow", /shadow|dark|umbra|night|gloom/],
    ["life", /heal|regenerat|nature|plant|flora|life|restor|vital|cure/],
    ["beast", /beast|dragon|wolf|animal|shape.?shift|feral|claw|serpent|bird|tiger/],
    ["venom", /venom|poison|toxic|acid/],
    ["resonance", /sound|sonic|resonan|voice|song|echo/],
    ["energy", /energy|\bki\b|chakra|aura|power surge|blast/],
    ["arcane", /magic|arcane|spell|rune|sorcer|witch|mana|pact|enchant|summon/],
    ["seal", /seal|talisman|binding|\bward\b|barrier|shield|force field/],
    ["tech", /tech|suit|cyber|serum|gadget|chip|robot|armou?r|drone|gun/],
    ["blade", /sword|blade|katana|spear|bow|arrow|weapon|dagger|axe|scythe|whip/],
    ["assassin", /stealth|assassin|silent|infiltrat|poison dart|shadow step/],
    ["soldier", /soldier|combat|martial|strength|speed|agility|tactic|strateg|fight|marksman|leader|endurance|reflex|hand.to.hand|peak human/],
  ];
  function branchFor(BR, ab) {
    var text = (ab.name + " " + (ab.desc || "")).toLowerCase();
    var nameOnly = ab.name.toLowerCase();
    var idOf = function (id) {
      for (var i = 0; i < BR.length; i++) if (BR[i].id === id) return i;
      return -1;
    };
    // the name decides first, then the description
    var pass = [nameOnly, text];
    for (var p = 0; p < pass.length; p++)
      for (var r = 0; r < BRANCH_RULES.length; r++)
        if (BRANCH_RULES[r][1].test(pass[p])) {
          var i = idOf(BRANCH_RULES[r][0]);
          if (i >= 0) return i;
        }
    if (ab.group === "role") return idOf("soldier");
    if (ab.group === "beast") return idOf("beast");
    if (ab.group === "art") return idOf("blade");
    return -1;
  }
  function mergeAbilities(ctx) {
    var list = (feed && feed.abilities) || [];
    if (!list.length) return;
    var BR = ctx.BR;
    var have = new Set();
    BR.forEach(function (br) {
      br.g.forEach(function (gr) {
        have.add(norm(String(gr.n).replace(/\*$/, "")));
        (gr.k || []).forEach(function (lf) {
          have.add(norm(String(lf.n).replace(/\*$/, "")));
        });
      });
    });
    var leftover = [];
    var sorted = list.slice().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    });
    sorted.forEach(function (ab) {
      var k = norm(ab.name);
      if (!k || have.has(k)) return;
      have.add(k);
      var holders = (ab.holders || [])
        .map(function (h) {
          return nameMap[h] || null;
        })
        .filter(Boolean);
      holders = holders.filter(function (h, i) {
        return holders.indexOf(h) === i;
      });
      var desc = ab.desc || "Recorded in the archive.";
      var b = branchFor(BR, ab);
      window.__codexAdded.abilities.push(ab.name);
      if (b < 0) {
        leftover.push(ctx.G(ab.name, desc, holders, null, { src: "archive" }));
        return;
      }
      // technique: every holder already owns an ability family in this branch
      if (holders.length) {
        var fam = BR[b].g.find(function (gr) {
          return !gr.p && holders.every(function (h) {
            return (gr.h || []).indexOf(h) >= 0;
          });
        });
        if (fam) {
          fam.k = fam.k || [];
          fam.k.push({ n: ab.name, d: desc, src: "archive" });
          window.__codexAdded.placed = (window.__codexAdded.placed || 0) + 1;
          return;
        }
      }
      BR[b].g.push(ctx.G(ab.name, desc, holders, null, { src: "archive" }));
      window.__codexAdded.placed = (window.__codexAdded.placed || 0) + 1;
    });
    if (!leftover.length) return;
    try {
      ctx.GLY.archive = ctx.GLY.seal || ctx.GLY.arcane;
      if (ctx.DEF) ctx.DEF.archive = ["star4", "orb", "talisman"];
    } catch (e) {}
    BR.push({
      id: "archive",
      nm: "From the Archive",
      tier: "Skills",
      c1: "#93B6FF",
      c2: "#DCE7FF",
      bl: "Archive abilities that fit no Codex branch yet. Codex entries always take priority.",
      x: [],
      g: leftover,
    });
  }

  function mergeSeries(SER0) {
    var list = (feed && feed.series) || [];
    list.forEach(function (sr) {
      if (!sr || !sr.title) return;
      var want = norm(sr.title).replace(/^the /, "");
      var hit = SER0.find(function (x) {
        return norm(x.name).replace(/^the /, "") === want;
      });
      var names = sr.seasons || [];
      if (hit) {
        // Codex titles win; the archive only fills blanks and adds seasons it lacks.
        names.forEach(function (nm, i) {
          var s = hit.seasons[i];
          if (s) {
            if (!s.name && nm) s.name = nm;
          } else hit.seasons.push({ n: i + 1, name: nm || "" });
        });
        return;
      }
      SER0.push({
        id: "app-" + want.replace(/ /g, "-"),
        name: sr.title,
        blurb: sr.desc || "A series recorded in the archive.",
        seasons: names.map(function (nm, i) {
          return { n: i + 1, name: nm || "" };
        }),
      });
      window.__codexAdded.series = (window.__codexAdded.series || []).concat(sr.title);
    });
  }
  window.__codexHook = function (stage, ctx) {
    if (!feed) return;
    try {
      if (stage === "cast") mergeCast(ctx.CAST);
      else if (stage === "abilities") mergeAbilities(ctx);
      else if (stage === "series") mergeSeries(ctx.SER0);
    } catch (e) {
      if (window.console) console.warn("[codex] merge skipped", e);
    }
  };
})();
