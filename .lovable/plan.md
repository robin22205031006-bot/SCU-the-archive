# Sync "For Apps update of everything" into the archive

The uploaded 36-page PDF is a canon breakdown of SCU organizations, clans, lineages, favorite story beats and naming notes. It also flags where the source files disagree. The plan writes these facts into the shared archive so every tab and every style (Descrete, Nexus, Minimal) shows them.

## What gets updated

1. **Organizations** (create a card if missing, enrich it if it exists, merge duplicates): Nine Clans / Ancient Ones, Nullborn (1417), Forgotten Ones -> Hidden Ones, H.W.K.S., E.C.A.P., Old Order -> D.E.W., Covenant, Sentinels, Obsidians (formerly Umbral; that name is shown as an alias only), Corvani's Redline Team, Kurohana clan, and the Maverick title line (Sean Stone #1 ...).
   - Founding era, status, leaders, purpose and description, all taken from the PDF text.
2. **Clans and bloodlines**: Al-Ahd (Ramiz, Anna la Sarta, Issabela/Zaynab), Aldercrest (Eldrich/Liam, Soa, Damian), Duskmoor (Tedmond, Silas, Rowan), El-Mansur (Agnus/Altan, Zayn, David), and the other named clans. Membership is added to the clan tree and Connections star map.
3. **Characters**: Valeria as Ravenblade descended from Anna and Issabela, Stitch, Victor, Orion, Anthony, Sean Stone, Arashi, Alt David, Corvani's whale codename, and others the PDF names. Aliases and real names are added, and fields an admin has locked are left alone.
4. **Relationships / bonds**: kin, mentor, commands and rival bonds the PDF states directly, for example David and Zayn as brothers, Agnus as their father, and Valeria/Yoshiko/Arashi training Xinea.
5. **Timeline**: dated events such as the Asetra seal (380 BC), clan structuring (290 BC), Nullborn (1417), Hidden Ones (~1455-1470), Old Order (>=1682), Arthur hatching (1692), DEW (~2005), Covenant (~2025), and the season beats S1-S5. Each is marked as documented or estimated, the way the PDF marks it.
6. **Lore notes**: key story beats such as the dragon-egg chain, the Anthony chip, Corvani's whale and Silas's body, each saved with a short source quote.

## Name conflicts

- Names are matched against existing cards and the alias map first. When that fails, I check the Character 2 PDF (and other PDFs already in the app, if they are in the vault or lore export).
- Conflicts the PDF itself flags are recorded as notes, not "fixed" by guessing. These include Ramiz/Ramij/Rahim, Arashi's era (19th century vs born 1979), Covenant's origin, and the unrecorded original Old Order name.
- I'll list any match I still can't resolve so you can decide.

## Rules kept

- Nothing is invented: only facts present in this PDF or the existing PDFs are used.
- Abilities, roles, status and ability holders stay behind the current spoiler toggles.
- Merged cards are never recreated.
- The change is one-time and repeatable, recorded as a database migration so it can't run twice.

## Technical details

- Parse the full text and write a structured extraction (orgs, memberships, relations, timeline, notes) to /tmp. Then resolve names with `adminLoreSync` ALIAS_MAP and normalized exact names, falling back to the Character 2 PDF text if it exists in pdf_chunks or public/lore-export.
- Write a new drizzle migration with idempotent upserts into entities (kind organization/clan), entity_memberships, entity_relations, timeline_events and lore_notes. It respects `locked_fields` and adds new ALIAS_MAP entries with a test.
- Existing query invalidation already refreshes Archive, Clans, the star map, Journey and Nexus dossiers. After seeding, verify these on a phone viewport.
