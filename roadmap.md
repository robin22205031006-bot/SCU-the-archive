# Nexus season and motion update
- [x] Add named series/season editing, season titles, Wisdom/Vitality and selectable ability-specific stats.
- [x] Animate highest-stat ring and season-role background without leaking spoilers.
- [x] Add Nexus to Appearance and distinct animated navigation, tabs and background.
- [x] Test rules and verify signed-in saves and desktop/mobile interactions.

# Reliability and performance
- [x] Fix verified session/cache and page-flow defects without visual changes.
- [x] Fix verified lore ingestion/save defects while preserving manual edits.
- [x] Add regression tests and verify main flows on desktop and mobile.

# Automated PDF lore ingestion
- [x] Connect admin PDF uploads to shared parsing, AI extraction, and automatic saving.
- [x] Preserve grounded lore and manual edits; refresh archive views after writes, including partial failures.
- [x] Run regression tests and verify a signed-in PDF upload through the archive UI.

# Gemini integration
- [ ] Connect private-key Gemini extraction and the existing chat through a dedicated LoreChat component.
- [ ] Preserve protected archive saves, grounding and manual fields; test and verify PDF and chat flows.