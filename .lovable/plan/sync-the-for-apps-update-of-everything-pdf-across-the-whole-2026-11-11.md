# Sync the "For Apps update of everything" PDF across the whole app

## Answer to your question
- The PDF you just attached is the same file as the one you sent earlier (byte-for-byte identical).
- Its info was already written straight into the archive: merged duplicate groups, 3 new characters, canon descriptions/aliases for organizations and clans, 85 memberships, 38 family/mentor/rival bonds, 18 timeline events and 10 lore notes (including conflict flags).
- Every tab reads from the same archive, so Characters, Organizations, Clans, Family tree, Connections, Timeline and Nexus dossiers already show those changes.

## What is still NOT synced (gaps found)
1. Series rosters: only 1 character is linked to a series/season, so Series pages, Journey and Compare charts are almost empty.
2. Abilities tab: ability-to-character links are empty (0), so ability holders, Nexus stat wheels and Ability FX character lists don't reflect the PDFs.
3. Two characters still have blank descriptions.

## Plan
1. Series rosters: from both PDFs, add each character to the series/seasons they appear in (The Sentinels S1-S5, Redline, Bloodline, Divine Beast, Zaan/Khalid/Alister epics), with role and alive/dead status where the PDF states it. Only add what the PDFs say; anything unclear gets listed for you to confirm.
2. Abilities: link each character to their primary abilities from the Character 2 chart (e.g. Zayn - Lightning, Nilanjona - Water Arts, Rowan - Red/Blue Flame, Ethan - Wind, Elizah - Blood Art), so the Abilities tab, dossiers and stat wheels match.
3. Fill the two blank character descriptions from the PDFs.
4. Refresh check: open Characters, Abilities, Series, Journey, Clans and a Nexus dossier to confirm the new info appears in all three styles.
5. Report anything the PDFs contradict (season placement, role) for you to decide, instead of guessing.

## Technical notes
- Writes go to series_characters, character_abilities and entities; the new merged-name guard keeps aliases from creating duplicates.
- Season roles also go into the per-season dossier map so Nexus dossiers and Journey stay consistent.
