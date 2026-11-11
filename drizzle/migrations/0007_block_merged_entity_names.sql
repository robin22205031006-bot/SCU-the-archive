CREATE TABLE IF NOT EXISTS public.entity_name_aliases (
  alias_norm text PRIMARY KEY,
  canonical_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.entity_name_aliases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_name_aliases TO authenticated;
GRANT ALL ON public.entity_name_aliases TO service_role;
CREATE POLICY "Anyone signed in can read aliases" ON public.entity_name_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage aliases" ON public.entity_name_aliases FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
INSERT INTO public.entity_name_aliases (alias_norm, canonical_name) VALUES ('khalid ibn kharif','khalid'), ('khalid ibn sharif','khalid'), ('khalid el mansur','khalid'), ('ethan thorne','ethan'), ('robin','ethan'), ('zaynab al-ahd','issabela al-ahd'), ('zaynab','issabela al-ahd'), ('nasab ibn khalil','francisco'), ('bunny','ethan'), ('zayn','zayn hayes'), ('jubayer','zayn hayes'), ('marufa','xinea'), ('nyxia','xinea'), ('nyxia vale','xinea'), ('nawshin','valeria'), ('nisha','nilanjona'), ('ela','grace'), ('rafi','weston hale'), ('weston','weston hale'), ('rohan','damian brown'), ('fahad','rowan colloway'), ('sammam','samuel sterling'), ('tamim','david'), ('dawood','david'), ('luba','maliha'), ('ariyan','aariz maddox'), ('nusrat','saya'), ('madhobi','nytheris'), ('humayra','amaya'), ('shakti','yoshiko arashi'), ('rifat','derek miles'), ('john','dorian cross'), ('john liam','dorian cross'), ('liam','eldrich aldercrest'), ('agnus','altan el-mansur'), ('mubasshir','evan grant'), ('aeric','aeric valenheart'), ('alistair graye','alistair quinn'), ('maverick','sean stone'), ('shina','shina nasrin'), ('major general stitch','stitch'), ('asetra','jessy'), ('anna la sarta','anna al-ahd'), ('zaan al-murad','zaan'), ('mashiho','mashiho kurohana'), ('kurahana kazumi','kazumi kurahana'), ('ayaan','ayaan siddique'), ('issabela','issabela al-ahd'), ('ayman','ayaan siddique'), ('echan','ethan'), ('ramij','ramiz al-ahd'), ('rahim al-ahd','ramiz al-ahd'), ('rahim al ahd','ramiz al-ahd'), ('dew','d.e.w.'), ('ecap','e.c.a.p.'), ('the covenant','covenant'), ('the hidden ones','hidden ones'), ('the umbral','the obsidians'), ('the 9 bloodlines','nine clans'), ('duskmoors','duskmoor'), ('duskmoor clan','duskmoor'), ('demon clan','demonic clan'), ('lucen vale','lucan vale') ON CONFLICT (alias_norm) DO NOTHING;
CREATE OR REPLACE FUNCTION public.block_merged_entity_names()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE canon text;
BEGIN
  SELECT canonical_name INTO canon FROM public.entity_name_aliases
   WHERE alias_norm = lower(regexp_replace(btrim(NEW.name), '\s+', ' ', 'g'));
  IF canon IS NOT NULL AND lower(btrim(NEW.name)) <> lower(btrim(canon)) THEN
    RAISE EXCEPTION '"%" was merged into "%". Edit that card instead of creating a new one.', NEW.name, canon;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS entities_block_merged_names ON public.entities;
CREATE TRIGGER entities_block_merged_names BEFORE INSERT OR UPDATE OF name ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.block_merged_entity_names();
CREATE UNIQUE INDEX IF NOT EXISTS entities_name_unique_norm ON public.entities (lower(btrim(name)));