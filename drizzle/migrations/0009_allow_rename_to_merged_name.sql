CREATE OR REPLACE FUNCTION public.block_merged_entity_names()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE canon text; new_norm text; old_norm text;
BEGIN
  new_norm := lower(regexp_replace(btrim(NEW.name), '\s+', ' ', 'g'));
  SELECT canonical_name INTO canon FROM public.entity_name_aliases WHERE alias_norm = new_norm;
  IF TG_OP = 'UPDATE' THEN
    old_norm := lower(regexp_replace(btrim(OLD.name), '\s+', ' ', 'g'));
    IF old_norm <> new_norm AND (canon IS NULL OR lower(btrim(canon)) = old_norm) THEN
      -- Staff renamed a card (e.g. back to an earlier name): the new name becomes canonical
      DELETE FROM public.entity_name_aliases WHERE alias_norm = new_norm;
      UPDATE public.entity_name_aliases SET canonical_name = NEW.name WHERE lower(btrim(canonical_name)) = old_norm;
      INSERT INTO public.entity_name_aliases(alias_norm, canonical_name) VALUES (old_norm, NEW.name)
        ON CONFLICT (alias_norm) DO UPDATE SET canonical_name = EXCLUDED.canonical_name;
      RETURN NEW;
    END IF;
  END IF;
  IF canon IS NOT NULL AND new_norm <> lower(btrim(canon)) THEN
    RAISE EXCEPTION '"%" was merged into "%". Edit that card instead of creating a new one.', NEW.name, canon;
  END IF;
  RETURN NEW;
END $function$;