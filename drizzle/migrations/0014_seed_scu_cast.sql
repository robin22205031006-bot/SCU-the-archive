-- 0014_seed_scu_cast.sql
-- One-time, merge-safe import of the SCU Cast chart (src/lib/scu-cast.ts), the same
-- result as the admin "Sync SCU Cast" action:
--  * a chart character that already has a card (exact name, the app's alias key, or
--    entity_name_aliases) is merged into it: the chart's ability text becomes a
--    lore note (skipped when that text is already the bio or a note) and the title
--    and chart name are appended to alias unless alias is locked;
--  * a chart character with no card gets a new card;
--  * nothing is deleted, descriptions are never overwritten, locked fields are
--    respected, and re-running it changes nothing. Names the merged-name guard
--    rejects are skipped with a notice instead of failing the migration.

DO $$
BEGIN
  IF to_regclass('public.entity_name_aliases') IS NOT NULL THEN
    INSERT INTO public.entity_name_aliases (alias_norm, canonical_name) VALUES
      ('david (dawood)', 'david'),
      ('ayesha (khalid''s mother)', 'ayesha'),
      ('ayesha (khalid’s mother)', 'ayesha')
    ON CONFLICT (alias_norm) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE
  r record;
  target uuid;
  target_name text;
  cur_alias text;
  locked text[];
  add_alias text;
  db_canon text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
    ('Ethan', 'ethan', 'Gale Warden', 'Sentinels', 'Alive', 'Wind that surges with emotion, strongest when he protects someone. Wind Guardian mode manifests for the first time in the final fight against Isaac.'),
    ('Elizah', 'elizah', 'Omen', 'Sentinels', 'Alive', 'Refined blood art inherited from Khalid’s line, driven by technique and survival rather than malice. Ethan’s other self.'),
    ('Zayn Hayes', 'zayn hayes', 'Duskblade, Black Knight', 'Sentinels', 'Alive', 'Astrapo-Electrokinesis: electricity, lightning and thunder. Red lightning (Crimson Astrapo), inherited from Dorian, as his execution mode.'),
    ('Xinea', 'xinea', 'Nyxia', 'Sentinels', 'Alive', 'Aether Dominion: control of the layer between matter and soul. Phasing, soul-touch and void erasure. Her early healing and fire were leaks of Aether.'),
    ('Valeria', 'valeria', 'Ravenblade', 'Redline', 'Alive', 'Peak human assassin: Shadow Step, silent movement and the finest sword in the SCU. An incorruptible mind. Later wields Kara Yazgı.'),
    ('Nilanjona', 'nilanjona', 'Velonda', 'Sentinels', 'Alive', 'Hydrokinesis: water’s flow, pressure and state. Stronger near water and with a calm mind. Accepts the Water Guardian’s path.'),
    ('Grace', 'grace', 'Bearer of Athena’s Judgement', 'Sentinels', 'Alive', 'Divine Healing (Aegis of Mercy) and Athena’s Judgement, the Golden Eye: a court that weighs absolute moral weight. Holder of the light core.'),
    ('Weston Hale', 'weston hale', '', 'Sentinels', 'Alive', 'White Lightning Drive: kinetic speed that stacks momentum and exists only while he moves.'),
    ('Damian Brown', 'damian brown', 'Arcane Tactician', 'Redline', 'Alive', 'Strategy and Aldercrest spellcasting.'),
    ('Rowan Colloway', 'rowan colloway', 'Red Saint', 'Sentinels', 'Alive', 'Red Flame Fist and super strength, then the Duskmoor flame, then earth.'),
    ('Ayaan Siddique', 'ayaan siddique', '', 'Redline', 'Alive', 'Tech genius and tech support. His mind is his weapon, the seed of Echogrim.'),
    ('Samuel Sterling', 'samuel sterling', 'Ghost-01', 'Redline', 'Alive', 'Peak-human super-soldier with no powers: Ghost Sense awareness, extreme endurance, a hardened tie as a weapon, and anything else as a weapon.'),
    ('David (Dawood)', 'david', 'Dagger Wolf', 'Sentinels', 'Alive', 'Psychokinetic dagger mastery through the Call of Sharpness. Opens short-range portals with his daggers.'),
    ('Maliha', 'maliha', '', 'Sentinels', 'Alive', 'Healing and hand-to-hand combat.'),
    ('Nur', 'nur', '', 'Sentinels', 'Alive', 'Blood Magic that fuels, summons, binds and extends life, which he refuses to use. Carries Iqaris’s soul essence.'),
    ('Aariz Maddox', 'aariz maddox', '', 'Sentinels', 'Alive', 'Bestiakinesis and hyperkinesis: speaks with and becomes animals, with heightened senses. Gains a mythical beast’s power after defeating it.'),
    ('Saya', 'saya', '', 'Redline', 'Alive', 'Long-range weapons specialist raised in DEW. Valeria’s heir in skill, later holder of Kara Yazgı and heir to Anna’s sword.'),
    ('Nytheris', 'nytheris', 'The Nature Guardian', 'Legends and history', 'Legend', 'The Nature Guardian, present across eras.'),
    ('Amaya', 'amaya', 'Disciple of the Nature Guardian', 'Sentinels', 'Alive', 'Acidic poison in mist, streams and vapor. The only winged character in the SCU.'),
    ('Yoshiko Arashi', 'yoshiko arashi', '', 'Redline', 'Alive', 'Chaos and Order (Forward and Break commands), Shishōjutsu corpse control through ofuda, and a full weapon set.'),
    ('Derek Miles', 'derek miles', 'Vanguard-X', 'Redline', 'Alive', 'The first Ichor subject: human strength and speed at full output, faster recovery, and the Vanguard Pistol.'),
    ('Dorian Cross', 'dorian cross', '', 'Legends and history', 'Legend', 'Red lightning, the last carrier of it, which disrupts blood art. Elite battle IQ.'),
    ('Eldrich Aldercrest', 'eldrich aldercrest', '', 'Legends and history', 'Legend', 'Aldercrest magic. Cursed by Khalid.'),
    ('Norman', 'norman', 'The Paleborn', 'Villains and demons', 'Alive', 'Cursed vampire: strength, speed, regeneration, predator senses, partial shapeshifting and mass nightmare control.'),
    ('Agnus El-Mansur', 'altan el-mansur', 'Dread Walker', 'Legends and history', 'Legend', 'Qahr al-Wujud, making existence obey his will, and the Call of Sharpness, blades as authority.'),
    ('Silas Duskmoor', 'silas duskmoor', 'Seraph of the Ash, Dragon Slayer', 'Legends and history', 'Legend', 'The Blue Flame, which burns only corrupted souls. Explosive, full-commitment fighting.'),
    ('Marcello Corvani', 'marcello corvani', 'The Whale', 'Redline', 'Alive', 'No powers: stubbornness, leadership and mercy. Founded Redline’s team.'),
    ('Kensho Arashi', 'kensho arashi', 'Blind Blade', 'Kara and Kurohana', 'Alive', 'Blind swordsmanship that keeps improving. Taught Valeria’s sword philosophy and trained Mashiho.'),
    ('Anna', 'anna al-ahd', 'Anna la Sarta', 'Legends and history', 'Legend', 'Peak human. Faced super beings without fear and won. Her ancestral sword passes through chosen heirs.'),
    ('Issabela', 'issabela al-ahd', 'Zaynab', 'Legends and history', 'Legend', 'Led the Nullborn Rome cell; later a detached assassin.'),
    ('Anthony', 'anthony', '', 'Legends and history', 'Legend', 'Rebuilt the Nullborn. His preserved essence was placed inside Derek Miles.'),
    ('Joe Rainer', 'joe rainer', '', 'Sentinels', 'Alive', ''),
    ('William Victor', 'william victor', '', 'Others', 'Alive', 'Scientist and HWKS veteran. Co-founded ECAP; his formula is the base of the A-IV serum.'),
    ('Stitch', 'stitch', '', 'Villains and demons', 'Alive', 'HWKS veteran and strategist who co-founded ECAP and turned the Old Order into DEW.'),
    ('Kazumi', 'kazumi kurahana', '', 'Kara and Kurohana', 'Alive', 'Trained by elite killers inside the Kurohana.'),
    ('Ramiz Al-Ahd', 'ramiz al-ahd', '', 'Legends and history', 'Legend', 'Nullborn spy and Architect Cube guardian. Father of Anna and Issabela.'),
    ('Soa Aldercrest', 'soa aldercrest', 'Fallen Goddess', 'Legends and history', 'Legend', 'Held Athena’s Judgement before Grace.'),
    ('Elina Quins', 'elina quins', '', 'Legends and history', 'Legend', 'Eldrich’s love. No powers recorded.'),
    ('Pristine', 'elizabeth pristine', 'Prismorph', 'Villains and demons', 'Alive', 'Prismorph: real-time adaptive shapeshifting, speed over force. Twin Ascension when both bloodlines awaken.'),
    ('Arzuna', 'arzuna', 'The Blue Lament (unofficial)', 'Sentinels', 'Alive', 'Unique vampiric hybrid with Blood Resonance, inheriting echoes of bonded people’s gifts. Azure Revenant State.'),
    ('Arthur', 'arthur', '', 'Villains and demons', 'Alive', 'Pure dragon physiology: monstrous strength, dragon-scale durability and fast regeneration.'),
    ('Gabriel', 'gabriel', '', 'Villains and demons', 'Alive', 'Dragon.'),
    ('Freya', 'freya', 'Queen of Destruction', 'Legends and history', 'Legend', 'Dragon, once a near-undefeated hero of the beast realm.'),
    ('Niharo', 'niharo', 'Hell Walker', 'Villains and demons', 'Alive', 'Omni-Ergon: absorbs, stores, converts and releases any energy, as the vessel of all elements.'),
    ('Alt Ethan', 'alt ethan', '', 'Alternate timeline', 'Alive', 'The alternate Ethan, the most moral man turned threat.'),
    ('Alt Rowan', 'alt rowan', '', 'Alternate timeline', 'Alive', 'The alternate Rowan, killed by Rowan and Samuel.'),
    ('Alt Weston', 'alt weston', '', 'Alternate timeline', 'Alive', 'The alternate Weston, a Covenant prisoner who dies of extreme aging.'),
    ('Alt Zayn', 'alt zayn', '', 'Alternate timeline', 'Alive', 'The alternate Zayn, manipulated by Asetra.'),
    ('Alt Xinea', 'alt xinea', '', 'Alternate timeline', 'Alive', 'The alternate Xinea.'),
    ('Alt David', 'alter david', 'Leader of the Covenant', 'Alternate timeline', 'Alive', 'Architect of the Covenant, using Ethereal Splicing and the Aether siphon stone.'),
    ('Evan Grant', 'evan grant', '', 'Others', 'Alive', ''),
    ('Tedmond Duskmoor', 'tedmond duskmoor', 'Dragon Slayer', 'Legends and history', 'Legend', 'The Blue Flame and raw skill. Spirit and dragon blood let him outlive normal humans.'),
    ('Mashiho Kurohana', 'mashiho kurohana', '', 'Kara and Kurohana', 'Alive', 'Trained in exile by Arashi. Learns Kara curse-binding.'),
    ('Khalid', 'khalid', 'Kelvan', 'Villains and demons', 'Alive', 'Abyssal Blood Dominion, living, corrupting blood, and Umbrakinesis, demonic shadow control.'),
    ('Asetra', 'asetra', 'Formerly Jessy', 'Villains and demons', 'Alive', 'Atomokinesis, omniscience, oneirokinesis and psychological dominion. The most powerful being in the SCU.'),
    ('Isaac Ezekiel', 'isaac ezekiel', 'Leader of The Unwritten', 'Villains and demons', 'Alive', 'Genius intellect, technology and magic learned through sleep time jumps. Opens the void and jumps through time.'),
    ('Isaac’s father', 'isaac''s father', '', 'Others', 'Alive', 'Weakened the realm seals.'),
    ('Isaac’s mother', 'isaac''s mother', '', 'Others', 'Alive', 'Never taught her son witchcraft. Sold her soul to Mephisto to preserve his body.'),
    ('Mira', 'mira', '', 'Others', 'Alive', 'Isaac’s love in the HWKS era.'),
    ('Mephisto', 'mephisto', 'The Deal-Maker', 'Villains and demons', 'Alive', 'Contracts. He never lies, only chooses which truths to tell.'),
    ('Diablo', 'diablo', 'Demon King', 'Villains and demons', 'Alive', 'Led the Diablo Wars.'),
    ('Malachar', 'malachar', 'Right Hand of the Devil', 'Villains and demons', 'Alive', 'Strategy and calculation.'),
    ('Iqaris', 'iqaris', '', 'Legends and history', 'Legend', 'Witch arts, one of the few demons to master them.'),
    ('Zaan al-Murad', 'zaan', 'The Cursed Prodigy', 'Legends and history', 'Legend', 'Revival science, blood regeneration, berserk strength and speed.'),
    ('Shina Nasrin', 'shina nasrin', '', 'Legends and history', 'Legend', 'Zaan’s love.'),
    ('Ayesha Khatoon', 'ayesha khatoon', 'Grandma Ayesha', 'Legends and history', 'Legend', 'Sheltered Zaan and Shina.'),
    ('Raisa bint Khalid', 'raisa bint khalid', '', 'Legends and history', 'Legend', 'Time-based revival research.'),
    ('Rahim Ibn Suleiman', 'rahim ibn suleiman', '', 'Legends and history', 'Legend', 'Raisa’s husband.'),
    ('Mara Duskmoor', 'mara duskmoor', '', 'Legends and history', 'Legend', 'Separates corruption from a person and burns only the corruption.'),
    ('Aeric Valenheart', 'aeric valenheart', '', 'Kara and Kurohana', 'Alive', 'Cursed weapon crafting. Forged Kara Yazgı.'),
    ('Kael Agharri', 'kael agharri', '', 'Legends and history', 'Legend', 'One of his bloodline’s most powerful warriors. Raised Niharo.'),
    ('Seren Kara', 'seren kara', 'Curse-Binder', 'Kara and Kurohana', 'Alive', 'Binds protective curses into buildings and objects.'),
    ('Francisco', 'francisco', 'Nasab ibn Khalil', 'Legends and history', 'Legend', 'Nullborn operative, Khalid’s father.'),
    ('Mateo Cruz', 'mateo cruz', '', 'Redline', 'Alive', 'Regeneration through cancer fused with Ichor. His body learns from every death.'),
    ('Alistair Quinn', 'alistair quinn', 'The Joker', 'Redline', 'Alive', 'Genius strategist bound by a Mephisto smile clause.'),
    ('Eveline', 'eveline', '', 'Others', 'Alive', 'Alistair’s sister.'),
    ('Raya', 'raya', '', 'Others', 'Alive', 'Alistair’s love.'),
    ('Arvin', 'arvin', '', 'Redline', 'Alive', 'Peak human: para-commando, NSI training and master-level strategy.'),
    ('Sean Stone', 'sean stone', 'Maverick #1', 'Others', 'Alive', 'Peak human. HWKS founder and the most dangerous man of his era.'),
    ('Adrian Kessler', 'adrian kessler', 'Maverick #2', 'Others', 'Alive', 'Peak human. Son of a corrupt chairperson; the man Stitch could never catch.'),
    ('Maverick #3', 'maverick #3', 'Maverick #3', 'Redline', 'Alive', 'Young, voiceless peak human who speaks through a device.'),
    ('Jada', 'jada', '', 'Sentinels', 'Alive', ''),
    ('Pride', 'pride', 'Sin of Pride', 'Kara and Kurohana', 'Alive', 'Eldest and strongest of the seven siblings.'),
    ('Greed', 'greed', 'Sin of Greed', 'Kara and Kurohana', 'Alive', 'Raised Kazumi on lies.'),
    ('Lust', 'lust', 'Sin of Lust', 'Kara and Kurohana', 'Alive', 'Defeated by Arashi.'),
    ('Sloth', 'sloth', 'Sin of Sloth', 'Kara and Kurohana', 'Alive', ''),
    ('Envy', 'envy', 'Sin of Envy', 'Kara and Kurohana', 'Alive', ''),
    ('Gluttony', 'gluttony', 'Sin of Gluttony', 'Kara and Kurohana', 'Alive', ''),
    ('Kaizen', 'kaizen', '', 'Kara and Kurohana', 'Alive', ''),
    ('Isagi', 'isagi', '', 'Kara and Kurohana', 'Alive', ''),
    ('Azwar', 'azwar', '', 'Divine Beasts', 'Alive', ''),
    ('Azwain', 'azwain', 'Prince of the Beast Realm', 'Divine Beasts', 'Alive', ''),
    ('The Beast King', 'the beast king', '', 'Divine Beasts', 'Alive', ''),
    ('Orion', 'orion', '', 'Divine Beasts', 'Alive', ''),
    ('Saya (Divine Beasts)', 'saya (divine beasts)', '', 'Divine Beasts', 'Alive', ''),
    ('Maya', 'maya', '', 'Divine Beasts', 'Alive', ''),
    ('Graye', 'graye', '', 'Divine Beasts', 'Alive', ''),
    ('Ayesha (Khalid’s mother)', 'ayesha', '', 'Legends and history', 'Legend', 'Killed by her son in 1461 for the pendant fragment.'),
    ('Marco', 'marco', '', 'Legends and history', 'Legend', 'Core member of the Nullborn Rome cell. Killed by Khalid in 1461.'),
    ('Mehnaz', 'mehnaz', '', 'Legends and history', 'Legend', 'Core member of the Nullborn Rome cell. Did not survive its collapse.'),
    ('Abdul', 'abdul', '', 'Legends and history', 'Legend', 'Core member of the Nullborn Rome cell. Did not survive its collapse.'),
    ('Hassan', 'hassan', '', 'Legends and history', 'Legend', 'A Nullborn keeper of knowledge about the seal, who chose death rather than give it to Khalid.'),
    ('Piedro', 'piedro', '', 'Legends and history', 'Legend', 'A beggar turned renegade who stole Anna’s sword and was corrupted by it. Killed by Khalid.'),
    ('The Borgia (Rodrigo and Cesare)', 'the borgia (rodrigo and cesare)', '', 'Legends and history', 'Legend', 'Took control of the Nullborn through a puppet leader until Anthony rebuilt it.'),
    ('Steven Aldercrest', 'steven aldercrest', 'The Guardian', 'Legends and history', 'Legend', 'Eldrich’s father and a Cube guardian, who passed the Architect Cube to Dorian: “Destiny needs rebellion, not perfection.”'),
    ('Abbas', 'abbas', '', 'Legends and history', 'Legend', 'One-legged leader of the Forgotten Ones who betrayed Zaan’s location for gold.'),
    ('Dirham', 'dirham', '', 'Legends and history', 'Legend', 'Half-blind leader of the Forgotten Ones.'),
    ('Hisam', 'hisham', '', 'Legends and history', 'Legend', 'A lonely village boy Zaan befriended with his last piece of bread.'),
    ('Mizan', 'mizan', '', 'Legends and history', 'Legend', 'A young villager who admired Zaan, who meant to buy him new shoes.'),
    ('Raijan', 'raijan', '', 'Legends and history', 'Legend', 'A young villager who admired Zaan.'),
    ('Shahdat', 'shahdat', '', 'Legends and history', 'Legend', 'A young villager who admired Zaan.'),
    ('Rahmat', 'rahmat', '', 'Legends and history', 'Legend', 'A young villager who admired Zaan.'),
    ('Arashi’s wife', 'arashi''s wife', '', 'Kara and Kurohana', 'Alive', 'Assaulted by Lust and threatened into silence by the brothers; mother of Yoshiko and Kazumi.'),
    ('The former Wind Guardian', 'the former wind guardian', '', 'Legends and history', 'Legend', 'An arrogant Wind Guardian whom Ethan defeated at Yasnaya, the place Ethan was meant to rule.'),
    ('The Water Guardian', 'the water guardian', '', 'Legends and history', 'Legend', 'The guardian destined to mentor Nilanjona.'),
    ('The Sky Guardian', 'the sky guardian', '', 'Villains and demons', 'Alive', 'Destroyed in Season 5 by the integrated Ethan and Elizah.'),
    ('Lucen Vale', 'lucan vale', 'The Godspeed Anomaly', 'Villains and demons', 'Alive', 'Product of DEW’s Velocity Genome Program, tied to Alt Weston’s cloning.'),
    ('Riven Creed', 'riven creed', 'Silent Node', 'Villains and demons', 'Alive', 'Wears DEW’s Silent Node exosuit.'),
    ('Midory', 'midory', '', 'Redline', 'Alive', 'A later member of the Redline team. Little else is recorded.'),
    ('The HWKS vice captain', 'the hwks vice captain', '', 'Others', 'Alive', 'Sean’s closest friend, bought by the network. Arranged Sean’s murder; executed by Maverick #2.'),
    ('Adrian’s father', 'adrian''s father', 'The chairperson', 'Villains and demons', 'Alive', 'A corrupt chairperson behind HWKS who sacrificed his favorite son.'),
    ('The third leader', 'the third leader', '', 'Villains and demons', 'Alive', 'The seven families leader Corvani spared because of the child in his car, who later killed him.'),
    ('Corvani’s wife', 'corvani''s wife', '', 'Redline', 'Alive', 'Secretly guarded by Redline and Valeria after his death.'),
    ('Corvani’s son', 'corvani''s son', '', 'Redline', 'Alive', 'A primary-school boy, secretly guarded by Redline and Valeria after his father’s death.'),
    ('Kaelor Ashvane', 'kaelor ashvane', 'The Oath-Warden', 'Divine Beasts', 'Alive', 'Neurotoxic venom that paralyzes rather than destroys. He telegraphs every strike with a glowing hood-pulse around his arm: the warning means negotiation is over. The last ambassador to the Dragon Court.'),
    ('Velmora Ishtaan', 'velmora ishtaan', 'The Veiled Regent', 'Divine Beasts', 'Alive', 'Dual neurotoxic and cytotoxic venom, but she almost never fights. Her intelligence network, the Watching Eye, dismantles threats before they arrive. The Beast Realm’s de facto highest civil authority.'),
    ('Ophirion Drakhar', 'ophirion drakhar', 'The Hollow Crown', 'Divine Beasts', 'Alive', 'A towering apex snake-eater with a venom payload that could kill an elephant, who fights at full height. Offered the crown because the houses couldn’t safely oppose him.'),
    ('Sethan Vael', 'sethan vael', 'The Banded Judge', 'Divine Beasts', 'Alive', 'Passive until he switches, then controlled neurotoxic sequences that disable motor functions in order. A Dragon Order-trained judge whose own law was exploited to destroy Hollowreed.'),
    ('Viresh Kothar', 'viresh kothar', 'The Silent Bite', 'Divine Beasts', 'Alive', 'Venom no one can predict a treatment for, and preparation so thorough the fight is the last step. The first to document the Viper Covenant, now working outside the system.'),
    ('Sulhan Nightveil', 'sulhan nightveil', 'The Painless Death', 'Divine Beasts', 'Alive', 'A painless, progressively paralyzing venom. A former healer of the krait medical order who could make dying feel like release.'),
    ('Ravek Stillfang', 'ravek stillfang', 'The Patient Blade', 'Divine Beasts', 'Alive', 'Hemotoxic venom that turns the victim’s own blood against them, a figure-eight striking stance, and a viper’s heat sense that reads what every being desires.')
    ) AS v(nm, cand, title, rl, st, ds)
  LOOP
    target := NULL;
    db_canon := NULL;
    IF to_regclass('public.entity_name_aliases') IS NOT NULL THEN
      SELECT a.canonical_name INTO db_canon FROM public.entity_name_aliases a
       WHERE a.alias_norm = lower(regexp_replace(btrim(r.nm), '\s+', ' ', 'g'));
    END IF;

    SELECT e.id, e.name INTO target, target_name
      FROM public.entities e
     WHERE e.kind = 'character'
       AND lower(regexp_replace(btrim(e.name), '\s+', ' ', 'g')) IN (
             lower(regexp_replace(btrim(r.nm), '\s+', ' ', 'g')), r.cand, coalesce(db_canon, r.cand))
     ORDER BY (lower(regexp_replace(btrim(e.name), '\s+', ' ', 'g'))
               = lower(regexp_replace(btrim(r.nm), '\s+', ' ', 'g'))) DESC,
              (lower(regexp_replace(btrim(e.name), '\s+', ' ', 'g')) = r.cand) DESC
     LIMIT 1;

    IF target IS NULL THEN
      BEGIN
        INSERT INTO public.entities (kind, name, alias, role, status, description)
        VALUES ('character', r.nm, nullif(r.title, ''), nullif(r.rl, ''), r.st, r.ds);
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'SCU Cast: skipped "%": %', r.nm, SQLERRM;
      END;
      CONTINUE;
    END IF;

    IF r.ds <> ''
       AND NOT EXISTS (SELECT 1 FROM public.entities e
                        WHERE e.id = target AND btrim(e.description) = btrim(r.ds))
       AND NOT EXISTS (SELECT 1 FROM public.lore_notes n
                        WHERE n.entity_id = target AND btrim(n.text) = btrim(r.ds)) THEN
      INSERT INTO public.lore_notes (entity_id, text, source)
      VALUES (target, r.ds, 'SCU Cast chart');
    END IF;

    SELECT e.alias, e.locked_fields INTO cur_alias, locked FROM public.entities e WHERE e.id = target;
    IF NOT ('alias' = ANY (coalesce(locked, '{}'))) THEN
      FOREACH add_alias IN ARRAY ARRAY[r.title, r.nm] LOOP
        CONTINUE WHEN add_alias IS NULL OR btrim(add_alias) = '';
        CONTINUE WHEN lower(btrim(add_alias)) = lower(btrim(target_name));
        CONTINUE WHEN cur_alias IS NOT NULL
          AND position(lower(btrim(add_alias)) IN lower(cur_alias)) > 0;
        cur_alias := CASE WHEN cur_alias IS NULL OR btrim(cur_alias) = ''
                          THEN btrim(add_alias) ELSE cur_alias || ' · ' || btrim(add_alias) END;
      END LOOP;
      UPDATE public.entities SET alias = cur_alias
       WHERE id = target AND alias IS DISTINCT FROM cur_alias;
    END IF;
  END LOOP;
END $$;
