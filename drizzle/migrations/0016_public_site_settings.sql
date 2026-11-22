-- 0016_public_site_settings.sql
-- The home page is public, so the admin-edited branding and announcement banner
-- (app_settings key 'site_public', see src/lib/site-customize.ts) must be readable by
-- signed-out visitors. Only that one key is exposed; every other setting stays
-- signed-in only (0012). Writes stay admin-only (0015).
DROP POLICY IF EXISTS "anyone read site_public" ON public.app_settings;
CREATE POLICY "anyone read site_public" ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key = 'site_public');
