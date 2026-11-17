ALTER TABLE public.character_seasons ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.series(id) ON DELETE CASCADE;
ALTER TABLE public.character_seasons DROP CONSTRAINT IF EXISTS character_seasons_char_season_unique;
ALTER TABLE public.character_seasons ADD CONSTRAINT character_seasons_char_series_season_unique UNIQUE NULLS NOT DISTINCT (character_id, series_id, season_number);
CREATE INDEX IF NOT EXISTS character_seasons_character_idx ON public.character_seasons (character_id);

GRANT SELECT ON public.factions, public.characters, public.character_seasons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.factions, public.characters, public.character_seasons TO authenticated;
GRANT ALL ON public.factions, public.characters, public.character_seasons TO service_role;

CREATE OR REPLACE FUNCTION public.scu_clamp(v jsonb) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN v IS NULL OR jsonb_typeof(v) NOT IN ('number','string') OR (v #>> '{}') !~ '^-?[0-9]+(\.[0-9]+)?$' THEN 0
    ELSE greatest(0, least(100, round((v #>> '{}')::numeric)::int)) END $$;

CREATE OR REPLACE FUNCTION public.scu_status(s text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN s IN ('Alive','Sealed','Dead','Missing','Presumed Dead') THEN s ELSE 'Alive' END $$;

CREATE OR REPLACE FUNCTION public.scu_slug(n text, id uuid) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(nullif(trim(both '-' from regexp_replace(lower(n), '[^a-z0-9]+', '-', 'g')), ''), 'c') || '-' || left(id::text, 8) $$;

-- entities -> new tables
CREATE OR REPLACE FUNCTION public.scu_sync_from_entity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text; d jsonb; sid uuid; sn int; base jsonb;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF TG_OP = 'DELETE' THEN
    DELETE FROM characters WHERE id = OLD.id;
    IF OLD.kind = 'faction' THEN DELETE FROM factions WHERE id = OLD.id; END IF;
    RETURN NULL;
  END IF;
  IF NEW.kind = 'faction' THEN
    INSERT INTO factions (id, name, description, status)
    VALUES (NEW.id, NEW.name, NEW.description,
      CASE WHEN NEW.status IN ('Active','Collapsing','Underground','Dissolved') THEN NEW.status ELSE 'Active' END)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status;
  ELSIF NEW.kind = 'character' THEN
    INSERT INTO characters (id, slug, name, real_name, faction_id, avatar_url, bio)
    VALUES (NEW.id, scu_slug(NEW.name, NEW.id), NEW.name, NEW.alias,
      (SELECT f.id FROM factions f WHERE f.id = NEW.parent_id), NEW.image_url, NEW.description)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, real_name = EXCLUDED.real_name,
      faction_id = EXCLUDED.faction_id, avatar_url = EXCLUDED.avatar_url, bio = EXCLUDED.bio;
    base := coalesce(NEW.stats, '{}'::jsonb);
    DELETE FROM character_seasons WHERE character_id = NEW.id;
    IF jsonb_typeof(base->'dossier') = 'object' THEN
      FOR k, d IN SELECT * FROM jsonb_each(base->'dossier') LOOP
        IF k ~ '^[0-9a-f-]{36}:[0-9]+$' AND jsonb_typeof(d) = 'object' THEN
          sid := split_part(k, ':', 1)::uuid; sn := split_part(k, ':', 2)::int;
          IF NOT EXISTS (SELECT 1 FROM series WHERE id = sid) THEN sid := NULL; END IF;
          INSERT INTO character_seasons (character_id, series_id, season_number, status, power, agility, tactical_iq,
            clan_mastery, weapon_proficiency, wisdom, vitality, equipped_weapons, rank_abilities)
          VALUES (NEW.id, sid, sn, scu_status(coalesce(d->>'status', NEW.status)),
            scu_clamp(coalesce(d->'stats'->'power', base->'power')), scu_clamp(coalesce(d->'stats'->'agility', base->'agility')),
            scu_clamp(coalesce(d->'stats'->'tactical_iq', base->'tactical_iq')), scu_clamp(coalesce(d->'stats'->'clan_mastery', base->'clan_mastery')),
            scu_clamp(coalesce(d->'stats'->'weapon_proficiency', base->'weapon_proficiency')), scu_clamp(coalesce(d->'stats'->'wisdom', base->'wisdom')),
            scu_clamp(coalesce(d->'stats'->'vitality', base->'vitality')),
            CASE WHEN jsonb_typeof(d->'weapons') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(d->'weapons')) ELSE '{}' END,
            CASE WHEN jsonb_typeof(d->'abilityKeys') = 'array' THEN d->'abilityKeys' ELSE '[]'::jsonb END)
          ON CONFLICT ON CONSTRAINT character_seasons_char_series_season_unique DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NULL;
END $$;

-- new tables -> entities
CREATE OR REPLACE FUNCTION public.scu_sync_to_entity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; k text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'factions' THEN
    IF TG_OP = 'DELETE' THEN DELETE FROM entities WHERE id = OLD.id AND kind = 'faction'; RETURN NULL; END IF;
    INSERT INTO entities (id, kind, name, description, status) VALUES (NEW.id, 'faction', NEW.name, coalesce(NEW.description, ''), NEW.status)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = now();
  ELSIF TG_TABLE_NAME = 'characters' THEN
    IF TG_OP = 'DELETE' THEN DELETE FROM entities WHERE id = OLD.id AND kind = 'character'; RETURN NULL; END IF;
    INSERT INTO entities (id, kind, name, alias, description, image_url, parent_id)
    VALUES (NEW.id, 'character', NEW.name, NEW.real_name, coalesce(NEW.bio, ''), NEW.avatar_url, NEW.faction_id)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, alias = EXCLUDED.alias, description = EXCLUDED.description,
      image_url = EXCLUDED.image_url, parent_id = coalesce(EXCLUDED.parent_id, entities.parent_id), updated_at = now();
  ELSE
    IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
    k := coalesce(r.series_id::text, 'all') || ':' || r.season_number;
    IF r.series_id IS NULL THEN k := 'all'; END IF;
    IF TG_OP = 'DELETE' THEN
      UPDATE entities SET stats = stats #- ARRAY['dossier', k], updated_at = now() WHERE id = r.character_id;
    ELSE
      UPDATE entities SET stats = jsonb_set(CASE WHEN jsonb_typeof(stats->'dossier') = 'object' THEN stats ELSE jsonb_set(stats, '{dossier}', '{}'::jsonb) END,
        ARRAY['dossier', k],
        coalesce(stats->'dossier'->k, '{}'::jsonb) || jsonb_build_object('status', r.status,
          'weapons', to_jsonb(r.equipped_weapons), 'abilityKeys', r.rank_abilities,
          'stats', jsonb_build_object('power', r.power, 'agility', r.agility, 'tactical_iq', r.tactical_iq,
            'clan_mastery', r.clan_mastery, 'weapon_proficiency', r.weapon_proficiency, 'wisdom', r.wisdom, 'vitality', r.vitality))),
        updated_at = now()
      WHERE id = r.character_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.scu_sync_from_entity(), public.scu_sync_to_entity() FROM PUBLIC, anon, authenticated;

-- backfill (factions first so character faction links resolve)
INSERT INTO public.factions (id, name, description, status)
SELECT DISTINCT ON (lower(name)) id, name, description,
  CASE WHEN status IN ('Active','Collapsing','Underground','Dissolved') THEN status ELSE 'Active' END
FROM public.entities WHERE kind = 'faction' ORDER BY lower(name), created_at
ON CONFLICT DO NOTHING;

CREATE TRIGGER scu_entities_sync AFTER INSERT OR UPDATE OR DELETE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.scu_sync_from_entity();
UPDATE public.entities SET updated_at = updated_at WHERE kind = 'character';

CREATE TRIGGER scu_factions_sync AFTER INSERT OR UPDATE OR DELETE ON public.factions
  FOR EACH ROW EXECUTE FUNCTION public.scu_sync_to_entity();
CREATE TRIGGER scu_characters_sync AFTER INSERT OR UPDATE OR DELETE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.scu_sync_to_entity();
CREATE TRIGGER scu_character_seasons_sync AFTER INSERT OR UPDATE OR DELETE ON public.character_seasons
  FOR EACH ROW EXECUTE FUNCTION public.scu_sync_to_entity();