/* Codex cartography: paints realistic atlas maps in code from the place data, so every
 * landmark sits exactly on the art. Terrain is shaped by the landmarks themselves:
 * high ground raises mountains, water landmarks carve lakes and bays, settlements flatten
 * plains and grow streets (walls for palaces and castles), rivers run downhill, roads follow
 * the routes. Relief shading, contour lines, forests, shoreline ripples and paper grain give
 * a hand-drawn atlas look in a muted natural palette. Deterministic per place (seeded). */
(function codexCarto() {
  "use strict";
  function rng(seed) {
    var s = 0;
    for (var i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNoise(r) {
    var p = new Uint8Array(512), g = [];
    for (var i = 0; i < 256; i++) {
      p[i] = i;
      var a = r() * Math.PI * 2;
      g.push([Math.cos(a), Math.sin(a)]);
    }
    for (var j = 255; j > 0; j--) {
      var k = Math.floor(r() * (j + 1)), t = p[j];
      p[j] = p[k];
      p[k] = t;
    }
    for (var m = 0; m < 256; m++) p[m + 256] = p[m];
    var fade = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };
    var dot = function (h, x, y) { var v = g[h & 255]; return v[0] * x + v[1] * y; };
    return function (x, y) {
      var X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y;
      X &= 255; Y &= 255;
      var aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
      var u = fade(xf), v = fade(yf);
      var x1 = dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf));
      var x2 = dot(ab, xf, yf - 1) + u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1));
      return x1 + v * (x2 - x1);
    };
  }
  // Read a landmark by its NAME first; the note only decides when the name says nothing.
  var NAME_KIND = [
    [/palace|castle|fortress|fort\b|citadel|keep\b|walls\b|land walls|bastion|stronghold|vatican|sant'angelo/i, "keep"],
    [/harbou?r|port\b|cove|dock|pier|quay|causeway/i, "port"],
    [/lake|falls|cascade|river|sea\b|spring|pool|lagoon|canal|bay\b|sunken|flooded|drowned|amphitheater|delta|marsh|well\b|tiber|danube|golden horn|bosphorus/i, "water"],
    [/mountain|peak|cliff|ridge|volcano|chasm|pass\b|caves?|crater|glacier|plateau|highland|summit|crag|gorge|wall falls|monolith/i, "rise"],
    [/city|capital|village|town|quarter|district|market|bazaar|temple|church|mosque|cathedral|monastery|academy|school|hall\b|tower|shrine|gate|gateway|arena|colosseum|library|house|estate|cottage|ruins?|plaza|outpost|forge|council|watchtowers?/i, "town"],
  ];
  function kindOf(name, note) {
    for (var i = 0; i < NAME_KIND.length; i++) if (NAME_KIND[i][0].test(name)) return NAME_KIND[i][1];
    var n = note || "";
    if (/harbou?r|port\b|cove/i.test(n)) return "port";
    if (/lake|river|water|sea\b|flooded/i.test(n)) return "water";
    if (/mountain|cliff|peak|ridge/i.test(n)) return "rise";
    return "point";
  }
  /** Place climate from its own name and epithet. */
  function climateOf(text) {
    if (/void|fracture|dimension|outside time/i.test(text)) return "void";
    if (/ice|snow|frost|glaci|winter|water kingdom/i.test(text)) return "cold";
    if (/demon|ash|scar|fallen|burn/i.test(text)) return "scorched";
    if (/sanctuary|fung|mangrove|jungle|vine|grove|forest/i.test(text)) return "lush";
    return "temperate";
  }
  var cache = {};

  /** Paint a map. spec: {key, w, h, marks:[{id,name,x,y}], routes:[[a,b]], style:'atlas'|'plan', world, era} */
  function paint(spec, outW) {
    var cacheKey = spec.key + "|" + outW + "|" + spec.style;
    if (cache[cacheKey]) return cache[cacheKey];
    var r = rng(spec.key);
    var noise = makeNoise(r);
    var GW = 200, GH = Math.max(80, Math.round((GW * spec.h) / spec.w));
    var E = new Float32Array(GW * GH);
    var marks = (spec.marks || []).map(function (m) {
      return { m: m, k: m.kind || kindOf(m.name, m.note), gx: (m.x / 100) * GW, gy: (m.y / 100) * GH };
    });
    var climate = spec.climate || "temperate";
    var waters = climate === "void" ? [] : marks.filter(function (q) { return q.k === "water" || q.k === "port"; });
    // which edge the sea lies on: towards the water landmarks' centre (if any)
    var sea = null;
    if (waters.length) {
      var cx = 0, cy = 0;
      waters.forEach(function (q) { cx += q.gx / GW; cy += q.gy / GH; });
      cx /= waters.length; cy /= waters.length;
      var dx = cx - 0.5, dy = cy - 0.5;
      if (Math.hypot(dx, dy) > 0.12 || spec.coast) sea = { x: dx || 0.01, y: dy || 0.5 };
    }
    if (!sea && spec.coast) sea = { x: 0.2, y: 0.5 };
    var fbm = function (x, y) {
      var v = 0, amp = 0.55, f = 1;
      for (var o = 0; o < 5; o++) { v += noise(x * f, y * f) * amp; amp *= 0.5; f *= 2.03; }
      return v;
    };
    var scale = 3.2 / GW;
    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        var e = 0.18 + fbm(x * scale + 11.3, y * scale + 7.7) * 0.75;
        if (spec.world || climate === "void") {
          // land gathers around the realms; open ocean elsewhere
          var land = -0.42;
          marks.forEach(function (q) {
            var d = Math.hypot(x - q.gx, (y - q.gy) * 0.9) / GW;
            land = Math.max(land, (climate === "void" ? 0.36 : 0.42) - d * (climate === "void" ? 4.2 : 2.6));
          });
          e += land;
        } else if (sea) {
          var px = x / GW - 0.5, py = y / GH - 0.5;
          var t = (px * sea.x + py * sea.y) / Math.hypot(sea.x, sea.y);
          e -= Math.max(0, t + 0.08) * 1.25;
        }
        marks.forEach(function (q) {
          var dd = Math.hypot(x - q.gx, y - q.gy) / GW;
          if (q.k === "rise") e += (0.5 + Math.abs(noise(x * 0.11 + 3, y * 0.11)) * 0.5) * Math.exp(-(dd * dd) / 0.0055);
          else if (q.k === "water") e -= 0.55 * Math.exp(-(dd * dd) / 0.0028);
          else if (q.k === "keep") e = e + (0.3 - e) * Math.exp(-(dd * dd) / 0.0012);
          else if (q.k === "town") e = e + (0.16 - e) * 0.85 * Math.exp(-(dd * dd) / 0.0022);
          else if (q.k === "port") {
            var sx0 = sea ? sea.x : 0, sy0 = sea ? sea.y : 0.5, sl = Math.hypot(sx0, sy0) || 1;
            var wx = q.gx + (sx0 / sl) * 7, wy = q.gy + (sy0 / sl) * 7;
            var dw = Math.hypot(x - wx, y - wy) / GW;
            e -= 0.5 * Math.exp(-(dw * dw) / 0.0016);
            e = e + (0.1 - e) * 0.6 * Math.exp(-(dd * dd) / 0.0012);
          }
        });
        E[y * GW + x] = e;
      }
    }
    var at = function (x, y) {
      x = Math.max(0, Math.min(GW - 1, x)); y = Math.max(0, Math.min(GH - 1, y));
      return E[(y | 0) * GW + (x | 0)];
    };
    var plan = spec.style === "plan";
    var W = outW, Hh = Math.round((outW * spec.h) / spec.w);
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = Hh;
    var c = cv.getContext("2d");
    var img = c.createImageData(GW, GH);
    var ramp = plan
      ? [[-1, [9, 40, 78]], [0, [12, 52, 98]], [0.02, [24, 72, 126]], [1, [40, 96, 150]]]
      : climate === "cold"
        ? [[-0.6, [30, 56, 84]], [-0.2, [60, 104, 134]], [-0.04, [120, 168, 190]], [0, [196, 210, 214]],
           [0.06, [176, 192, 190]], [0.2, [206, 218, 222]], [0.4, [226, 234, 238]], [0.7, [240, 244, 248]], [1.2, [252, 252, 255]]]
        : climate === "scorched"
          ? [[-0.6, [30, 34, 44]], [-0.2, [52, 58, 66]], [-0.04, [86, 90, 92]], [0, [150, 132, 104]],
             [0.05, [122, 104, 80]], [0.2, [104, 86, 68]], [0.4, [86, 72, 60]], [0.65, [70, 58, 52]], [1.2, [120, 110, 104]]]
          : climate === "void"
            ? [[-1, [10, 8, 22]], [-0.05, [22, 16, 44]], [0, [88, 72, 120]], [0.15, [120, 104, 150]], [0.5, [150, 136, 176]], [1.2, [200, 190, 220]]]
            : climate === "lush"
              ? [[-0.6, [22, 52, 58]], [-0.2, [38, 84, 86]], [-0.04, [66, 120, 112]], [0, [170, 168, 118]],
                 [0.04, [96, 136, 74]], [0.18, [74, 116, 60]], [0.34, [62, 100, 54]], [0.5, [104, 114, 84]], [0.7, [150, 146, 126]], [1.2, [210, 206, 196]]]
              : [[-0.6, [26, 48, 70]], [-0.2, [44, 78, 102]], [-0.04, [78, 120, 138]], [0, [206, 192, 150]],
                 [0.03, [150, 160, 112]], [0.18, [118, 138, 90]], [0.32, [104, 118, 82]], [0.46, [146, 134, 104]],
                 [0.62, [170, 160, 140]], [0.78, [226, 224, 218]], [1.2, [246, 246, 244]]];
    var colAt = function (e) {
      for (var i = 1; i < ramp.length; i++) {
        if (e <= ramp[i][0]) {
          var a = ramp[i - 1], b = ramp[i], t = (e - a[0]) / (b[0] - a[0] || 1);
          t = Math.max(0, Math.min(1, t));
          return [a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t, a[1][2] + (b[1][2] - a[1][2]) * t];
        }
      }
      return ramp[ramp.length - 1][1];
    };
    for (var yy = 0; yy < GH; yy++) {
      for (var xx = 0; xx < GW; xx++) {
        var e2 = at(xx, yy);
        var col = colAt(e2);
        // relief shading: light from the north-west
        var sx = at(xx + 1, yy) - at(xx - 1, yy), sy = at(xx, yy + 1) - at(xx, yy - 1);
        var shade = e2 > 0 ? Math.max(0.5, Math.min(1.4, 1 - (sx + sy) * (plan ? 2.2 : 7.5))) : 1;
        var grain = 1 + (noise(xx * 0.9, yy * 0.9) * 0.06);
        var o = (yy * GW + xx) * 4;
        img.data[o] = Math.min(255, col[0] * shade * grain);
        img.data[o + 1] = Math.min(255, col[1] * shade * grain);
        img.data[o + 2] = Math.min(255, col[2] * shade * grain);
        img.data[o + 3] = 255;
      }
    }
    var tmp = document.createElement("canvas");
    tmp.width = GW; tmp.height = GH;
    tmp.getContext("2d").putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(tmp, 0, 0, W, Hh);
    var kx = W / GW, ky = Hh / GH;

    // contour lines (and shoreline ripples) by marching squares
    var contour = function (level, style, width) {
      c.strokeStyle = style;
      c.lineWidth = width;
      c.beginPath();
      for (var y = 0; y < GH - 1; y++) {
        for (var x = 0; x < GW - 1; x++) {
          var a = at(x, y) > level, b = at(x + 1, y) > level, d = at(x, y + 1) > level, e = at(x + 1, y + 1) > level;
          var idx = (a ? 8 : 0) | (b ? 4 : 0) | (e ? 2 : 0) | (d ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var lerp = function (v1, v2) { return (level - v1) / (v2 - v1 || 1e-6); };
          var tp = [(x + lerp(at(x, y), at(x + 1, y))) * kx, y * ky];
          var rt = [(x + 1) * kx, (y + lerp(at(x + 1, y), at(x + 1, y + 1))) * ky];
          var bt = [(x + lerp(at(x, y + 1), at(x + 1, y + 1))) * kx, (y + 1) * ky];
          var lf = [x * kx, (y + lerp(at(x, y), at(x, y + 1))) * ky];
          var seg = {
            1: [lf, bt], 2: [bt, rt], 3: [lf, rt], 4: [tp, rt], 5: [tp, lf], 6: [tp, bt], 7: [tp, lf],
            8: [tp, lf], 9: [tp, bt], 10: [tp, rt], 11: [tp, rt], 12: [lf, rt], 13: [bt, rt], 14: [lf, bt],
          }[idx];
          if (seg) { c.moveTo(seg[0][0], seg[0][1]); c.lineTo(seg[1][0], seg[1][1]); }
        }
      }
      c.stroke();
    };
    var ink = plan ? "rgba(200,225,255," : "rgba(60,48,32,";
    contour(0, plan ? "rgba(220,236,255,0.85)" : "rgba(52,40,26,0.75)", Math.max(1.2, W / 600));
    if (!plan) {
      [-0.03, -0.07, -0.12].forEach(function (lv, i) { contour(lv, "rgba(230,240,245," + (0.35 - i * 0.1) + ")", 0.8); });
    }
    for (var lv = 0.12; lv < 1; lv += 0.1) contour(lv, ink + (plan ? 0.32 : 0.22) + ")", lv > 0.5 ? 0.9 : 0.6);

    // rivers: from high ground, steepest descent to the water
    if (!spec.world) {
      c.lineCap = "round";
      marks.filter(function (q) { return q.k === "rise"; }).forEach(function (q, qi) {
        var x = q.gx + (r() - 0.5) * 6, y = q.gy + 4, pts = [];
        for (var s = 0; s < 260; s++) {
          pts.push([x, y]);
          if (at(x, y) < 0) break;
          var best = null, bv = at(x, y);
          for (var a = 0; a < 8; a++) {
            var ang = (a / 8) * Math.PI * 2, nx = x + Math.cos(ang) * 1.6, ny = y + Math.sin(ang) * 1.6;
            var v = at(nx, ny) + noise(nx * 0.4 + qi, ny * 0.4) * 0.015;
            if (v < bv) { bv = v; best = [nx, ny]; }
          }
          if (!best) { y += 1.4; x += (r() - 0.5) * 1.2; } else { x = best[0]; y = best[1]; }
          if (x < 0 || y < 0 || x >= GW || y >= GH) break;
        }
        if (pts.length < 8) return;
        for (var pass = 0; pass < 2; pass++) {
          c.strokeStyle = plan ? "rgba(150,210,255,0.8)" : pass ? "rgba(98,146,170,0.95)" : "rgba(40,60,70,0.35)";
          c.beginPath();
          pts.forEach(function (p, i) { var X = p[0] * kx, Y = p[1] * ky; if (!i) c.moveTo(X, Y); else c.lineTo(X, Y); });
          c.lineWidth = (pass ? 1.6 : 3) * (W / 700);
          c.stroke();
        }
      });
    }

    // forests: dense clumps where a moisture mask allows (none on ice, few when scorched)
    if (!plan && climate !== "void") {
      var trees = spec.world ? 2600 : climate === "lush" ? 7000 : climate === "cold" ? 1800 : climate === "scorched" ? 600 : 4200;
      var leaf = climate === "cold" ? [52, 78, 66] : climate === "scorched" ? [70, 62, 44] : climate === "lush" ? [48, 92, 50] : [66, 94, 54];
      for (var t2 = 0; t2 < trees; t2++) {
        var fx = r() * GW, fy = r() * GH, fe = at(fx, fy);
        if (fe < 0.05 || fe > (climate === "cold" ? 0.3 : 0.46)) continue;
        if (noise(fx * 0.045 + 40, fy * 0.045 - 9) < (climate === "lush" ? -0.12 : 0.04)) continue;
        if (marks.some(function (q) { return (q.k === "town" || q.k === "keep" || q.k === "port") && Math.hypot(fx - q.gx, fy - q.gy) < 11; })) continue;
        var X = fx * kx, Y = fy * ky, rad = (spec.world ? 1.2 : 2.4 + r() * 1.2) * (W / 900);
        c.fillStyle = "rgba(24,30,20,0.38)";
        c.beginPath(); c.arc(X + rad * 0.55, Y + rad * 0.65, rad, 0, 6.283); c.fill();
        c.fillStyle = "rgb(" + (leaf[0] + r() * 22) + "," + (leaf[1] + r() * 20) + "," + (leaf[2] + r() * 14) + ")";
        c.beginPath(); c.arc(X, Y, rad, 0, 6.283); c.fill();
        c.fillStyle = "rgba(255,255,230,0.12)";
        c.beginPath(); c.arc(X - rad * 0.35, Y - rad * 0.35, rad * 0.45, 0, 6.283); c.fill();
      }
    }

    // roads along routes, with casing
    var byId = {};
    marks.forEach(function (q) { byId[q.m.id] = q; });
    (spec.world ? [] : spec.routes || []).forEach(function (rt) {
      var a = byId[rt[0]], b = byId[rt[1]];
      if (!a || !b) return;
      var mx = (a.gx + b.gx) / 2 + (r() - 0.5) * 10, my = (a.gy + b.gy) / 2 + (r() - 0.5) * 10;
      [[plan ? "rgba(10,40,80,0.9)" : "rgba(70,52,30,0.65)", 4], [plan ? "rgba(220,236,255,0.9)" : "rgba(226,206,160,0.95)", 2]].forEach(function (st) {
        c.strokeStyle = st[0]; c.lineWidth = st[1] * (W / 700);
        if (!spec.world) c.setLineDash(st[1] === 2 && !plan ? [] : []);
        c.beginPath();
        c.moveTo(a.gx * kx, a.gy * ky);
        c.quadraticCurveTo(mx * kx, my * ky, b.gx * kx, b.gy * ky);
        c.stroke();
      });
    });

    // settlements: blocks along a street grid, walls around keeps
    if (!spec.world) {
      marks.forEach(function (q) {
        if (q.k !== "town" && q.k !== "keep" && q.k !== "port") return;
        var cx = q.gx * kx, cy = q.gy * ky, R = (q.k === "keep" ? 30 : 40) * (W / 900);
        var rot = r() * Math.PI;
        c.save();
        c.translate(cx, cy);
        c.rotate(rot);
        var n = q.k === "keep" ? 40 : 90;
        for (var i = 0; i < n; i++) {
          var ang = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
          var bx = Math.cos(ang) * d, by = Math.sin(ang) * d;
          bx = Math.round(bx / (6 * (W / 900))) * 6 * (W / 900);
          by = Math.round(by / (5 * (W / 900))) * 5 * (W / 900);
          if (at((cx + bx) / kx, (cy + by) / ky) < 0.01) continue;
          var bw = (3.4 + r() * 3) * (W / 900), bh = (2.8 + r() * 2.4) * (W / 900);
          c.fillStyle = plan ? "rgba(225,238,255,0.9)" : "rgba(52,38,28,0.32)";
          c.fillRect(bx - bw / 2 + 0.8, by - bh / 2 + 0.9, bw, bh);
          c.fillStyle = plan ? "rgba(225,238,255,0.25)" : climate === "cold" ? "rgba(" + (210 + r() * 30) + "," + (220 + r() * 20) + "," + (232 + r() * 18) + ",0.95)" : climate === "scorched" ? "rgba(" + (120 + r() * 30) + "," + (100 + r() * 20) + "," + (90 + r() * 18) + ",0.95)" : "rgba(" + (176 + r() * 40) + "," + (118 + r() * 30) + "," + (92 + r() * 22) + ",0.95)";
          c.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
        }
        if (q.k === "keep") {
          c.strokeStyle = plan ? "rgba(225,238,255,0.95)" : "rgba(80,66,52,0.9)";
          c.lineWidth = 2.2 * (W / 700);
          c.beginPath();
          var sides = 7;
          for (var s2 = 0; s2 <= sides; s2++) {
            var a2 = (s2 / sides) * Math.PI * 2, rr = R * 1.1 * (0.9 + (s2 % 2) * 0.12);
            if (!s2) c.moveTo(Math.cos(a2) * rr, Math.sin(a2) * rr); else c.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
          }
          c.stroke();
          for (var s3 = 0; s3 < sides; s3++) {
            var a3 = (s3 / sides) * Math.PI * 2;
            c.fillStyle = c.strokeStyle;
            c.beginPath(); c.arc(Math.cos(a3) * R * 1.1, Math.sin(a3) * R * 1.1, 1.8 * (W / 700), 0, 6.283); c.fill();
          }
        } else {
          c.strokeStyle = plan ? "rgba(225,238,255,0.5)" : "rgba(120,96,70,0.55)";
          c.lineWidth = 0.8 * (W / 700);
          c.beginPath();
          c.moveTo(-R, 0); c.lineTo(R, 0); c.moveTo(0, -R); c.lineTo(0, R);
          c.stroke();
        }
        c.restore();
      });
    }

    // paper: warm tint, fibres and a soft vignette (atlas); drafting film (plan)
    if (!plan) {
      c.globalCompositeOperation = "multiply";
      c.fillStyle = "rgba(244,232,206,0.38)";
      c.fillRect(0, 0, W, Hh);
      c.globalCompositeOperation = "source-over";
      for (var f2 = 0; f2 < 2200; f2++) {
        c.fillStyle = "rgba(" + (r() < 0.5 ? "255,250,236" : "70,56,40") + "," + (0.03 + r() * 0.04) + ")";
        c.fillRect(r() * W, r() * Hh, 1 + r() * 2, 1);
      }
      var vg = c.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.35, W / 2, Hh / 2, Math.max(W, Hh) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(60,40,20,0.35)");
      c.fillStyle = vg;
      c.fillRect(0, 0, W, Hh);
    }
    var url = cv.toDataURL("image/jpeg", 0.88);
    cache[cacheKey] = url;
    return url;
  }
  window.__codexCarto = { paint: paint, kindOf: kindOf, climateOf: climateOf };
})();
