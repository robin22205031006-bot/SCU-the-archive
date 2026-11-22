-- 0015_app_settings_admin_writes.sql
-- app_settings writes were open to every staff member (admin OR moderator) since 0000,
-- although the app only lets admins edit most settings (fonts, wallpapers, audio,
-- reader toggles, ability registry). A moderator could therefore change any key at the
-- database level, including the custom font stylesheet loaded into every page.
-- Writes are now admin-only, except the four keys moderators legitimately edit in the
-- app: spoiler masks, series title styles, series order and emblem presentation.
-- Reads are unchanged (signed-in, non-banned, from 0012).

DROP POLICY IF EXISTS "staff insert app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "staff update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "staff delete app_settings" ON public.app_settings;

DROP POLICY IF EXISTS "admins insert app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admins update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admins delete app_settings" ON public.app_settings;
CREATE POLICY "admins insert app_settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins update app_settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins delete app_settings" ON public.app_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "staff insert shared app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "staff update shared app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "staff delete shared app_settings" ON public.app_settings;
CREATE POLICY "staff insert shared app_settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid())
    AND key IN ('spoiler_mask', 'series_styles', 'series_order', 'nexus_symbol_presentation'));
CREATE POLICY "staff update shared app_settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())
    AND key IN ('spoiler_mask', 'series_styles', 'series_order', 'nexus_symbol_presentation'))
  WITH CHECK (public.is_staff(auth.uid())
    AND key IN ('spoiler_mask', 'series_styles', 'series_order', 'nexus_symbol_presentation'));
CREATE POLICY "staff delete shared app_settings" ON public.app_settings FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid())
    AND key IN ('spoiler_mask', 'series_styles', 'series_order', 'nexus_symbol_presentation'));
