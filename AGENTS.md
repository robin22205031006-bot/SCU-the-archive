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
- Synchronize account changes through `syncSessionCache` before router refresh; remove account-dependent cache data to prevent stale privileges and private results crossing sessions.
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
- Nexus tab browsers use the shared presentation-only NexusExplorer and NexusWorkspace with existing filtered records and action handlers; this keeps focused browsing consistent without duplicating permissions, queries or writes.
- Nexus CG effects stay in the persistent background canvas; NexusAbilitySymbol uses local illustrated atlases selected by browser-safe presentation classification, and NexusSign gates cel-layer animation by visibility and motion preferences without altering lore or other styles.
