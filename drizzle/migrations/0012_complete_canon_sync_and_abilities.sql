-- 0012_complete_canon_sync_and_abilities.sql
-- 1) Fix reversed alias ('asetra' -> 'jessy') to ('jessy' -> 'asetra') and add all missing aliases.
-- 2) Ensure every canonical character and organization card exists (including Alistair Quinn, Sean Stone,
--    H.A.W.K.S., Corvani's Redline Team, Amaya, Evan Grant, Kensho Arashi, Prince of Demons (Sparda),
--    Eveline, Raya, Kaizen, Isagi, Abbas, Riven Creed, Mephisto, Arvin, Altan El-Mansur, Valeria, etc.).
-- 3) Merge any remaining duplicate character/group cards cleanly, re-homing notes, links, relations, and series.
-- 4) Seed unlocked character abilities and updated series rosters.

DO $$
BEGIN
  IF to_regclass('public.entity_name_aliases') IS NOT NULL THEN
    DELETE FROM public.entity_name_aliases
    WHERE alias_norm = 'asetra' AND canonical_name = 'jessy';

    INSERT INTO public.entity_name_aliases (alias_norm, canonical_name) VALUES
      ('jessy', 'asetra'),
      ('kazumi', 'kazumi kurahana'),
      ('pristine', 'elizabeth pristine'),
      ('elina', 'elina quins'),
      ('ghost', 'samuel sterling'),
      ('ramiz', 'ramiz al-ahd'),
      ('covenant leader', 'alter david'),
      ('the guardian', 'steven aldercrest'),
      ('arashi', 'kensho arashi'),
      ('mephistopheles', 'mephisto'),
      ('eldercrest', 'aldercrest')
    ON CONFLICT (alias_norm) DO UPDATE SET canonical_name = EXCLUDED.canonical_name;
  END IF;
END $$;

-- Ensure canonical target entities exist before merging secondaries into them.
WITH canon_seed(k, nm, al, rl, st, cat, ds) AS (
  VALUES
    ('character', 'Altan El-Mansur', 'Agnus · Agnus El-Mansur', 'Patriarch of El-Mansur', 'Dead', 'Legend', 'Patriarch of the El-Mansur family, Architect Cube Guardian, and wielder of Qahr al-Wujud.'),
    ('character', 'Rowan Colloway', 'Rowan · Fahad · Fahad Duskmoor', 'Duskmoor Heir', 'Alive', 'Protagonist', 'Wielder of Duskmoor Blue Flame and red fire, trained under Silas Duskmoor.'),
    ('character', 'William Victor', 'Victor', 'Chair of E.C.A.P.', 'Dead', 'Support', 'Co-founder of E.C.A.P. and veteran H.A.W.K.S. operative.'),
    ('character', 'Valeria', 'Nawshin · Ravenblade', 'Nullborn / Obsidians Leader', 'Alive', 'Anti-Hero', 'Founder of The Obsidians and master swordswoman trained by the Hidden Ones and Kensho Arashi.'),
    ('character', 'Nytheris', 'Madhobi', 'Nature Guardian', 'Legend', 'Support', 'Ancient Nature Guardian of the Elf Clan and mentor to Saya.'),
    ('character', 'Yoshiko Arashi', 'Yoshiko · Shakti', 'Seraph of the Ash', 'Alive', 'Support', 'Daughter of Kensho Arashi and twin sister of Kazumi; wields Shishjutsu corpse manipulation.'),
    ('character', 'Mashiho Kurohana', 'Mashiho', 'Kurohana & Kara Rebuilder', 'Alive', 'Support', 'Son of Pride who rebuilt the Kara clan with Kazumi before joining The Obsidians.'),
    ('character', 'Kazumi Kurahana', 'Kazumi · Kurahana Kazumi', 'Twin Blade of Kurohana', 'Alive', 'Support', 'Daughter of Kensho Arashi and twin sister of Yoshiko; joined The Obsidians.'),
    ('character', 'Ayaan Siddique', 'Ayaan · Ayaan Siddiqi · Ayman · Ayman Siddiqi', 'Redline Commanding Lead', 'Alive', 'Support', 'Tech specialist who rose from the support chair to Redline commanding lead.'),
    ('character', 'Ramiz Al-Ahd', 'Ramiz · Ramij · Rahim Al-Ahd', 'Al-Ahd Patriarch', 'Alive', 'Legend', 'Patriarch of the Al-Ahd clan and Architect Cube Guardian.'),
    ('character', 'Kensho Arashi', 'Arashi', 'Seraph Patriarch & Nullborn Leader', 'Dead', 'Legend', 'Father of Yoshiko and Kazumi; Nullborn leader slain at the start of Season 5.'),
    ('character', 'Alistair Quinn', 'Alistair Graye', 'Temporal Informant', 'Legend', 'Support', 'Victorian genius bound by Mephisto''s smile pact who warned Damian of Isaac Ezekiel.'),
    ('character', 'Sean Stone', 'Maverick', 'Founder of H.A.W.K.S.', 'Dead', 'Antagonist', 'Founder of H.A.W.K.S. who became the masked avenger Maverick after his unit''s betrayal.'),
    ('character', 'Prince of Demons (Sparda)', 'Sparda · Prince of Demons', 'Demonic Sovereign', 'Legend', 'Antagonist', 'Demonic sovereign of the primal realm: "Kneel—or be rewritten."'),
    ('character', 'Amaya', 'Humayra', 'Sentinels Ally', 'Alive', 'Support', 'Canonical story identity for Humayra in the SCU continuity.'),
    ('character', 'Evan Grant', 'Mubasshir', 'Sentinels Ally', 'Alive', 'Support', 'Canonical story identity for Mubasshir in the SCU continuity.'),
    ('character', 'Eveline', NULL, 'Sister of Alistair Quinn', 'Dead', 'Support', 'Sister of Alistair Quinn who died after Mephisto revealed the truth of his pact.'),
    ('character', 'Raya', NULL, 'Aldercrest Spouse', 'Dead', 'Support', 'Alistair Quinn''s beloved who married into the Aldercrest lineage and was murdered.'),
    ('character', 'Kaizen', NULL, 'Obsidians Operative', 'Alive', 'Support', 'Son of Pride who earns a place in Valeria''s The Obsidians.'),
    ('character', 'Isagi', NULL, 'Obsidians Operative', 'Alive', 'Support', 'Son of Pride who serves in Valeria''s The Obsidians alongside Kaizen.'),
    ('character', 'Abbas', NULL, 'Co-Leader of the Forgotten Ones', 'Dead', 'Antagonist', 'One-legged co-leader alongside Dirham who betrayed Zaan''s camp for gold.'),
    ('character', 'Riven Creed', 'Silent Node', 'D.E.W. Subject', 'Alive', 'Support', 'Subject of D.E.W.''s Silent Node program under E.C.A.P.''s budget.'),
    ('character', 'Mephisto', 'Mephistopheles', 'Demonic Dealmaker', 'Legend', 'Antagonist', 'Demonic pact-maker tied to Alistair Quinn''s curse and the 2003 Nur deal.'),
    ('character', 'Arvin', NULL, 'Redline Operative', 'Alive', 'Support', 'Redline Season 1 operative whose bond with Saya sparks during the campaign.'),
    ('organization', 'H.A.W.K.S.', 'Hybrid Assault, Warfare & Kinetic Specialists', 'Elite Special Task Force', 'Inactive', 'Organization', 'Founded by Captain Sean Stone (Maverick #1) in the 1960s-70s; included rookie Stitch and Victor.'),
    ('organization', 'E.C.A.P.', 'ECAP · Enhanced Cognition & Applied Phenomena', 'Meta-Human Research Institute', 'Active', 'Organization', 'Founded by Stitch and Victor after H.A.W.K.S.; public face of meta-human research.'),
    ('organization', 'D.E.W.', 'DEW · Division of Experimental Warfare / The Old Order', 'Black-Ops Meta-Soldier Program', 'Inactive', 'Organization', 'Modern face of the Old Order run by Stitch under E.C.A.P.''s budget until Season 4 collapse.'),
    ('organization', 'The Obsidians', 'The Umbral', 'Shadow Assassination Unit', 'Active', 'Organization', 'Valeria''s shadow unit formed in the Redline era, including Yoshiko, Kazumi, Saya, Kaizen, and Isagi.'),
    ('organization', 'Corvani''s Redline Team', NULL, 'Elite Special Operations Team', 'Active', 'Organization', 'Built by Marcello Corvani in Redline 1 after H.A.W.K.S. ended.'),
    ('organization', 'Hidden Ones', 'The Hidden Ones · The Forgotten Ones', 'Global Assassin Network', 'Active', 'Organization', 'Founded by Zaan (~1454-60) honoring the Forgotten Ones camp outside Ottoman Istanbul.'),
    ('faction', 'Nine Clans', 'The 9 bloodlines · The 9 clans', 'Nine Ancient Bloodlines', 'Active', 'Faction', 'The nine ancestral bloodline houses shaping SCU history.'),
    ('bloodline', 'Duskmoor', 'Duskmoors · Duskmoor clan · Moor of Twilight', 'Duskmoor Bloodline', 'Active', 'Bloodline', 'Ancient bloodline of Tedmond, Silas, and Rowan Colloway.'),
    ('organization', 'Aldercrest', 'Eldercrest · Crest of the Old Trees', 'Aldercrest Bloodline & House', 'Active', 'Organization', 'Ancient arcane house guarding the throne through Eldrich, Steven, Damian, and Soa.')
)
INSERT INTO public.entities (kind, name, alias, role, status, category, description)
SELECT s.k::public.entity_kind, s.nm, s.al, s.rl, s.st, s.cat, s.ds
FROM canon_seed s
WHERE NOT EXISTS (
  SELECT 1 FROM public.entities e
  WHERE lower(regexp_replace(btrim(e.name), '\s+', ' ', 'g')) = lower(s.nm)
);

-- Merge duplicate character & group entities safely within the same entity category (char vs group).
DO $$
DECLARE
  rec RECORD;
  p_id uuid;
  s_id uuid;
BEGIN
  FOR rec IN (
    SELECT * FROM (VALUES
      ('character', 'zayn', 'zayn hayes'),
      ('character', 'jubayer', 'zayn hayes'),
      ('character', 'bunny', 'ethan'),
      ('character', 'robin', 'ethan'),
      ('character', 'ethan thorne', 'ethan'),
      ('character', 'echan', 'ethan'),
      ('character', 'alt ethan', 'ethan'),
      ('character', 'robi', 'elizah'),
      ('character', 'tamim', 'david'),
      ('character', 'dawood', 'david'),
      ('character', 'alt david', 'alter david'),
      ('character', 'covenant leader', 'alter david'),
      ('character', 'marufa', 'xinea'),
      ('character', 'nyxia', 'xinea'),
      ('character', 'nyxia vale', 'xinea'),
      ('character', 'prime nyxia', 'xinea'),
      ('character', 'nawshin', 'valeria'),
      ('character', 'nisha', 'nilanjona'),
      ('character', 'ela', 'grace'),
      ('character', 'vanguard', 'derek miles'),
      ('character', 'rifat', 'derek miles'),
      ('character', 'derek', 'derek miles'),
      ('character', 'sammam', 'samuel sterling'),
      ('character', 'samuel', 'samuel sterling'),
      ('character', 'ghost', 'samuel sterling'),
      ('character', 'luba', 'maliha'),
      ('character', 'ariyan', 'aariz maddox'),
      ('character', 'aariz', 'aariz maddox'),
      ('character', 'nusrat', 'saya'),
      ('character', 'madhobi', 'nytheris'),
      ('character', 'humayra', 'amaya'),
      ('character', 'shakti', 'yoshiko arashi'),
      ('character', 'yoshiko', 'yoshiko arashi'),
      ('character', 'john', 'dorian cross'),
      ('character', 'john liam', 'dorian cross'),
      ('character', 'dorian', 'dorian cross'),
      ('character', 'liam', 'eldrich aldercrest'),
      ('character', 'liam aldercrest', 'eldrich aldercrest'),
      ('character', 'eldrich', 'eldrich aldercrest'),
      ('character', 'agnus', 'altan el-mansur'),
      ('character', 'agnus el-mansur', 'altan el-mansur'),
      ('character', 'mubasshir', 'evan grant'),
      ('character', 'aeric', 'aeric valenheart'),
      ('character', 'alistair graye', 'alistair quinn'),
      ('character', 'maverick', 'sean stone'),
      ('character', 'shina', 'shina nasrin'),
      ('character', 'major general stitch', 'stitch'),
      ('character', 'jessy', 'asetra'),
      ('character', 'anna', 'anna al-ahd'),
      ('character', 'anna la sarta', 'anna al-ahd'),
      ('character', 'zaan al-murad', 'zaan'),
      ('character', 'mashiho', 'mashiho kurohana'),
      ('character', 'kazumi', 'kazumi kurahana'),
      ('character', 'kurahana kazumi', 'kazumi kurahana'),
      ('character', 'ayaan', 'ayaan siddique'),
      ('character', 'ayaan siddiqi', 'ayaan siddique'),
      ('character', 'ayman', 'ayaan siddique'),
      ('character', 'ayman siddiqi', 'ayaan siddique'),
      ('character', 'issabela', 'issabela al-ahd'),
      ('character', 'zaynab', 'issabela al-ahd'),
      ('character', 'zaynab al-ahd', 'issabela al-ahd'),
      ('character', 'ramij', 'ramiz al-ahd'),
      ('character', 'ramiz', 'ramiz al-ahd'),
      ('character', 'rahim al-ahd', 'ramiz al-ahd'),
      ('character', 'silas', 'silas duskmoor'),
      ('character', 'silas eldercrest', 'silas duskmoor'),
      ('character', 'silas aldercrest', 'silas duskmoor'),
      ('character', 'tedmond', 'tedmond duskmoor'),
      ('character', 'soa', 'soa aldercrest'),
      ('character', 'corvani', 'marcello corvani'),
      ('character', 'victor', 'william victor'),
      ('character', 'nasab ibn khalil', 'francisco'),
      ('character', 'rohan', 'damian brown'),
      ('character', 'rohan aldercrest', 'damian brown'),
      ('character', 'damian', 'damian brown'),
      ('character', 'fahad', 'rowan colloway'),
      ('character', 'fahad duskmoor', 'rowan colloway'),
      ('character', 'rowan', 'rowan colloway'),
      ('character', 'rowan duskmoor', 'rowan colloway'),
      ('character', 'rowan calloway', 'rowan colloway'),
      ('character', 'weston', 'weston hale'),
      ('character', 'rafi', 'weston hale'),
      ('character', 'pristine', 'elizabeth pristine'),
      ('character', 'elina', 'elina quins'),
      ('character', 'arashi', 'kensho arashi'),
      ('character', 'the guardian', 'steven aldercrest'),
      ('group', 'dew', 'd.e.w.'),
      ('group', 'ecap', 'e.c.a.p.'),
      ('group', 'the covenant', 'covenant'),
      ('group', 'the hidden ones', 'hidden ones'),
      ('group', 'the forgotten ones', 'hidden ones'),
      ('group', 'the umbral', 'the obsidians'),
      ('group', 'the 9 bloodlines', 'nine clans'),
      ('group', 'duskmoors', 'duskmoor'),
      ('group', 'duskmoor clan', 'duskmoor'),
      ('group', 'eldercrest', 'aldercrest'),
      ('group', 'demon clan', 'demonic clan')
    ) AS t(bucket, sec_name, prim_name)
  ) LOOP
    IF rec.bucket = 'character' THEN
      SELECT id INTO s_id FROM public.entities WHERE kind = 'character' AND lower(btrim(name)) = rec.sec_name LIMIT 1;
      SELECT id INTO p_id FROM public.entities WHERE kind = 'character' AND lower(btrim(name)) = rec.prim_name LIMIT 1;
    ELSE
      SELECT id INTO s_id FROM public.entities WHERE kind <> 'character' AND lower(btrim(name)) = rec.sec_name LIMIT 1;
      SELECT id INTO p_id FROM public.entities WHERE kind <> 'character' AND lower(btrim(name)) = rec.prim_name LIMIT 1;
    END IF;

    IF s_id IS NOT NULL AND p_id IS NOT NULL AND s_id <> p_id THEN
      UPDATE public.lore_notes SET entity_id = p_id WHERE entity_id = s_id;
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
      IF to_regclass('public.entity_relations') IS NOT NULL THEN
        UPDATE public.entity_relations SET source_id = p_id WHERE source_id = s_id;
        UPDATE public.entity_relations SET target_id = p_id WHERE target_id = s_id;
      END IF;
      IF to_regclass('public.remap_series_characters') IS NOT NULL THEN
        PERFORM public.remap_series_characters(p_id, s_id);
      END IF;
      DELETE FROM public.entities WHERE id = s_id;
    END IF;
  END LOOP;
END $$;

-- Seed abilities onto canonical character cards where empty and unlocked.
WITH canon_ab(c_name, ab) AS (
  VALUES
    ('ethan', ARRAY['aerokinesis', 'wind_guardian', 'energy', 'wind_surge', 'blood_manipulation']),
    ('zayn hayes', ARRAY['astrapo_electrokinesis', 'red_lightning', 'crimson_astrapo', 'lightning']),
    ('xinea', ARRAY['aether_dominion', 'aether', 'chaos_magic']),
    ('elizah', ARRAY['demonic_hemokinesis', 'hemokinesis', 'blood_manipulation', 'omen_sight', 'blood_art']),
    ('nilanjona', ARRAY['water_guardian', 'hydrokinesis', 'cryokinesis', 'water']),
    ('grace', ARRAY['hydrokinesis', 'athenas_judgement', 'healing', 'energy']),
    ('ayaan siddique', ARRAY['super_speed', 'tech_genius']),
    ('samuel sterling', ARRAY['ghost_01_armament', 'kinetic_suits', 'combat_specialist']),
    ('david', ARRAY['destructive_legendary', 'psychokinetic_daggers', 'portal']),
    ('alter david', ARRAY['ethereal_splicing', 'reality_bend', 'portal']),
    ('maliha', ARRAY['tech_genius', 'healing', 'psychokinetic_daggers']),
    ('aariz maddox', ARRAY['bestiakinesis', 'beast_transformation', 'mimic_form', 'nature_guardian']),
    ('saya', ARRAY['nature_guardian', 'super_speed', 'assassin']),
    ('yoshiko arashi', ARRAY['draconic_flame', 'shishjutsu', 'chaos_order', 'earth']),
    ('kazumi kurahana', ARRAY['blades', 'swordsman', 'shadow_steps']),
    ('mashiho kurohana', ARRAY['sword_master', 'flame', 'combat_specialist']),
    ('kensho arashi', ARRAY['ancient_art', 'tactician', 'sword_master']),
    ('altan el-mansur', ARRAY['qahr_al_wujud', 'architect_cube_guardian', 'gladiokinesis']),
    ('silas duskmoor', ARRAY['demonic', 'earth_guardian', 'duskmoor_blue_flame']),
    ('tedmond duskmoor', ARRAY['sword_master', 'duskmoor_blue_flame', 'authority']),
    ('rowan colloway', ARRAY['duskmoor_blue_flame', 'red_flame_magic', 'flame']),
    ('derek miles', ARRAY['vanguard_x_protocol', 'super_soldier', 'water_guardian']),
    ('eldrich aldercrest', ARRAY['aldercrest_arcane', 'cryokinesis', 'ancient_art', 'arcane_magic']),
    ('damian brown', ARRAY['aldercrest_arcane', 'rune_magic', 'arcane_magic']),
    ('steven aldercrest', ARRAY['architect_cube_guardian', 'aldercrest_arcane', 'authority']),
    ('khalid', ARRAY['gladiokinesis', 'demonic_hemokinesis', 'bloodbinding', 'umbra_control', 'errorcore']),
    ('dorian cross', ARRAY['red_lightning', 'astrapo_electrokinesis', 'sword_master', 'shadow_steps']),
    ('weston hale', ARRAY['white_lightning_drive', 'super_speed', 'lightning']),
    ('lucas', ARRAY['super_speed', 'velocity_genome', 'wild_energy']),
    ('lucan vale', ARRAY['velocity_genome', 'super_speed', 'lightning']),
    ('valeria', ARRAY['shadow_steps', 'assassin', 'gladiokinesis', 'swordsman']),
    ('elizabeth pristine', ARRAY['gladiokinesis', 'prismorph', 'vampire_hybrid']),
    ('arzuna', ARRAY['gladiokinesis', 'blood_art', 'destructive']),
    ('niharo', ARRAY['omni_ergon', 'omni_argon', 'draconic_flame']),
    ('arthur', ARRAY['dragon', 'draconic_flame', 'destructive_legendary']),
    ('marcello corvani', ARRAY['combat_specialist', 'tactician']),
    ('zaan', ARRAY['blood_art', 'healing', 'dark_magic', 'assassin']),
    ('alistair quinn', ARRAY['card_magic', 'jester', 'rune_magic']),
    ('riven creed', ARRAY['errorcore', 'tech_genius']),
    ('ramiz al-ahd', ARRAY['architect_cube_guardian', 'authority', 'ancient_art']),
    ('anna al-ahd', ARRAY['tactician', 'combat_specialist']),
    ('issabela al-ahd', ARRAY['rune_magic', 'tactician']),
    ('norman', ARRAY['combat_specialist', 'demonic']),
    ('nur', ARRAY['demonic', 'shadow_steps']),
    ('asetra', ARRAY['domain_expansion', 'reality_bend', 'manipulation']),
    ('nytheris', ARRAY['nature_guardian', 'nature', 'healing']),
    ('prince of demons (sparda)', ARRAY['demonic', 'sword_master', 'dark_magic']),
    ('diablo', ARRAY['demonic', 'draconic_flame', 'destructive_legendary']),
    ('orion', ARRAY['tech_suits', 'kinetic_suits', 'sentinel_frame_tech']),
    ('aeric valenheart', ARRAY['portal', 'psychokinetic_daggers']),
    ('stitch', ARRAY['tech_genius', 'tactician', 'sentinel_frame_tech']),
    ('mephisto', ARRAY['manipulation', 'dark_magic', 'card_magic']),
    ('pride', ARRAY['flame', 'sword_master']),
    ('sloth', ARRAY['regeneration', 'dark_magic'])
)
UPDATE public.entities e
SET abilities = ca.ab,
    updated_at = now()
FROM canon_ab ca
WHERE e.kind = 'character'
  AND lower(btrim(e.name)) = ca.c_name
  AND coalesce(array_length(e.abilities, 1), 0) = 0
  AND NOT ('abilities' = ANY(coalesce(e.locked_fields, '{}')));

-- Seed additional series roster links when series_characters exists.
DO $$
BEGIN
  IF to_regclass('public.series_characters') IS NOT NULL AND to_regclass('public.series') IS NOT NULL THEN
    WITH extra_sc(s_id, c_name, arc, role, st) AS (
      VALUES
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Elina Quins', 'Support', 'Eldrich''s Loved One', 'Dead'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Norman', 'Support', 'Veteran Tactician & Brawler', 'Alive'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Elizabeth Pristine', 'Antagonist', 'Shape-Shifting Infiltrator', 'Alive'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Damian Brown', 'Support', 'Aldercrest Heir', 'Dead'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Weston Hale', 'Support', 'White Lightning Speedster', 'Alive'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Nur', 'Support', 'Demonic Clan Companion', 'Alive'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Lucas', 'Antagonist', 'DEW Speedster Hybrid', 'Alive'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Amaya', 'Support', 'Sentinel Ally (Humayra)', 'Alive'),
        ('00000000-0000-4000-a000-000000000001'::uuid, 'Evan Grant', 'Support', 'Sentinel Ally (Mubasshir)', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Arvin', 'Support', 'Redline Operative S1-S2', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Saya', 'Support', 'Ex-DEW Operative & Obsidian Recruit', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Ayaan Siddique', 'Protagonist', 'Frontliner S1 & Commanding Lead S2', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Yoshiko Arashi', 'Support', 'Field Spy S1 & Obsidian S2', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Derek Miles', 'Support', 'Acting Commanding Officer S2', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Samuel Sterling', 'Protagonist', 'Ghost-01 Operative', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Kazumi Kurahana', 'Support', 'Kara Clan & Obsidians Recruit', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Mashiho Kurohana', 'Support', 'Kara Clan Rebuilder & Obsidians', 'Alive'),
        ('00000000-0000-4000-a000-000000000002'::uuid, 'Alistair Quinn', 'Support', 'Redline Evaluator', 'Legend'),
        ('00000000-0000-4000-a000-000000000003'::uuid, 'Kensho Arashi', 'Legend', 'Seraph Patriarch & Nullborn Leader', 'Dead'),
        ('00000000-0000-4000-a000-000000000003'::uuid, 'Freya', 'Legend', 'Dragonic Bloodline Matriarch', 'Alive'),
        ('00000000-0000-4000-a000-000000000003'::uuid, 'Gabriel', 'Legend', 'Dragonic Patriarch', 'Alive'),
        ('00000000-0000-4000-a000-000000000003'::uuid, 'Arthur', 'Antagonist', 'Dragon Heir of the Old Line', 'Alive'),
        ('00000000-0000-4000-a000-000000000003'::uuid, 'Khalid', 'Protagonist', 'Demon-Human Bloodline & Nullborn', 'Alive'),
        ('00000000-0000-4000-a000-000000000003'::uuid, 'Zaan', 'Protagonist', 'Founder of the Hidden Ones', 'Alive'),
        ('00000000-0000-4000-a000-000000000003'::uuid, 'Asetra', 'Antagonist', 'Balance Host Origin', 'Missing')
    )
    INSERT INTO public.series_characters (series_id, character_id, arc_role, role_in_series, status)
    SELECT seed.s_id, e.id, seed.arc, seed.role, seed.st
    FROM extra_sc seed
    JOIN public.entities e ON lower(btrim(e.name)) = lower(btrim(seed.c_name)) AND e.kind = 'character'
    ON CONFLICT (series_id, character_id) DO UPDATE SET
      arc_role = EXCLUDED.arc_role,
      role_in_series = EXCLUDED.role_in_series,
      status = EXCLUDED.status;
  END IF;
END $$;
