# Compact modal HUD, sign-in and speed
- [ ] Make HUD a small circle that opens a sliding modal, blurs/locks the page and closes on navigation in all styles.
- [ ] Enable Google sign-in with existing optional profiles; explain unsupported requested providers.
- [ ] Measure loading, address verified bottlenecks, and verify desktop/tablet/phone layouts and HUD flows.

# Left-side HUD and emblem access
- [x] Replace the HUD with a left-side curved, sliding navigation menu across all three styles.
- [x] Allow emblem color edits only for admins and moderators, preserving protected saves.
- [x] Verify all styles, phone layout, navigation and permissions.

# Season titles and lore questions
- [x] Add per-season title controls with checked admin saves across all three styles.
- [x] Add series/season questions answered through AI Gateway from scoped existing lore, respecting spoiler controls.
- [x] Test title persistence, lore scoping and signed-in question flows.

# Restore original series catalogue
- [x] Restore original five series and their seasons in shared records, preserving existing lore.
- [x] Show selectable seasons in all three styles and verify original counts and named epics.

# Nexus device-following emblem motion
- [x] Add saved Follow device and Always static options while preserving existing preferences.
- [x] Verify live device-preference changes, saved selection and static artwork.

# Nexus static emblems
- [x] Add a reader-controlled, saved static-emblem switch in Nexus Appearance.
- [x] Verify instant switching, reload persistence and system reduced-motion support.

# Distinct Nexus ability emblems
- [x] Replace shared/fallback artwork for every listed ability with a distinct lore-informed emblem.
- [x] Verify exact-name aliases, artwork isolation, animation and existing admin color controls.

# Nexus emblem corrections and anime presentation
- [x] Fix sprite clipping and review ability classification, including vampire and unique apex emblems.
- [x] Add shared admin per-symbol colors/anime overrides and a Nexus-wide anime presentation switch.
- [x] Test saved settings, artwork containment, motion safety and style isolation.

# Nexus illustrated ability symbols
- [x] Create Nexus-only elemental and skill emblems inspired by the references, with fitting animation.
- [x] Apply to ability browsing, badges and dossier abilities; verify motion, layout and style isolation.

# Nexus exact-sign animation
- [x] Animate existing signs with shape-preserving 2D effects across Nexus, retaining the 3D backgrounds.
- [x] Verify the pictured orbit sign, other symbols, pause controls and phone layout.

# Nexus 3D presentation
- [x] Add shared 3D ability/group symbols and ability-inspired background simulations across Nexus tabs.
- [x] Isolate Nexus themes and fonts from Descrete; add fluid text/page transitions with motion controls.
- [x] Verify theme persistence, spoiler safety, live rendering and desktop/phone layout.

# Nexus across all tabs
- [x] Add category-to-focused-record Nexus browsing for abilities, groups, series, timeline, stories, documents and community.
- [x] Add immersive Nexus map/graph workspaces, Home navigation and shared section navigation for account/staff tools.
- [x] Preserve existing edits, spoiler masks and data; verify signed-in browsing and mobile layout without changing Descrete or Minimal.

# Nexus season and motion update
- [x] Add immutable admin audit history with editor names, timestamps and revision comparison for all styles.
- [x] Add Home UI Style choices: Descrete, Nexus and low-motion Minimal; verify switching.
- [x] Add series/season character selectors, changing role counts, season rosters and role-colored dots.
- [x] Add admin season editing for roles, status, philosophy, groups, abilities and stats; verify saved changes.
- [x] Match the reference wheel with an outer ability-selection arc and inner labeled ability stats; verify selection, saved values, and desktop/mobile display.
- [x] Add named series/season editing, season titles, Wisdom/Vitality and selectable ability-specific stats.
- [x] Animate highest-stat ring and season-role background without leaking spoilers.
- [x] Add Nexus to Appearance and distinct animated navigation, tabs and background.
- [x] Test rules and verify signed-in saves and desktop/mobile interactions.
- [x] Restore the approved panel/card dossier layout with the season, codename and ability-stats changes kept.

# Reliability and performance
- [x] Fix verified session/cache and page-flow defects without visual changes.
- [x] Fix verified lore ingestion/save defects while preserving manual edits.
- [x] Add regression tests and verify main flows on desktop and mobile.

# Automated PDF lore ingestion
- [x] Connect admin PDF uploads to shared parsing, AI extraction, and automatic saving.
- [x] Preserve grounded lore and manual edits; refresh archive views after writes, including partial failures.
- [x] Run regression tests and verify a signed-in PDF upload through the archive UI.

# Gemini integration (completed in prior updates)
- [x] Connect private-key Gemini extraction and the existing chat through a dedicated LoreChat component.
- [x] Preserve protected archive saves, grounding and manual fields; test and verify PDF and chat flows.