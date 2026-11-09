import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-admin";

/**
 * Site-wide spoiler mask controlled by admins/moderators.
 * "characters" hides status, role, abilities and skills on character cards;
 * "abilities" hides the names of ability holders in the Abilities Hub.
 */
export type SpoilerScope = "characters" | "abilities" | "archive";
type MaskValue = Partial<Record<SpoilerScope, boolean>>;
const KEY = "spoiler_mask";
const QK = ["app-settings", KEY];

export function useSpoilerMask(scope: SpoilerScope): boolean {
  const { data } = useQuery({
    queryKey: QK,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", KEY)
        .maybeSingle();
      return ((data?.value ?? {}) as MaskValue) || {};
    },
  });
  const on = !!data?.[scope];
  useEffect(() => {
    const attr = `data-spoil-${scope}`;
    if (on) document.documentElement.setAttribute(attr, "");
    else document.documentElement.removeAttribute(attr);
    return () => document.documentElement.removeAttribute(attr);
  }, [on, scope]);
  return on;
}

export function SpoilerToggle({ scope }: { scope: SpoilerScope }) {
  const isStaff = useIsStaff();
  const qc = useQueryClient();
  const on = useSpoilerMask(scope);
  if (!isStaff) return null;
  const toggle = async () => {
    const current = (qc.getQueryData<MaskValue>(QK) ?? {}) as MaskValue;
    const next = { ...current, [scope]: !on };
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: KEY, value: next, updated_at: new Date().toISOString() });
    if (error) {
      toast.error("Couldn't change the spoiler setting");
      return;
    }
    qc.setQueryData(QK, next);
    toast.success(on ? "Spoilers now visible to everyone" : "Spoilers hidden for everyone");
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${on ? "border-accent/60 bg-accent/15 text-accent" : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"}`}
    >
      {on ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {on ? "Spoilers hidden" : "Spoilers shown"}
    </button>
  );
}
