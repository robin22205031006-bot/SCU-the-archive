DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('series','public read series'),('character_relationships','public read character_relationships'),
    ('timeline_events','public read timeline_events'),('entity_memberships','public read entity_memberships'),
    ('posts','public read posts'),('artifacts','Anyone can read artifacts'),
    ('character_abilities','members read character_abilities'),('post_votes','public read post_votes'),
    ('entity_name_aliases','Anyone signed in can read aliases'),('series_characters','public read series_characters')) v(t,p)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.p, r.t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND NOT public.is_banned(auth.uid()))', r.p, r.t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "vault files read" ON storage.objects;
CREATE POLICY "vault files read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vault' AND auth.uid() IS NOT NULL AND (
  owner = auth.uid() OR public.is_staff(auth.uid()) OR (
    NOT public.is_banned(auth.uid()) AND EXISTS (SELECT 1 FROM public.vault_documents d WHERE d.file_path = objects.name AND d.is_public AND d.downloadable))));