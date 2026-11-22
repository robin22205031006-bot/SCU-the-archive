<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Entity pictures are stored as resized data URLs in `entities.image_url` — workspace blocks public storage buckets.
- PDF ingestion: text is extracted in the browser, AI output is filtered by `src/lib/lore-merge.ts` (verbatim-quote grounding) and admin-edited fields go into `locked_fields`, which ingestion never overwrites.
- Admin role is granted by a signup trigger on a fixed email; roles live only in `user_roles` (why: avoid privilege escalation).
- Role management verifies persisted roles before privileged access; superadmin bootstrap requires an Auth-verified confirmed identity and target protection uses Auth rather than editable profile emails, preventing forged privileges and owner demotion.
- Synchronize account changes through `syncSessionCache` before router refresh; retain lore on same-user token refresh, but purge on identity changes, sign-out and user updates to prevent stale privileges and private results crossing sessions.
- Lore application rechecks source quotes and resolves normalized exact names before writes; checked writes must surface partial failures instead of reporting false success.
- Admin uploads use the browser-only PDF parser and admin controller to call authenticated lore server functions, then invalidate archive queries even on partial write failures; characters and organizations remain kinds in the shared entities table so existing views stay synchronized.
- Gemini calls use the official SDK's web entry in authenticated server handlers with private credentials, because browser-prefixed secrets expose API keys and Node-specific SDK paths are incompatible with hosting.
- Archive writes use the existing authenticated database client rather than direct Drizzle connections, because Lovable Cloud does not expose a runtime database credential and RLS must remain effective.
- LoreChat preserves the existing single-session chat controls and rendering during provider integration; this is not a new chat layout, so replacing its primitives or adding history would violate the no-redesign requirement.
- The public install helper calls the AI model only from a server function with clipped inputs, because visitors are unauthenticated and prompts/keys must stay server-side.
- Database schema changes go through drizzle/migrations (applied by Lovable Cloud); the root supabase-*.sql files are historical references from the old backend and must not be re-run.
- Alternate reader UI lives in src/components/nexus-view.tsx, switched by src/lib/ui-style.ts (localStorage); it reuses entity data and data-spoiler masks so rules stay identical across styles.
- Nexus dossier uses browser-safe src/lib/nexus-season.ts to resolve entities.stats.dossier by `seriesId:seasonNumber` or `all`, including codename and per-ability stat profiles; character_abilities remains the ability-membership source, so season data stays isolated without schema changes.
- NexusShell replaces Classic navigation and ambient layers globally, using shared visibility/permission queries and CSS tokens; motion respects the existing animation preference and reduced-motion setting to avoid duplicating expensive effects or weakening access rules.
- Nexus stat-wheel presentation lives in a dedicated browser-safe component and receives resolved season profiles from the dossier, so the outer ability selector and inner chart share one selection without duplicating data rules.
- Season rosters and identity overrides use the existing dossier map; season ability membership stays in character_abilities, with checked staff writes and shared query invalidation to keep counts, dots and dossiers synchronized without a new schema.
- Archive revision capture uses database triggers on entities, character abilities and series memberships; snapshots are append-only for app users and admin-read-only so every write path is audited without trusting browser-supplied editor names.
- UI styles share a persisted picker; keep the legacy classic key for original-style compatibility, and apply Minimal motion suppression at the shared shell so switching styles never changes data or permissions.
- Cinematic is a Classic-backed style (isClassicBackedMode in src/lib/ui-style.ts, with Manga): it reuses Classic pages, queries and permissions; CinematicChrome (vignette, grain, route title cards) is decorative, pointer-events-none and never delays the next page, and motion-off/reduced-motion skip its title cards.
- Nexus tab browsers use the shared presentation-only NexusExplorer and NexusWorkspace with existing filtered records and action handlers; this keeps focused browsing consistent without duplicating permissions, queries or writes.
- Nexus CG effects stay in the persistent background canvas; NexusAbilitySymbol uses local illustrated atlases selected by browser-safe presentation classification, and NexusSign gates cel-layer animation by visibility and motion preferences without altering lore or other styles.
- Nexus symbol color and anime presentation overrides use the existing protected app_settings table and a shared query; atlas tiles retain SVG viewport clipping and apex/vampire art uses individual assets to prevent sprite leakage and identity mismatches.
- Nexus ability-specific artwork uses exact normalized identities and explicit aliases before broad element/icon classification; separate atlas coordinates keep guardian, animal and combat variants visually distinct without changing lore.
- Nexus emblem motion is device-local with Follow device (default, live reduced-motion updates) and Always static modes; preserve legacy static preferences and reuse the same colored artwork without changing shared admin presentation or background motion.
- Emblem and card motion animates only transform/opacity: glows are SVG gradient halos (never animated drop-shadow filters), the rank 4-5 sheen is round and transform-driven, Classic cards get a pointer spotlight via useCardSpotlight and Manga panels stepped ink focus lines; Minimal stays motion-free and every layer honours static, motion-off and reduced-motion settings.
- Series catalogue records are shared across UI styles; seriesSeasonNames resolves numbered seasons and named epics for the shared Series page so restored options remain staff-editable without separate style-specific catalogues.
- SeriesTools edits positional season titles through checked authenticated admin writes; its separate series-question function uses AI Gateway with explicitly scoped archive evidence and blocks answers server-side when any spoiler mask is enabled, without modifying legacy LoreChat.
- HUD navigation uses a collapsed circle and a shared Radix modal arc across all styles; focus trapping, background blur and scroll locking keep only navigation interactive, and selecting a destination closes it without changing visibility or staff rules.
- Nexus route transitions mount the next page immediately and animate its entrance rather than waiting for the previous page to exit, so motion never delays archive data.
- Nexus advanced ability FX are device-local opt-in; per-ability cel choreography (motif+variant) and upgrade lineages live in browser-safe src/lib/ability-fx.ts, rendered by a frame-stepped 2D canvas, so every ability stays unique (tested) without new data or schema.
- Ability FX upgrade chains default in src/lib/ability-fx.ts and admin overrides live in app_settings (`ability_fx_lineages`), validated by sanitizeLineages; shape-based painters (flame, lightning, wind, water, earth, nature, beasts, guardian aura) live in browser-only src/components/fx-painters.ts, other motifs fall back to the legacy DRAW table, so painters can be upgraded per motif without touching recipes.
- Ability presentation follows the SCU Ability Guide doc: Qahr al-Wujud is command (authority art, gather-hold-collapse judgement v2), White Lightning Drive is non-elemental momentum (speed art, beam v6), Khalid's shadows are demonic red not the dark core, and guide-only abilities use tier Unique until staff set canon tiers; uncertain chains are labelled "order unconfirmed".
- Ability in Action shares fighter-rig and elapsed-time camera smoothing; character-combat reference sequences stay separate from historical STORY_FIGHTS to avoid invented lore. Dedicated character-combat-fx layers around the rig; bundled environments and a 24-fps scrubber serve all combat scenes.
- Series title styles live in app_settings `series_styles`; the shared Series page hosts staff series and season-roster editing for all styles (Nexus-only title FX fall back to static glow).
- AI Box, series Q&A and story drafting use AI Gateway in authenticated server functions; Gemini only for PDF ingestion/embeddings (keys unreliable).
- Admin welcome: AdminWelcomeGate (root) plays the lazy AdminWelcome once per real sign-in, keyed by the token's session_id and amr time (src/lib/admin-welcome.ts), because Supabase re-emits SIGNED_IN on reloads, refocus and other tabs; the sign-in sound uses the same freshness check, Minimal/motion-off/reduced-motion get a static card, and the overlay never blocks input or moves focus.
- AI Box `askLore` (Gemini server-side, as declared in metadata.json for AI Studio) answers only verified sign-ins; signed-out calls get a sign-in reply with no model call, because the server function is reachable without the app UI.
- adminLoreSync ALIAS_MAP maps real names, codenames and merged duplicates to the in-story card name (tested), so syncs never recreate merged cards.
- The SCU Cast chart lives in browser-safe src/lib/scu-cast.ts (131 characters in story order, groups, real names, titles, bloodlines); every style sorts characters by it and filters by its groups, Minimal renders it as MinimalCastView, and the archive only changes through the admin "Sync SCU Cast" action via planLoreSync, so existing cards merge by name or alias (never duplicated) and repeated syncs skip identical lore notes. The one-time drizzle migration 0014_seed_scu_cast applies the same merge in the database (idempotent, alias-locks respected, merged-name guard honoured) and is generated from scu-cast.ts; a test keeps them in step.
- Archive sync, journey timeline and family-tree rules: see src/lib/AGENTS.md.
- Atlas map rules: see src/lib/AGENTS.md.
- Browser builds resolve the project-owned archive through archive-backend.ts, reject imported legacy connection defaults, and leave Cloud server runtime credentials untouched so preview and published records cannot diverge.
