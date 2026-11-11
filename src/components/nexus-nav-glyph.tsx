import type { ReactElement } from "react";
/** Tab-specific animated sigils for Nexus navigation; each glyph depicts its page. Presentation only. */
const G: Record<string, ReactElement> = {
  home: <><circle className="g-spin" cx="24" cy="24" r="19" strokeDasharray="3 5" /><path className="g-draw" d="M10 25 24 12l14 13M15 21v15h18V21" /><rect className="g-pulse" x="21" y="28" width="6" height="8" /></>,
  characters: <><circle className="g-spin-r" cx="24" cy="24" r="20" strokeDasharray="1 6" /><circle className="g-pulse" cx="24" cy="17" r="6" /><path className="g-draw" d="M12 38c2-8 7-11 12-11s10 3 12 11" /></>,
  abilities: <><circle className="g-pulse" cx="24" cy="24" r="6" /><g className="g-spin"><ellipse cx="24" cy="24" rx="19" ry="7" /><circle cx="43" cy="24" r="2" fill="currentColor" /></g><g className="g-spin-r"><ellipse cx="24" cy="24" rx="7" ry="19" /><circle cx="24" cy="5" r="2" fill="currentColor" /></g></>,
  fx: <><path className="g-flick" d="M24 42c-8 0-12-6-11-12 1-5 5-7 5-12 4 3 5 6 5 9 2-2 3-5 2-9 6 4 10 9 10 14 0 6-4 10-11 10Z" /><circle className="g-spark" cx="14" cy="10" r="1.5" fill="currentColor" /><circle className="g-spark" cx="36" cy="8" r="1.5" fill="currentColor" /><circle className="g-spark" cx="40" cy="20" r="1" fill="currentColor" /></>,
  action: <><g className="g-clash-l"><path d="M10 40 34 12M30 10l6 0 0 6M12 32l4 4" /></g><g className="g-clash-r"><path d="M38 40 14 12M18 10l-6 0 0 6M36 32l-4 4" /></g><path className="g-spark" d="M24 18v-6M18 20l-4-4M30 20l4-4" /></>,
  archive: <><rect x="10" y="9" width="28" height="30" rx="2" /><path className="g-draw" d="M16 17h16M16 23h16M16 29h10" /><circle className="g-spin" cx="24" cy="24" r="21" strokeDasharray="2 8" /></>,
  story: <><path d="M8 12c6-2 11-1 16 3 5-4 10-5 16-3v24c-6-2-11-1-16 3-5-4-10-5-16-3Z" /><path className="g-draw" d="M24 15v24M12 18h7M12 23h7M29 18h7M29 23h7" /></>,
  map: <><circle cx="24" cy="24" r="17" /><g className="g-spin"><path d="M24 9l4 15-4 15-4-15Z" fill="currentColor" fillOpacity=".25" /></g><circle className="g-spin-r" cx="24" cy="24" r="21" strokeDasharray="4 4" /><circle className="g-pulse" cx="24" cy="24" r="2" fill="currentColor" /></>,
  series: <><rect className="g-bob" x="9" y="12" width="8" height="26" /><rect x="19" y="9" width="8" height="29" /><path className="g-bob" d="M30 13l7-2 6 25-7 2Z" /></>,
  orgs: <><path className="g-pulse" d="M24 6 39 12v11c0 9-6 15-15 19C15 38 9 32 9 23V12Z" /><path className="g-draw" d="M17 24l5 5 9-10" /></>,
  timeline: <><circle cx="24" cy="24" r="17" /><g className="g-tick"><path d="M24 24V11" /></g><g className="g-spin"><path d="M24 24h9" /></g><circle className="g-spin-r" cx="24" cy="24" r="21" strokeDasharray="1 4" /></>,
  graph: <><path className="g-draw" d="M12 14 24 24 36 12M24 24 14 36M24 24l13 12" /><circle className="g-pulse" cx="24" cy="24" r="4" /><circle className="g-spark" cx="12" cy="14" r="3" /><circle className="g-spark" cx="36" cy="12" r="3" /><circle className="g-spark" cx="14" cy="36" r="3" /><circle className="g-spark" cx="37" cy="36" r="3" /></>,
  clans: <><path d="M24 42V22M24 30l-9-6M24 27l9-7" /><circle className="g-pulse" cx="24" cy="15" r="7" /><circle className="g-spark" cx="13" cy="22" r="3" /><circle className="g-spark" cx="35" cy="18" r="3" /><path className="g-draw" d="M17 42c2-3 4-4 7-4s5 1 7 4" /></>,
  fandom: <><path className="g-bob" d="M8 12h22v14H17l-6 5v-5H8Z" /><path className="g-bob" style={{ animationDelay: "-1.4s" }} d="M34 18h6v14h-3v5l-6-5H20v-3" /></>,
  ai: <><rect x="12" y="14" width="24" height="20" rx="5" /><circle className="g-spark" cx="19" cy="24" r="2" fill="currentColor" /><circle className="g-spark" cx="29" cy="24" r="2" fill="currentColor" /><path className="g-pulse" d="M24 14V8M21 8h6" /><circle className="g-spin" cx="24" cy="24" r="21" strokeDasharray="2 6" /></>,
  vault: <><rect x="10" y="12" width="28" height="26" rx="3" /><circle className="g-spin" cx="24" cy="25" r="7" strokeDasharray="4 2" /><circle className="g-pulse" cx="24" cy="25" r="2" fill="currentColor" /></>,
  admin: <><path className="g-pulse" d="M24 6l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1Z" /><circle className="g-spin" cx="24" cy="24" r="21" strokeDasharray="1 5" /></>,
  profile: <><circle cx="24" cy="24" r="17" /><circle className="g-pulse" cx="24" cy="20" r="5" /><path d="M14 35c3-5 6-7 10-7s7 2 10 7" /><circle className="g-spin" cx="24" cy="24" r="21" strokeDasharray="3 6" /></>,
  theme: <><path className="g-spin" d="M24 6l14 18-14 18-14-18Z" /><path className="g-spin-r" d="M24 14l7 10-7 10-7-10Z" fill="currentColor" fillOpacity=".25" /><circle className="g-spark" cx="24" cy="24" r="2" fill="currentColor" /></>,
};
const BY_PATH: Record<string, string> = { "/": "home", "/characters": "characters", "/abilities": "abilities", "/ability-fx": "fx", "/ability-action": "action", "/archive": "archive", "/story": "story", "/map": "map", "/atlas": "map", "/series": "series", "/orgs": "orgs", "/timeline": "timeline", "/graph": "graph", "/clans": "clans", "/fandom": "fandom", "/ai": "ai", "/vault": "vault", "/admin": "admin", "/profile": "profile", "#theme": "theme" };
export function nexusGlyphKey(to: string) { return BY_PATH[to] ?? "home"; }
export function NexusNavGlyph({ to, className = "h-7 w-7" }: { to: string; className?: string }) {
  return <span aria-hidden className={`inline-grid shrink-0 ${className}`}><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nexus-glyph">{G[nexusGlyphKey(to)]}</svg></span>;
}
