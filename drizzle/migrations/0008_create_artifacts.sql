CREATE TABLE public.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'weapon',
  weapon_type text,
  wielders text[] NOT NULL DEFAULT '{}',
  materials text,
  colors text,
  curse_level integer NOT NULL DEFAULT 0,
  how_it_works text NOT NULL DEFAULT '',
  lore text NOT NULL DEFAULT '',
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX artifacts_name_key ON public.artifacts (lower(btrim(name)));
GRANT SELECT ON public.artifacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifacts TO authenticated;
GRANT ALL ON public.artifacts TO service_role;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read artifacts" ON public.artifacts FOR SELECT USING (true);
CREATE POLICY "Staff insert artifacts" ON public.artifacts FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update artifacts" ON public.artifacts FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete artifacts" ON public.artifacts FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));