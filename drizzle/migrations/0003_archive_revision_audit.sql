CREATE TABLE public.archive_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 editor_id uuid,
 editor_name text NOT NULL,
 source_table text NOT NULL,
 record_id uuid NOT NULL,
 entity_id uuid,
 entity_name text NOT NULL,
 operation text NOT NULL,
 before_data jsonb,
 after_data jsonb
);
GRANT SELECT ON public.archive_revisions TO authenticated;
GRANT ALL ON public.archive_revisions TO service_role;
ALTER TABLE public.archive_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read_revisions ON public.archive_revisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX archive_revisions_record_time ON public.archive_revisions(source_table, record_id, recorded_at DESC);
CREATE OR REPLACE FUNCTION public.record_archive_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE old_doc jsonb; new_doc jsonb; doc jsonb; target uuid; target_name text; editor text;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_doc := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN new_doc := to_jsonb(NEW); END IF;
 IF TG_OP = 'UPDATE' AND (old_doc - 'updated_at') IS NOT DISTINCT FROM (new_doc - 'updated_at') THEN RETURN NEW; END IF;
 doc := COALESCE(new_doc,old_doc);
 IF TG_TABLE_NAME = 'entities' THEN target := (doc->>'id')::uuid; target_name := doc->>'name';
 ELSIF TG_TABLE_NAME = 'character_abilities' THEN target := (doc->>'entity_id')::uuid;
 ELSE target := (doc->>'character_id')::uuid; END IF;
 IF target_name IS NULL THEN SELECT name INTO target_name FROM public.entities WHERE id = target; END IF;
 SELECT COALESCE(NULLIF(display_name,''),NULLIF(email,'')) INTO editor FROM public.profiles WHERE id = auth.uid();
 INSERT INTO public.archive_revisions(editor_id,editor_name,source_table,record_id,entity_id,entity_name,operation,before_data,after_data)
 VALUES(auth.uid(),COALESCE(editor,CASE WHEN auth.uid() IS NULL THEN 'System' ELSE 'Editor ' || left(auth.uid()::text,8) END),TG_TABLE_NAME,(doc->>'id')::uuid,target,COALESCE(target_name,'Deleted entry'),TG_OP,old_doc,new_doc);
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_archive_revision() FROM PUBLIC;
CREATE TRIGGER audit_entities AFTER INSERT OR UPDATE OR DELETE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.record_archive_revision();
CREATE TRIGGER audit_character_abilities AFTER INSERT OR UPDATE OR DELETE ON public.character_abilities FOR EACH ROW EXECUTE FUNCTION public.record_archive_revision();
CREATE TRIGGER audit_series_characters AFTER INSERT OR UPDATE OR DELETE ON public.series_characters FOR EACH ROW EXECUTE FUNCTION public.record_archive_revision();