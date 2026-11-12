import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsAdmin, useRoles } from "@/hooks/use-admin";
import {
  useNexusSymbolSettings,
  nexusSymbolSettingsQuery,
} from "@/hooks/use-nexus-symbol-settings";
import {
  NEXUS_SYMBOL_SETTINGS_KEY,
  canEditEmblemColors,
  resolveSymbolStyle,
  symbolKey,
  type NexusSymbolSettings,
} from "@/lib/nexus-symbol-settings";
import { allAbilityDefs } from "@/lib/abilities";
import { entitiesQuery } from "@/lib/entities";
import { TABS } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";

/** Uses the existing protected settings table; no local-only appearance writes. */
export function NexusPresentationEditor() {
  const admin = useIsAdmin();
  const staff = canEditEmblemColors(useRoles());
  const settings = useNexusSymbolSettings();
  const qc = useQueryClient();
  const { data: groups } = useQuery({
    ...entitiesQuery(["organization", "clan", "bloodline", "faction"]),
    enabled: staff,
  });
  const [name, setName] = useState("red_lightning");
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const [draftAnime, setDraftAnime] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  if (!staff) return null;
  const current = resolveSymbolStyle(settings, name);
  const color = draftColor ?? current.color ?? "#9d4edd";
  const anime = draftAnime ?? current.anime;
  const options = [
    ...allAbilityDefs().map((d) => ({ key: d.key, label: d.label })),
    ...(groups ?? []).map((g) => ({ key: g.name, label: `${g.name} · ${g.kind}` })),
    ...TABS.map((t) => ({ key: t.label, label: `${t.label} · Navigation` })),
  ];
  async function save(next: NexusSymbolSettings) {
    if (!staff || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert({
        key: NEXUS_SYMBOL_SETTINGS_KEY,
        value: next as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      qc.setQueryData(nexusSymbolSettingsQuery.queryKey, next);
      toast.success("Nexus presentation saved");
    } catch {
      toast.error("Could not save Nexus presentation");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="grid gap-4 border-t border-border px-4 py-5"
      aria-label="Nexus anime and emblem settings"
    >
      {admin && (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="nexus-anime-ui">Anime presentation · all Nexus tabs</Label>
          <Switch
            id="nexus-anime-ui"
            checked={settings.anime ?? false}
            disabled={busy}
            onCheckedChange={(v) => void save({ ...settings, anime: v })}
          />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="nexus-symbol-choice">Emblem / sign</Label>
        <select
          id="nexus-symbol-choice"
          value={name}
          className="h-10 max-w-full rounded-md border border-input bg-background px-2 text-sm"
          onChange={(e) => {
            setName(e.target.value);
            setDraftColor(null);
            setDraftAnime(null);
          }}
        >
          {options.map((o) => (
            <option key={`${o.key}:${o.label}`} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <NexusAbilitySymbol
          name={name}
          previewColor={color}
          previewAnime={anime}
          className="h-16 w-16"
        />
        <div className="grid flex-1 gap-2">
          <Label htmlFor="nexus-symbol-color">Emblem color</Label>
          <Input
            id="nexus-symbol-color"
            aria-label="Emblem color"
            type="color"
            value={color}
            onChange={(e) => setDraftColor(e.target.value)}
            className="h-10 w-full cursor-pointer p-1"
          />
        </div>
      </div>
      {admin && (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="nexus-symbol-anime">Anime version · selected symbol</Label>
          <Switch id="nexus-symbol-anime" checked={anime} onCheckedChange={setDraftAnime} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() =>
            void save({
              ...settings,
              symbols: {
                ...settings.symbols,
                [symbolKey(name)]: {
                  ...settings.symbols?.[symbolKey(name)],
                  color,
                  ...(admin ? { anime } : {}),
                },
              },
            })
          }
        >
          Save symbol
        </Button>
        <Button
          disabled={busy}
          variant="outline"
          onClick={() => {
            const symbols = { ...settings.symbols };
            const key = symbolKey(name);
            if (admin) delete symbols[key];
            else {
              const previous = symbols[key];
              if (previous?.anime !== undefined) symbols[key] = { anime: previous.anime };
              else delete symbols[key];
            }
            setDraftColor(null);
            setDraftAnime(null);
            void save({ ...settings, symbols });
          }}
        >
          Reset symbol
        </Button>
      </div>
    </section>
  );
}
