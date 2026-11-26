import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { entitiesQuery, entityRelationsQuery } from "@/lib/entities";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { supabase } from "@/integrations/supabase/client";
import { seriesQuery } from "@/lib/series";
import { allAbilityDefs } from "@/lib/abilities";
import { useIsStaff } from "@/hooks/use-admin";
import { useOptionalAuth } from "@/context/AuthContext";
import { useOptionalThemeContext, type PrimarySystem } from "@/context/ThemeContext";
import { useUiMode, VISUAL_UI_MODES, type VisualUiMode } from "@/hooks/use-ui-mode";
import { useAppMotion } from "@/hooks/use-app-motion";
import { buildCodexFeed, codexTabForPath, safeCodexPath, type CodexFeed } from "@/lib/codex-feed";

/**
 * Codex UI: the SCU Codex page (public/codex/index.html) runs full screen in a same-origin
 * frame. Its own pages (home, characters, abilities, timeline, ...) render there with its
 * own layout and story data; app-only pages (map, story, AI box, admin, ...) open as the
 * app's Classic-backed pages with a Back to Codex bar, and the frame stays mounted (hidden)
 * so the reader's place in the Codex is kept.
 */

type CodexHost = {
  navigate: (path: string) => void;
  route: (path: string) => void;
  setMode: (mode: string) => void;
  ready: () => void;
  motion: boolean;
};

declare global {
  interface Window {
    __SCU_CODEX_FEED__?: CodexFeed;
    __SCU_CODEX_HOST__?: CodexHost;
  }
}

type CodexFrameWindow = Window & {
  __codexGoto?: (tab: string) => void;
  __codexFeedUpdate?: (feed: CodexFeed) => void;
};

const GROUP_KINDS = ["organization", "clan", "bloodline", "faction"];
/** Same key as the Nexus constellation's membership query, so the cache is shared. */
const membershipsQuery = {
  queryKey: ["graph-memberships"],
  staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("entity_memberships").select("*");
    if (error) {
      if (/entity_memberships|schema cache|does not exist/i.test(error.message)) return [];
      throw error;
    }
    return data ?? [];
  },
};

/** Every character's ability ranks (Nexus reads the same rows per character). */
const abilityRanksQuery = {
  queryKey: ["codex-ability-ranks"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("character_abilities")
      .select("entity_id,ability_key,level,series_id,season_number");
    if (error) {
      if (/character_abilities|schema cache|does not exist/i.test(error.message)) return [];
      throw error;
    }
    return data ?? [];
  },
};

const LAST_TAB_KEY = "scu-codex-last-path";

function useCodexFeed(enabled: boolean): { feed: CodexFeed | null; settled: boolean } {
  const staff = useIsStaff();
  const { mode } = useUiMode();
  const ents = useQuery({ ...entitiesQuery(["character"]), enabled });
  const ser = useQuery({ ...seriesQuery, enabled });
  const rel = useQuery({ ...entityRelationsQuery, enabled });
  const grp = useQuery({ ...entitiesQuery(GROUP_KINDS), enabled });
  const mem = useQuery({ ...membershipsQuery, enabled });
  const rk = useQuery({ ...abilityRanksQuery, enabled });
  const maskChars = useSpoilerMask("characters");
  const maskAbil = useSpoilerMask("abilities");
  const maskArch = useSpoilerMask("archive");
  const maskSeries = useSpoilerMask("series");
  const feed = useMemo(() => {
    if (!enabled) return null;
    let abilities: { label: string; description?: string | undefined }[] = [];
    try {
      abilities = allAbilityDefs().map((a) => ({ label: a.label, description: a.description }));
    } catch {
      abilities = [];
    }
    return buildCodexFeed({
      entities: ents.data ?? [],
      series: ser.data ?? [],
      relations: rel.data ?? [],
      groups: grp.data ?? [],
      memberships: mem.data ?? [],
      abilityRows: rk.data ?? [],
      masked: {
        characters: maskChars,
        abilities: maskAbil,
        archive: maskArch,
        series: maskSeries,
      },
      abilities,
      staff,
      mode,
      modes: VISUAL_UI_MODES.map((m) => ({
        id: m.id,
        label: m.label,
        desc: m.desc,
        signature: !!m.signature,
      })),
    });
  }, [
    enabled,
    ents.data,
    ser.data,
    rel.data,
    grp.data,
    mem.data,
    rk.data,
    maskChars,
    maskAbil,
    maskArch,
    maskSeries,
    staff,
    mode,
  ]);
  const settled =
    !enabled || ((!ents.isPending || ents.isError) && (!ser.isPending || ser.isError));
  return { feed, settled };
}

export function CodexStage() {
  const { mode, setMode } = useUiMode();
  const themeCtx = useOptionalThemeContext();
  const auth = useOptionalAuth();
  const { pathname } = useLocation();
  const router = useRouter();
  const { motionActive } = useAppMotion();
  const enabled = mode === "codex" && !!auth?.user;
  const tab = codexTabForPath(pathname);
  const visible = enabled && tab !== null;
  const { feed, settled } = useCodexFeed(enabled);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [bootTab, setBootTab] = useState("home");
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  // Remember the last Codex page so "Back to Codex" returns to it.
  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(LAST_TAB_KEY, pathname);
    } catch {
      /* storage optional */
    }
  }, [visible, pathname]);

  const switchMode = useCallback(
    (next: string) => {
      const id = next as VisualUiMode;
      if (!VISUAL_UI_MODES.some((m) => m.id === id)) return;
      if (themeCtx) themeCtx.setPrimarySystem(id as PrimarySystem);
      else setMode(id);
    },
    [themeCtx, setMode],
  );

  // Publish feed + host before the frame boots; the Codex reads them synchronously.
  useEffect(() => {
    if (!enabled || !feed) return;
    window.__SCU_CODEX_FEED__ = feed;
    const win = frameRef.current?.contentWindow as CodexFrameWindow | null | undefined;
    try {
      win?.__codexFeedUpdate?.(feed);
    } catch {
      /* frame not ready */
    }
  }, [enabled, feed]);

  useEffect(() => {
    if (!enabled) return;
    window.__SCU_CODEX_HOST__ = {
      motion: motionActive,
      navigate: (path) => {
        const safe = safeCodexPath(path);
        if (safe) void router.navigate({ to: safe });
      },
      route: (path) => {
        const safe = safeCodexPath(path);
        if (safe && safe !== pathRef.current && codexTabForPath(safe)) {
          void router.navigate({ to: safe, replace: true });
        }
      },
      setMode: switchMode,
      ready: () => setLoaded(true),
    };
  }, [enabled, motionActive, router, switchMode]);

  useEffect(() => {
    if (!enabled) {
      setMounted(false);
      setLoaded(false);
      delete window.__SCU_CODEX_HOST__;
      delete window.__SCU_CODEX_FEED__;
      return;
    }
    if (mounted) return;
    const boot = () => {
      setBootTab(tabRef.current ?? "home");
      setMounted(true);
    };
    if (settled && feed) {
      boot();
      return;
    }
    // Never hold the Codex hostage to a slow archive: boot with what is cached.
    const t = window.setTimeout(boot, 2500);
    return () => window.clearTimeout(t);
  }, [enabled, settled, feed, mounted]);

  // App URL changed (back button, links) -> move the Codex to the matching tab.
  useEffect(() => {
    if (!mounted || !loaded || !tab) return;
    const win = frameRef.current?.contentWindow as CodexFrameWindow | null | undefined;
    try {
      win?.__codexGoto?.(tab);
    } catch {
      /* frame navigating */
    }
  }, [mounted, loaded, tab]);

  // The page underneath must not scroll while the Codex covers it.
  useEffect(() => {
    if (!visible) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [visible]);

  if (!enabled) return null;
  return (
    <div
      className="codex-stage"
      data-visible={visible ? "true" : "false"}
      data-loaded={loaded ? "true" : "false"}
      aria-hidden={visible ? undefined : true}
      data-testid="codex-stage"
    >
      {mounted && (
        <iframe
          ref={frameRef}
          title="SCU Codex"
          src={`/codex/index.html#/${bootTab}`}
          className="codex-frame"
          onLoad={() => setLoaded(true)}
          tabIndex={visible ? 0 : -1}
        />
      )}
      <div className="codex-veil" aria-hidden="true">
        <span className="codex-veil-orb" />
        <span className="codex-veil-label">Opening the Codex</span>
      </div>
    </div>
  );
}

/** Shown on app-only pages while the Codex style is active. */
export function CodexReturnBar() {
  const { mode } = useUiMode();
  const auth = useOptionalAuth();
  const { pathname } = useLocation();
  const router = useRouter();
  if (mode !== "codex" || !auth?.user || codexTabForPath(pathname) !== null) return null;
  const back = () => {
    let to = "/";
    try {
      to = safeCodexPath(sessionStorage.getItem(LAST_TAB_KEY)) ?? "/";
    } catch {
      to = "/";
    }
    void router.navigate({ to });
  };
  return (
    <button type="button" className="codex-return" onClick={back} data-testid="codex-return">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 L20 12 L12 21 L4 12 Z" />
      </svg>
      <span>Back to Codex</span>
    </button>
  );
}
