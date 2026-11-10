# Ability in Action — real fighters, painted FX, story fights, remaining chains

Applies to the Nexus Ability FX / Ability in Action pages (shared pages, so they look the same from any style).

## 1. Story fight passages (shown to you first)
- Pull every combat passage from the imported lore (characters, timeline, updates) that mentions Dorian, Weston, Zayn, Lucas, Ethan, Elizah and other fighters.
- Found so far: Zayn + Weston vs Lucas (the hybrid DEW experiment); the Season 5 catastrophe fight where Weston and Zayn face a super-strong, very fast enemy and an injured Weston intercepts the bomb; Zayn using Dorian's red lightning.
- Add a "Story Fights" list on the Ability in Action page. Each card shows the source quote, the characters, and a play button. Scenes with no passage are marked "not in the story yet" instead of being invented.

## 2. Fighter silhouettes from the fire-sword sheets
- Replace the stick figures with filled shadow-fighter silhouettes: head, hair or ponytail, a cloak or scarf that trails behind, torso, layered limbs, weapon.
- A pose library based on the reference sheets: ready stance, overhead wind-up, low lunge, rising cut, spinning cut, leap-and-throw, spear dash, ground slam, kneeling finish, casting (healing/blessing).
- Male fighters: wider, heavier stances, armour shapes, two-handed strikes. Female fighters: long hair or ponytail, scarf trails, leaps, spins and spear or scythe arcs. Both use the same step order: wind-up, strike, follow-through, finish.
- Smooth blending between poses, with a short hold on strong key poses (an anime-style pause before impact).

## 3. Painted effects
- New painted brush strokes: crescent slashes, fire arcs, wind swirls, spear streaks, ground bursts with dust and debris, healing columns, blessing crosses.
- Each stroke has dark outer edges, bright centres and colour shading along its length, then breaks up into small shards and sparks as it fades.
- These replace the current effects on both the Ability FX and Ability in Action pages.

## 4. Remaining upgrade chains, each with its own animation
- Blood: Blood Manipulation, Hemokinesis, Sanguine Shift, Demonic Hemokinesis (blood whips, crystallised spikes, a red demonic aura).
- Aether: Aether, Aether Dominion (purple space rifts and a gravity vortex).
- Arcane: Magic Cast, Arcane Magic, Reality Bend (rune circles, beams, warped space).
- Chaos: Chaos Magic, Chaos and Order (split black-and-white spirals).
- Tech: Kinetic Suits, Super Soldier (suit panels forming, thrusters, impact rings).
- Blades: Swordsman, Sword Master, Gladiokinesis, Dagger Portals (painted cuts, flying blades, portals).
- Shadow: Shadow Steps, Ghost, Stealth Kill, Assassin (blink trails, afterimages, a single finishing cut).
- Animal forms: Tiger, Lion, Hyena, Snakes, Dragoon, Beast Transformation (a filled body turns into the animal, then moves with that animal's gait and attacks).
- Admins can still edit or re-order any chain. Any order I can't confirm in the PDFs is marked as unconfirmed.

## Technical details
- `src/components/fighter-rig.ts` (new, browser-only): a bone rig, a pose library and a silhouette painter. `ability-action-canvas.tsx` switches to it.
- `src/components/fx-painters.ts`: adds painters for brush slashes, arcs, swirls and bursts, plus painters for blood, aether, arcane, chaos, tech, blade, shadow and animal effects. This removes the fallback to the old effects.
- `src/lib/ability-action.ts`: new choreographies by motif, and a `storyFights` list sourced from lore quotes.
- `src/lib/ability-fx.ts`: chain defaults for the new families.
- Tests: every ability resolves to a motif that isn't the fallback, every chain listed above exists in order, and every story fight has a source quote.
