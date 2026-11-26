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
    ["fx", "Ability FX", "power", "bolt", "host", "fx"],
    ["action", "Ability in Action", "power", "blade", "host", "action"],
    ["atlas", "Atlas", "time", "portal", "host", "atlas"],
    ["season", "Seasons", "time", "spiral", "host", "season"],
    ["reader", "Reader", "commons", "feather", "host", "reader"],
    ["profile", "Profile", "commons", "figure", "host", "profile"],
  ];
  if (feed && feed.staff) {
    extra.push(["appadmin", "Archive Admin", "commons", "crown", "host", "appadmin"]);
    extra.push(["ingest", "Ingest", "commons", "talisman", "host", "ingest"]);
  }
  window.__codexExtraTabs = host ? extra : [];

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
    list.forEach(function (ch) {
      if (!ch || !ch.name) return;
      var cands = [ch.name].concat(ch.aliases || []);
      var hit = findCast(CAST, keys, cands);
      if (hit) {
        nameMap[ch.name] = hit;
        if (ch.image) window.__codexPortrait[hit] = ch.image;
        // Fill blanks only: the Codex text always wins when it has its own.
        var row = CAST.find(function (r) {
          return r[0] === hit;
        });
        if (row && !row[4] && ch.desc) row[4] = ch.desc;
        return;
      }
      var row2 = [
        ch.name,
        ch.realName || "",
        (ch.aliases || []).join(", "),
        ch.bloodline || "",
        ch.desc || "",
        "others",
      ];
      CAST.push(row2);
      if (ch.image) window.__codexPortrait[ch.name] = ch.image;
      keys.set(norm(ch.name), ch.name);
      nameMap[ch.name] = ch.name;
      window.__codexAdded.cast.push(ch.name);
    });
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
    var groups = [];
    list.forEach(function (ab) {
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
      groups.push(ctx.G(ab.name, ab.desc || "Recorded in the archive.", holders));
      window.__codexAdded.abilities.push(ab.name);
    });
    if (!groups.length) return;
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
      bl: "Abilities the app's archive records that the Codex had not catalogued yet. Codex entries always take priority.",
      x: [],
      g: groups,
    });
  }

  window.__codexHook = function (stage, ctx) {
    if (!feed) return;
    try {
      if (stage === "cast") mergeCast(ctx.CAST);
      else if (stage === "abilities") mergeAbilities(ctx);
    } catch (e) {
      if (window.console) console.warn("[codex] merge skipped", e);
    }
  };
})();
