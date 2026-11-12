-- 0011_merge_characters_and_seed_series_rosters.sql
-- 1) Merge duplicate character cards into canonical story-name cards,
--    re-homing lore_notes, memberships, relations, and series characters.
-- 2) Update entity_name_aliases to permanently block re-creation and redirect future imports.
-- 3) Upsert canonical series including Standalone Epics.
-- 4) Link characters to their series and season rosters.

DO $$
DECLARE
  rec RECORD;
  p_id uuid;
  s_id uuid;
BEGIN
  FOR rec IN (
    SELECT * FROM (VALUES
      ('zayn', 'zayn hayes'),
      ('jubayer', 'zayn hayes'),
      ('bunny', 'ethan'),
      ('robin', 'ethan'),
      ('ethan thorne', 'ethan'),
      ('echan', 'ethan'),
      ('robi', 'elizah'),
      ('tamim', 'david'),
      ('dawood', 'david'),
      ('alt david', 'alter david'),
      ('marufa', 'xinea'),
      ('nyxia', 'xinea'),
      ('nyxia vale', 'xinea'),
      ('prime nyxia', 'xinea'),
      ('nawshin', 'valeria'),
      ('nisha', 'nilanjona'),
      ('ela', 'grace'),
      ('vanguard', 'derek miles'),
      ('rifat', 'derek miles'),
      ('derek', 'derek miles'),
      ('sammam', 'samuel sterling'),
      ('samuel', 'samuel sterling'),
      ('luba', 'maliha'),
      ('ariyan', 'aariz maddox'),
      ('aariz', 'aariz maddox'),
      ('nusrat', 'saya'),
      ('madhobi', 'nytheris'),
      ('humayra', 'amaya'),
      ('shakti', 'yoshiko arashi'),
      ('yoshiko', 'yoshiko arashi'),
      ('john', 'dorian cross'),
      ('john liam', 'dorian cross'),
      ('dorian', 'dorian cross'),
      ('liam', 'eldrich aldercrest'),
      ('liam aldercrest', 'eldrich aldercrest'),
      ('eldrich', 'eldrich aldercrest'),
      ('agnus', 'altan el-mansur'),
      ('agnus el-mansur', 'altan el-mansur'),
      ('mubasshir', 'evan grant'),
      ('aeric', 'aeric valenheart'),
      ('alistair graye', 'alistair quinn'),
      ('maverick', 'sean stone'),
      ('shina', 'shina nasrin'),
      ('major general stitch', 'stitch'),
      ('jessy', 'asetra'),
      ('anna', 'anna al-ahd'),
      ('anna la sarta', 'anna al-ahd'),
      ('zaan al-murad', 'zaan'),
      ('mashiho', 'mashiho kurohana'),
      ('kurahana kazumi', 'kazumi kurahana'),
      ('ayaan', 'ayaan siddique'),
      ('ayaan siddiqi', 'ayaan siddique'),
      ('ayman', 'ayaan siddique'),
      ('ayman siddiqi', 'ayaan siddique'),
      ('issabela', 'issabela al-ahd'),
      ('zaynab', 'issabela al-ahd'),
      ('zaynab al-ahd', 'issabela al-ahd'),
      ('ramij', 'ramiz al-ahd'),
      ('rahim al-ahd', 'ramiz al-ahd'),
      ('silas', 'silas duskmoor'),
      ('silas eldercrest', 'silas duskmoor'),
      ('silas aldercrest', 'silas duskmoor'),
      ('tedmond', 'tedmond duskmoor'),
      ('soa', 'soa aldercrest'),
      ('corvani', 'marcello corvani'),
      ('victor', 'william victor'),
      ('nasab ibn khalil', 'francisco'),
      ('rohan', 'damian brown'),
      ('rohan aldercrest', 'damian brown'),
      ('damian', 'damian brown'),
      ('fahad', 'rowan colloway'),
      ('fahad duskmoor', 'rowan colloway'),
      ('rowan', 'rowan colloway'),
      ('rowan duskmoor', 'rowan colloway'),
      ('rowan calloway', 'rowan colloway'),
      ('weston', 'weston hale'),
      ('rafi', 'weston hale')
    ) AS t(sec_name, prim_name)
  ) LOOP
    SELECT id INTO s_id FROM public.entities WHERE lower(btrim(name)) = rec.sec_name;
    SELECT id INTO p_id FROM public.entities WHERE lower(btrim(name)) = rec.prim_name;
    IF s_id IS NOT NULL AND p_id IS NOT NULL AND s_id <> p_id THEN
      -- Re-point lore_notes
      UPDATE public.lore_notes SET entity_id = p_id WHERE entity_id = s_id;
      -- Re-point entity_memberships
      IF to_regclass('public.entity_memberships') IS NOT NULL THEN
        DELETE FROM public.entity_memberships a
        USING public.entity_memberships b
        WHERE a.character_id = s_id AND b.character_id = p_id AND a.group_id = b.group_id;
        UPDATE public.entity_memberships SET character_id = p_id WHERE character_id = s_id;
        DELETE FROM public.entity_memberships a
        USING public.entity_memberships b
        WHERE a.group_id = s_id AND b.group_id = p_id AND a.character_id = b.character_id;
        UPDATE public.entity_memberships SET group_id = p_id WHERE group_id = s_id;
      END IF;
      -- Re-point entity_relations
      IF to_regclass('public.entity_relations') IS NOT NULL THEN
        UPDATE public.entity_relations SET source_id = p_id WHERE source_id = s_id;
        UPDATE public.entity_relations SET target_id = p_id WHERE target_id = s_id;
      END IF;
      -- Re-point series_characters
      IF to_regclass('public.remap_series_characters') IS NOT NULL THEN
        PERFORM public.remap_series_characters(p_id, s_id);
      END IF;
      -- Remove secondary entity
      DELETE FROM public.entities WHERE id = s_id;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.entity_name_aliases (alias_norm, canonical_name) VALUES
  ('aariz', 'aariz maddox'),
  ('anna', 'anna al-ahd'),
  ('corvani', 'marcello corvani'),
  ('damian', 'damian brown'),
  ('dorian', 'dorian cross'),
  ('eldrich', 'eldrich aldercrest'),
  ('silas', 'silas duskmoor'),
  ('soa', 'soa aldercrest'),
  ('tedmond', 'tedmond duskmoor'),
  ('yoshiko', 'yoshiko arashi'),
  ('samuel', 'samuel sterling'),
  ('ayaan siddiqi', 'ayaan siddique'),
  ('ayman siddiqi', 'ayaan siddique'),
  ('prime nyxia', 'xinea'),
  ('sparda', 'prince of demons (sparda)'),
  ('prince of demons', 'prince of demons (sparda)'),
  ('the forgotten ones', 'hidden ones'),
  ('derek', 'derek miles')
ON CONFLICT (alias_norm) DO NOTHING;

INSERT INTO public.series (id, title, description, season_count, season_names, genres, timeline_note)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'The Sentinels', 'The flagship saga of the Sentinels Cinematic Universe covering the rising heroes, fractured loyalties, and existential conflicts across 5 seasons.', 5, ARRAY['Season 1', 'Season 2', 'Season 3', 'Season 4', 'Season 5'], ARRAY['Superhero', 'Dark Fantasy', 'Sci-Fi', 'Action'], 'The modern anchor of the SCU timeline (S1 to S5).'),
  ('00000000-0000-4000-a000-000000000002', 'Redline', 'High-octane underground racing and black-ops combat following Marcello Corvani, Orion, and the Redline team across dimensions.', 2, ARRAY['Season 1', 'Season 2'], ARRAY['Action', 'Cyberpunk', 'Sci-Fi', 'Thriller'], 'Prior to and concurrent with early Sentinels eras; dimension breach ~2005 to 2025.'),
  ('00000000-0000-4000-a000-000000000003', 'Bloodline', 'The ancestral chronicles, sacred oaths, and ancient bloodlines of the Nine Clans dating back to antiquity.', 1, ARRAY['Season 1'], ARRAY['Mythical', 'Dark Fantasy', 'Occult', 'Drama'], 'Ancient origins, 380 BC to late medieval era (1417).'),
  ('00000000-0000-4000-a000-000000000004', 'Divine Beast', 'The awakening of primal elemental guardians and catastrophic clashes with Diablo and demonkind.', 1, ARRAY['Season 1'], ARRAY['Fantasy', 'Action', 'Supernatural'], 'Primal and mythic eras; the origins of elemental wardens.'),
  ('00000000-0000-4000-a000-000000000005', 'Standalone Epics', 'Character-defining historical chronicles: the resurrection trials of Zaan al-Murad, Khalid''s Nullborn saga, and Alister Quinn''s forbidden science.', 3, ARRAY['Zaan', 'Khalid', 'Alister'], ARRAY['Mystery', 'Thriller', 'Dark Fantasy', 'Psychological'], '15th century through 1904 Hayrabad; individual standalone journeys.')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  season_count = EXCLUDED.season_count,
  season_names = EXCLUDED.season_names,
  genres = EXCLUDED.genres,
  timeline_note = EXCLUDED.timeline_note;

WITH sc_seed(s_id, c_name, arc, role, st) AS (
  VALUES
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Ethan', 'Lead protagonist', 'Main Protagonist S1 & S5', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Zayn Hayes', 'Protagonist', 'Dorian''s Red Lightning', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Xinea', 'Protagonist', 'Aether Dominion & Sentinel Leader', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Samuel Sterling', 'Anti-hero', 'Solo Vigilante (Ghost-01)', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'David', 'Support', 'Portal Dagger Specialist', 'Dead'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Maliha', 'Support', 'Healer & Tech Specialist', 'Dead'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Stitch', 'Antagonist', 'ECAP Director & Control Obsession', 'Dead'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'William Victor', 'Support', 'Head of ECAP', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Ayaan Siddique', 'Support', 'Tech Specialist', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Asetra', 'Main antagonist', 'Architect Shadow Threat', 'Missing'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Valeria', 'Antagonist', 'Ravenblade / Nullborn', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Grace', 'Support', 'Healer / Athena''s Judgement', 'Retired'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Elizah', 'Lead protagonist', 'Gravitational Center S2-S3', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Arzuna', 'Main antagonist', 'Arzuna vs Sentinels', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Altan El-Mansur', 'Legend', 'Family Protector & Guardian', 'Dead'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Yoshiko Arashi', 'Support', 'Seraph of the Ash', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Aariz Maddox', 'Support', 'Beast Lineage', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Silas Duskmoor', 'Legend', 'Ancient Duskmoor Patriarch', 'Dead'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Arthur', 'Main antagonist', 'Dragonic Lineage Nemesis', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Rowan Colloway', 'Protagonist', 'Red/Blue Flame', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Zaan', 'Legend', 'Cursed Prodigy Ally', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Marcello Corvani', 'Support', 'Whale / Moral Anchor', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Niharo', 'Main antagonist', 'Omni-Ergon Villain S4-S5', 'Dead'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Nilanjona', 'Legend', 'Water Guardian', 'Retired'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Aeric Valenheart', 'Support', 'Pocket Dimension Survivor', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Derek Miles', 'Support', 'Vanguard Commander', 'Alive'),
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Eldrich Aldercrest', 'Legend', 'Shadow Guardian of the Throne', 'Alive'),
    -- Redline
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Marcello Corvani', 'Lead protagonist', 'Redline Team Leader / Whale', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Orion', 'Protagonist', 'Circo del Miracolo Recruit', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Aeric Valenheart', 'Protagonist', 'Dimension Breach Specialist', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Alter David', 'Main antagonist', 'Alternate Reality Threat', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Weston Hale', 'Support', 'Combat Veteran', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Sean Stone', 'Legend', 'Maverick Title Line', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Stitch', 'Antagonist', 'Shadow Overseer', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'William Victor', 'Support', 'ECAP Liaison', 'Alive'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Ethan', 'Support', 'Rescued Ally S2', 'Alive'),
    -- Bloodline
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Ramiz Al-Ahd', 'Lead protagonist', 'Al-Ahd Patriarch', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Anna Al-Ahd', 'Protagonist', 'Bloodline Protector', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Issabela Al-Ahd', 'Protagonist', 'Keeper of the Oaths', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Altan El-Mansur', 'Legend', 'El-Mansur Lineage', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Eldrich Aldercrest', 'Legend', 'Aldercrest Founder', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Silas Duskmoor', 'Legend', 'Duskmoor Clan Head', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Tedmond Duskmoor', 'Legend', 'Anchor Zero Legend', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Mashiho Kurohana', 'Support', 'Kurohana Clan Elder', 'Alive'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Kazumi Kurahana', 'Support', 'Twin Blade of Kurohana', 'Alive'),
    -- Divine Beast
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Nilanjona', 'Lead protagonist', 'Origin of the Water Guardian', 'Alive'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Ethan', 'Protagonist', 'Wind Guardian Lineage', 'Alive'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Aariz Maddox', 'Protagonist', 'Nature Guardian Lineage', 'Alive'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Saya', 'Support', 'Disciple of Nytheris', 'Alive'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Yoshiko Arashi', 'Legend', 'Seraph of the Ash & Dragon Slayer', 'Alive'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Arthur', 'Main antagonist', 'Dragon Heir', 'Alive'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Prince of Demons (Sparda)', 'Antagonist', 'Prince of Demons', 'Alive'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Diablo', 'Main antagonist', 'Primal Calamity', 'Alive'),
    -- Standalone Epics
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Zaan', 'Lead protagonist', 'The Cursed Prodigy (Zaan)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Shina Nasrin', 'Support', 'Zaan''s Companion (Zaan)', 'Dead'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Ayesha Khatoon', 'Support', 'Grandma Ayesha (Zaan)', 'Dead'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Raisa bint Khalid', 'Antagonist', 'Forbidden Science Rival (Zaan)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Alistair Quinn', 'Lead protagonist', 'Colleague & Alister Lead', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Dirham', 'Support', 'Village Ally (Zaan)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Khalid', 'Lead protagonist', 'Survivor of the Nullborn (Khalid)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Francisco', 'Support', 'Nasab ibn Khalil (Khalid)', 'Dead'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Hisham', 'Support', 'Fallen Comrade (Khalid)', 'Dead'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Anna Al-Ahd', 'Support', 'Protector (Khalid)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Ramiz Al-Ahd', 'Legend', 'Al-Ahd Leader (Khalid)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Issabela Al-Ahd', 'Support', 'Allied Survivor (Khalid)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Dorian Cross', 'Support', 'Shadow Ally (Khalid & Alister)', 'Alive'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Eldrich Aldercrest', 'Support', 'Long-Lived Caster (Alister)', 'Alive')
)
INSERT INTO public.series_characters (series_id, character_id, arc_role, role_in_series, status)
SELECT seed.s_id, e.id, seed.arc, seed.role, seed.st
FROM sc_seed seed
JOIN public.entities e ON lower(btrim(e.name)) = lower(btrim(seed.c_name)) AND e.kind = 'character'
ON CONFLICT (series_id, character_id) DO UPDATE SET
  arc_role = EXCLUDED.arc_role,
  role_in_series = EXCLUDED.role_in_series,
  status = EXCLUDED.status;
