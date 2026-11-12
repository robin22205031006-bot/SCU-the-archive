# Fix mobile fit, merge duplicate characters, per-season Series editor, AI Box

Applies to all three styles (Descrete, Nexus, Minimal) since the Series page and admin panel are shared; Nexus gets its own animated font/FX options.

## 1. Screens fit every device (all styles)

- Members Management: input, role picker and "Assign role" stack full-width; long user IDs shorten with "…"; role buttons wrap under the name instead of running off-screen.
- Admin header "Ingest" button stops overflowing the edge.
- Sweep every page at phone width (360-412px) and fix anything wider than the screen: tables, rows of buttons, long names, dialogs, editors.
- Add an automated phone-width check that fails if any page scrolls sideways.

## 2. Merge duplicate characters for good (first)

- Re-read the character chart PDF to get each character's in-story name, real name and codename.
- Merge every duplicate (e.g. Zayn into Zayn Hayes, Bunny into Ethan, real-name or codename cards into the story-name card), keeping all notes, abilities, relationships, series roles and pictures.
- Stop them coming back: the "Sync lore export" and PDF ingestion will match real names, codenames and aliases to the existing story-name card instead of creating a new one.
- Show you the merge list before applying.

## 3. Series editor (admins and mods)

- Add / edit series: name, description, cover, number of seasons, season number and season name.
- Per series styling: font, colour, font effect. Nexus additionally offers animated fonts with FX.
- Per season, per character:
  - Role: Main Protagonist, Main Antagonist, Impactful Character, plus existing roles (Protagonist, Antagonist, Support, Anti-hero, Anti-villain).
  - Status: Alive, Dead, Missing, Presumed Dead, Revived.
  - Abilities gained or upgraded that season, with per-ability stats (Power, Agility, Wisdom, Vitality, etc.).
  - Season story: write it by hand, or "Fill from PDFs" which drafts it from the lore for the admin to review.
- Spoiler toggle on the Series page (admins/mods) hides roles, status, abilities, stats and stories from readers.

## 4. One source of truth across tabs

- The Series editor writes to the same per-season records the Character dossier, Abilities tab and Nexus roster already read, so a change shows everywhere immediately.

## 5. Series list showing "No series yet"

- Check why the published app lists 0 series (data or reader access) and fix it.

## 6. AI Box works reliably

- Switch the AI Box (and series questions) to Lovable's built-in AI so it no longer depends on the Google keys, which only one works. Keep answers grounded in the archive with sources.
- Clear error message if it ever fails, and your question stays in the box.
- Test it end-to-end signed in.

## Technical details

- Merge via existing `merge_entities` RPC; alias matcher in ingestion/lore export keyed on normalized name, alias, real name, codename.
- Season data in existing `entities.stats.dossier` map + `character_abilities` (series_id, season_number) + `series_characters`; series styling and season names on `series` (new columns via migration for font/colour/effect, status enum values expanded).
- Spoiler mask key `series` in `app_settings`, reusing `spoiler-mask.tsx`.
- AI calls via `@lovable.dev/ai-gateway` in authenticated server functions; Gemini kept only for PDF ingestion.
- Shared query invalidation after every series write.
