import { supabase } from "@/integrations/supabase/client";
import { mergeCharacterCards } from "../lib/character-card-merge";
import { ENTITY_SUMMARY_COLUMNS, withEntitySummaryDefaults, type Entity } from "@/lib/entities";

export const scuCache = {
  async getCharacters() {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from("entities")
          .select(ENTITY_SUMMARY_COLUMNS)
          .eq("kind", "character");
        if (!error && data) {
          const raw = (data as Partial<Entity>[]).map(withEntitySummaryDefaults);
          const merged = mergeCharacterCards(raw);
          localStorage.setItem("scu_characters_cache", JSON.stringify(merged));
          return merged;
        }
      } catch (err) {
        console.warn("Network query failed, reading offline cache:", err);
      }
    }
    const cached = localStorage.getItem("scu_characters_cache");
    const list = cached ? JSON.parse(cached) : [];
    return mergeCharacterCards(list);
  },

  async getOrganizations() {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from("entities")
          .select(ENTITY_SUMMARY_COLUMNS)
          .eq("kind", "organization");
        if (!error && data) {
          const raw = (data as Partial<Entity>[]).map(withEntitySummaryDefaults);
          localStorage.setItem("scu_organizations_cache", JSON.stringify(raw));
          return raw;
        }
      } catch (err) {
        console.warn("Network query failed, reading offline cache:", err);
      }
    }
    const cached = localStorage.getItem("scu_organizations_cache");
    return cached ? JSON.parse(cached) : [];
  },

  async getTimeline() {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.from("timeline_events").select("*");
        if (!error && data) {
          localStorage.setItem("scu_timeline_cache", JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn("Network query failed, reading offline cache:", err);
      }
    }
    const cached = localStorage.getItem("scu_timeline_cache");
    return cached ? JSON.parse(cached) : [];
  },

  async preloadAllParallel() {
    const [characters, organizations, timeline] = await Promise.all([
      this.getCharacters(),
      this.getOrganizations(),
      this.getTimeline(),
    ]);
    return { characters, organizations, timeline };
  },
};
