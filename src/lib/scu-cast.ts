/**
 * The SCU Cast: every character from the cast chart, in story order, with their
 * real name, title, bloodline, abilities summary and group. Browser-safe data.
 *
 * Presentation reads this to order and group characters in every UI style; the
 * archive itself only changes through the admin "Sync SCU Cast" action, which
 * sends these rows through the non-destructive planLoreSync (existing cards are
 * merged by exact name or alias, never duplicated, and locked fields never change).
 */
import { canonicalEntityName } from "@/lib/adminLoreSync";

export type CastGroup =
  "sentinels" | "redline" | "legends" | "villains" | "kara" | "beasts" | "alt" | "others";

export interface CastGroupMeta {
  id: CastGroup;
  label: string;
  /** Accent on dark backgrounds (Classic, Nexus, Cinematic). */
  dark: string;
  /** Accent on light paper (Minimal light, Manga). */
  light: string;
}

export const CAST_GROUPS: readonly CastGroupMeta[] = [
  { id: "sentinels", label: "Sentinels", dark: "#4FCB97", light: "#1F8F6A" },
  { id: "redline", label: "Redline", dark: "#F05A66", light: "#B3202F" },
  { id: "legends", label: "Legends and history", dark: "#E2AE4A", light: "#B07818" },
  { id: "villains", label: "Villains and demons", dark: "#D35A85", light: "#6E2A4F" },
  { id: "kara", label: "Kara and Kurohana", dark: "#A88BEA", light: "#5A3F8C" },
  { id: "beasts", label: "Divine Beasts", dark: "#78C06A", light: "#3E7A3E" },
  { id: "alt", label: "Alternate timeline", dark: "#8FB0D8", light: "#4E6A8C" },
  { id: "others", label: "Others", dark: "#A39C90", light: "#6B655B" },
];

export interface CastMember {
  name: string;
  realName: string;
  title: string;
  bloodline: string;
  abilities: string;
  group: CastGroup;
  /** Position in the cast chart's story order (0 = first). */
  order: number;
}

type Row = [string, string, string, string, string, CastGroup];

// [story name, real name, title/code, bloodline, abilities, group], in story order.
const ROWS: Row[] = [
  [
    "Ethan",
    "Robin",
    "Gale Warden",
    "Zaan’s line (mother), Khalid’s line (father)",
    "Wind that surges with emotion, strongest when he protects someone. Wind Guardian mode manifests for the first time in the final fight against Isaac.",
    "sentinels",
  ],
  [
    "Elizah",
    "Robin",
    "Omen",
    "Zaan’s line (mother), Khalid’s line (father)",
    "Refined blood art inherited from Khalid’s line, driven by technique and survival rather than malice. Ethan’s other self.",
    "sentinels",
  ],
  [
    "Zayn Hayes",
    "Jubayer",
    "Duskblade, Black Knight",
    "El-Mansur (elder son of Agnus)",
    "Astrapo-Electrokinesis: electricity, lightning and thunder. Red lightning (Crimson Astrapo), inherited from Dorian, as his execution mode.",
    "sentinels",
  ],
  [
    "Xinea",
    "Marufa",
    "Nyxia",
    "Balance host",
    "Aether Dominion: control of the layer between matter and soul. Phasing, soul-touch and void erasure. Her early healing and fire were leaks of Aether.",
    "sentinels",
  ],
  [
    "Valeria",
    "Nawshin",
    "Ravenblade",
    "Al-Ahd",
    "Peak human assassin: Shadow Step, silent movement and the finest sword in the SCU. An incorruptible mind. Later wields Kara Yazgı.",
    "redline",
  ],
  [
    "Nilanjona",
    "Nisha",
    "Velonda",
    "Nezha (Vethara)",
    "Hydrokinesis: water’s flow, pressure and state. Stronger near water and with a calm mind. Accepts the Water Guardian’s path.",
    "sentinels",
  ],
  [
    "Grace",
    "Ela",
    "Bearer of Athena’s Judgement",
    "None (chosen by the Aldercrest Pendant)",
    "Divine Healing (Aegis of Mercy) and Athena’s Judgement, the Golden Eye: a court that weighs absolute moral weight. Holder of the light core.",
    "sentinels",
  ],
  [
    "Weston Hale",
    "Rafi",
    "",
    "El-Mansur and unknown",
    "White Lightning Drive: kinetic speed that stacks momentum and exists only while he moves.",
    "sentinels",
  ],
  [
    "Damian Brown",
    "Rohan",
    "Arcane Tactician",
    "Aldercrest",
    "Strategy and Aldercrest spellcasting.",
    "redline",
  ],
  [
    "Rowan Colloway",
    "Fahad",
    "Red Saint",
    "Duskmoor",
    "Red Flame Fist and super strength, then the Duskmoor flame, then earth.",
    "sentinels",
  ],
  [
    "Ayaan Siddique",
    "Ayman",
    "",
    "None",
    "Tech genius and tech support. His mind is his weapon, the seed of Echogrim.",
    "redline",
  ],
  [
    "Samuel Sterling",
    "Sammam",
    "Ghost-01",
    "None",
    "Peak-human super-soldier with no powers: Ghost Sense awareness, extreme endurance, a hardened tie as a weapon, and anything else as a weapon.",
    "redline",
  ],
  [
    "David (Dawood)",
    "Tamim",
    "Dagger Wolf",
    "El-Mansur (younger son of Agnus)",
    "Psychokinetic dagger mastery through the Call of Sharpness. Opens short-range portals with his daggers.",
    "sentinels",
  ],
  ["Maliha", "Luba", "", "None", "Healing and hand-to-hand combat.", "sentinels"],
  [
    "Nur",
    "Nur",
    "",
    "Demon Clan",
    "Blood Magic that fuels, summons, binds and extends life, which he refuses to use. Carries Iqaris’s soul essence.",
    "sentinels",
  ],
  [
    "Aariz Maddox",
    "Ariyan",
    "",
    "Beast Clan",
    "Bestiakinesis and hyperkinesis: speaks with and becomes animals, with heightened senses. Gains a mythical beast’s power after defeating it.",
    "sentinels",
  ],
  [
    "Saya",
    "Nusrat",
    "",
    "None",
    "Long-range weapons specialist raised in DEW. Valeria’s heir in skill, later holder of Kara Yazgı and heir to Anna’s sword.",
    "redline",
  ],
  [
    "Nytheris",
    "Madhobi",
    "The Nature Guardian",
    "Elf Clan",
    "The Nature Guardian, present across eras.",
    "legends",
  ],
  [
    "Amaya",
    "Humayra",
    "Disciple of the Nature Guardian",
    "None",
    "Acidic poison in mist, streams and vapor. The only winged character in the SCU.",
    "sentinels",
  ],
  [
    "Yoshiko Arashi",
    "Shakti",
    "",
    "Kara, Kurohana clan (daughter of Arashi)",
    "Chaos and Order (Forward and Break commands), Shishōjutsu corpse control through ofuda, and a full weapon set.",
    "redline",
  ],
  [
    "Derek Miles",
    "Rifat",
    "Vanguard-X",
    "None",
    "The first Ichor subject: human strength and speed at full output, faster recovery, and the Vanguard Pistol.",
    "redline",
  ],
  [
    "Dorian Cross",
    "John",
    "",
    "El-Mansur genes (rejected the name)",
    "Red lightning, the last carrier of it, which disrupts blood art. Elite battle IQ.",
    "legends",
  ],
  [
    "Eldrich Aldercrest",
    "Liam",
    "",
    "Aldercrest",
    "Aldercrest magic. Cursed by Khalid.",
    "legends",
  ],
  [
    "Norman",
    "Norman",
    "The Paleborn",
    "Demon Clan (turned)",
    "Cursed vampire: strength, speed, regeneration, predator senses, partial shapeshifting and mass nightmare control.",
    "villains",
  ],
  [
    "Agnus El-Mansur",
    "Agnus",
    "Dread Walker",
    "El-Mansur",
    "Qahr al-Wujud, making existence obey his will, and the Call of Sharpness, blades as authority.",
    "legends",
  ],
  [
    "Silas Duskmoor",
    "Silas",
    "Seraph of the Ash, Dragon Slayer",
    "Duskmoor (son of Tedmond)",
    "The Blue Flame, which burns only corrupted souls. Explosive, full-commitment fighting.",
    "legends",
  ],
  [
    "Marcello Corvani",
    "Corvani",
    "The Whale",
    "None",
    "No powers: stubbornness, leadership and mercy. Founded Redline’s team.",
    "redline",
  ],
  [
    "Kensho Arashi",
    "Arashi",
    "Blind Blade",
    "Kara, Kurohana clan (Wrath)",
    "Blind swordsmanship that keeps improving. Taught Valeria’s sword philosophy and trained Mashiho.",
    "kara",
  ],
  [
    "Anna",
    "Anna",
    "Anna la Sarta",
    "Al-Ahd (elder daughter of Ramiz)",
    "Peak human. Faced super beings without fear and won. Her ancestral sword passes through chosen heirs.",
    "legends",
  ],
  [
    "Issabela",
    "Issabela",
    "Zaynab",
    "Al-Ahd (younger daughter of Ramiz)",
    "Led the Nullborn Rome cell; later a detached assassin.",
    "legends",
  ],
  [
    "Anthony",
    "Anthony",
    "",
    "None",
    "Rebuilt the Nullborn. His preserved essence was placed inside Derek Miles.",
    "legends",
  ],
  ["Joe Rainer", "Billy", "", "None", "Not recorded in the files.", "sentinels"],
  [
    "William Victor",
    "Victor",
    "",
    "None",
    "Scientist and HWKS veteran. Co-founded ECAP; his formula is the base of the A-IV serum.",
    "others",
  ],
  [
    "Stitch",
    "Stitch",
    "",
    "None",
    "HWKS veteran and strategist who co-founded ECAP and turned the Old Order into DEW.",
    "villains",
  ],
  [
    "Kazumi",
    "Kurahana",
    "",
    "Kara, Kurohana clan (daughter of Arashi)",
    "Trained by elite killers inside the Kurohana.",
    "kara",
  ],
  [
    "Ramiz Al-Ahd",
    "Ramiz",
    "",
    "Al-Ahd",
    "Nullborn spy and Architect Cube guardian. Father of Anna and Issabela.",
    "legends",
  ],
  [
    "Soa Aldercrest",
    "Soa",
    "Fallen Goddess",
    "Aldercrest",
    "Held Athena’s Judgement before Grace.",
    "legends",
  ],
  ["Elina Quins", "Elina", "", "None", "Eldrich’s love. No powers recorded.", "legends"],
  [
    "Pristine",
    "Elizabeth Pristine",
    "Prismorph",
    "Demon Clan and Dragonic (Khalid and Freya)",
    "Prismorph: real-time adaptive shapeshifting, speed over force. Twin Ascension when both bloodlines awaken.",
    "villains",
  ],
  [
    "Arzuna",
    "Arzuna",
    "The Blue Lament (unofficial)",
    "None",
    "Unique vampiric hybrid with Blood Resonance, inheriting echoes of bonded people’s gifts. Azure Revenant State.",
    "sentinels",
  ],
  [
    "Arthur",
    "Arthur",
    "",
    "Dragonic (son of Freya and Gabriel)",
    "Pure dragon physiology: monstrous strength, dragon-scale durability and fast regeneration.",
    "villains",
  ],
  ["Gabriel", "Gabriel", "", "Dragonic", "Dragon.", "villains"],
  [
    "Freya",
    "Freya",
    "Queen of Destruction",
    "Dragonic",
    "Dragon, once a near-undefeated hero of the beast realm.",
    "legends",
  ],
  [
    "Niharo",
    "Niharo",
    "Hell Walker",
    "Vethara prophecy child",
    "Omni-Ergon: absorbs, stores, converts and releases any energy, as the vessel of all elements.",
    "villains",
  ],
  [
    "Alt Ethan",
    "",
    "",
    "Alternate timeline",
    "The alternate Ethan, the most moral man turned threat.",
    "alt",
  ],
  [
    "Alt Rowan",
    "",
    "",
    "Alternate timeline",
    "The alternate Rowan, killed by Rowan and Samuel.",
    "alt",
  ],
  [
    "Alt Weston",
    "",
    "",
    "Alternate timeline",
    "The alternate Weston, a Covenant prisoner who dies of extreme aging.",
    "alt",
  ],
  ["Alt Zayn", "", "", "Alternate timeline", "The alternate Zayn, manipulated by Asetra.", "alt"],
  ["Alt Xinea", "", "", "Alternate timeline", "The alternate Xinea.", "alt"],
  [
    "Alt David",
    "",
    "Leader of the Covenant",
    "Alternate timeline",
    "Architect of the Covenant, using Ethereal Splicing and the Aether siphon stone.",
    "alt",
  ],
  ["Evan Grant", "Mubasshir", "", "None", "Not recorded in the files.", "others"],
  [
    "Tedmond Duskmoor",
    "Tedmond",
    "Dragon Slayer",
    "Duskmoor",
    "The Blue Flame and raw skill. Spirit and dragon blood let him outlive normal humans.",
    "legends",
  ],
  [
    "Mashiho Kurohana",
    "Mashiho",
    "",
    "Kara, Kurohana clan (son of Pride)",
    "Trained in exile by Arashi. Learns Kara curse-binding.",
    "kara",
  ],
  [
    "Khalid",
    "",
    "Kelvan",
    "Demon (through a Mephisto contract)",
    "Abyssal Blood Dominion, living, corrupting blood, and Umbrakinesis, demonic shadow control.",
    "villains",
  ],
  [
    "Asetra",
    "",
    "Formerly Jessy",
    "Balance host",
    "Atomokinesis, omniscience, oneirokinesis and psychological dominion. The most powerful being in the SCU.",
    "villains",
  ],
  [
    "Isaac Ezekiel",
    "",
    "Leader of The Unwritten",
    "None (human)",
    "Genius intellect, technology and magic learned through sleep time jumps. Opens the void and jumps through time.",
    "villains",
  ],
  ["Isaac’s father", "", "", "None", "Weakened the realm seals.", "others"],
  [
    "Isaac’s mother",
    "",
    "",
    "Witch",
    "Never taught her son witchcraft. Sold her soul to Mephisto to preserve his body.",
    "others",
  ],
  ["Mira", "", "", "None", "Isaac’s love in the HWKS era.", "others"],
  [
    "Mephisto",
    "",
    "The Deal-Maker",
    "Demon",
    "Contracts. He never lies, only chooses which truths to tell.",
    "villains",
  ],
  ["Diablo", "", "Demon King", "Demon", "Led the Diablo Wars.", "villains"],
  ["Malachar", "", "Right Hand of the Devil", "Demon", "Strategy and calculation.", "villains"],
  ["Iqaris", "", "", "Demon", "Witch arts, one of the few demons to master them.", "legends"],
  [
    "Zaan al-Murad",
    "",
    "The Cursed Prodigy",
    "None",
    "Revival science, blood regeneration, berserk strength and speed.",
    "legends",
  ],
  ["Shina Nasrin", "", "", "None", "Zaan’s love.", "legends"],
  ["Ayesha Khatoon", "", "Grandma Ayesha", "None", "Sheltered Zaan and Shina.", "legends"],
  ["Raisa bint Khalid", "", "", "None", "Time-based revival research.", "legends"],
  ["Rahim Ibn Suleiman", "", "", "None", "Raisa’s husband.", "legends"],
  [
    "Mara Duskmoor",
    "",
    "",
    "Duskmoor (daughter of Tedmond)",
    "Separates corruption from a person and burns only the corruption.",
    "legends",
  ],
  ["Aeric Valenheart", "", "", "Kara", "Cursed weapon crafting. Forged Kara Yazgı.", "kara"],
  [
    "Kael Agharri",
    "",
    "",
    "Vethara, Agharri fire clan",
    "One of his bloodline’s most powerful warriors. Raised Niharo.",
    "legends",
  ],
  [
    "Seren Kara",
    "",
    "Curse-Binder",
    "Kara",
    "Binds protective curses into buildings and objects.",
    "kara",
  ],
  ["Francisco", "", "Nasab ibn Khalil", "None", "Nullborn operative, Khalid’s father.", "legends"],
  [
    "Mateo Cruz",
    "",
    "",
    "None",
    "Regeneration through cancer fused with Ichor. His body learns from every death.",
    "redline",
  ],
  [
    "Alistair Quinn",
    "",
    "The Joker",
    "None",
    "Genius strategist bound by a Mephisto smile clause.",
    "redline",
  ],
  ["Eveline", "", "", "None", "Alistair’s sister.", "others"],
  ["Raya", "", "", "Married into Aldercrest", "Alistair’s love.", "others"],
  [
    "Arvin",
    "",
    "",
    "None",
    "Peak human: para-commando, NSI training and master-level strategy.",
    "redline",
  ],
  [
    "Sean Stone",
    "",
    "Maverick #1",
    "None",
    "Peak human. HWKS founder and the most dangerous man of his era.",
    "others",
  ],
  [
    "Adrian Kessler",
    "",
    "Maverick #2",
    "None",
    "Peak human. Son of a corrupt chairperson; the man Stitch could never catch.",
    "others",
  ],
  [
    "Maverick #3",
    "",
    "Maverick #3",
    "None",
    "Young, voiceless peak human who speaks through a device.",
    "redline",
  ],
  ["Jada", "", "", "None", "Not recorded in the files.", "sentinels"],
  [
    "Pride",
    "",
    "Sin of Pride",
    "Kara, Kurohana clan",
    "Eldest and strongest of the seven siblings.",
    "kara",
  ],
  ["Greed", "", "Sin of Greed", "Kara, Kurohana clan", "Raised Kazumi on lies.", "kara"],
  ["Lust", "", "Sin of Lust", "Kara, Kurohana clan", "Defeated by Arashi.", "kara"],
  ["Sloth", "", "Sin of Sloth", "Kara, Kurohana clan", "Not recorded in the files.", "kara"],
  ["Envy", "", "Sin of Envy", "Kara, Kurohana clan", "Not recorded in the files.", "kara"],
  ["Gluttony", "", "Sin of Gluttony", "Kara, Kurohana clan", "Not recorded in the files.", "kara"],
  ["Kaizen", "", "", "Kara, Kurohana clan (son of Pride)", "Not recorded yet.", "kara"],
  ["Isagi", "", "", "Kara, Kurohana clan (son of Pride)", "Not recorded yet.", "kara"],
  ["Azwar", "", "", "Not recorded", "Not recorded yet.", "beasts"],
  ["Azwain", "", "Prince of the Beast Realm", "Beast Clan", "Not recorded yet.", "beasts"],
  ["The Beast King", "", "", "Beast Clan", "Not recorded yet.", "beasts"],
  ["Orion", "", "", "Not recorded", "Not recorded yet.", "beasts"],
  ["Saya (Divine Beasts)", "", "", "Not recorded", "Not recorded yet.", "beasts"],
  ["Maya", "", "", "Not recorded", "Not recorded yet.", "beasts"],
  ["Graye", "", "", "Not recorded", "Not recorded yet.", "beasts"],
  [
    "Ayesha (Khalid’s mother)",
    "",
    "",
    "None",
    "Killed by her son in 1461 for the pendant fragment.",
    "legends",
  ],
  [
    "Marco",
    "",
    "",
    "None",
    "Core member of the Nullborn Rome cell. Killed by Khalid in 1461.",
    "legends",
  ],
  [
    "Mehnaz",
    "",
    "",
    "None",
    "Core member of the Nullborn Rome cell. Did not survive its collapse.",
    "legends",
  ],
  [
    "Abdul",
    "",
    "",
    "None",
    "Core member of the Nullborn Rome cell. Did not survive its collapse.",
    "legends",
  ],
  [
    "Hassan",
    "",
    "",
    "None",
    "A Nullborn keeper of knowledge about the seal, who chose death rather than give it to Khalid.",
    "legends",
  ],
  [
    "Piedro",
    "",
    "",
    "None",
    "A beggar turned renegade who stole Anna’s sword and was corrupted by it. Killed by Khalid.",
    "legends",
  ],
  [
    "The Borgia (Rodrigo and Cesare)",
    "",
    "",
    "None",
    "Took control of the Nullborn through a puppet leader until Anthony rebuilt it.",
    "legends",
  ],
  [
    "Steven Aldercrest",
    "",
    "The Guardian",
    "Aldercrest",
    "Eldrich’s father and a Cube guardian, who passed the Architect Cube to Dorian: “Destiny needs rebellion, not perfection.”",
    "legends",
  ],
  [
    "Abbas",
    "",
    "",
    "None",
    "One-legged leader of the Forgotten Ones who betrayed Zaan’s location for gold.",
    "legends",
  ],
  ["Dirham", "", "", "None", "Half-blind leader of the Forgotten Ones.", "legends"],
  [
    "Hisam",
    "",
    "",
    "None",
    "A lonely village boy Zaan befriended with his last piece of bread.",
    "legends",
  ],
  [
    "Mizan",
    "",
    "",
    "None",
    "A young villager who admired Zaan, who meant to buy him new shoes.",
    "legends",
  ],
  ["Raijan", "", "", "None", "A young villager who admired Zaan.", "legends"],
  ["Shahdat", "", "", "None", "A young villager who admired Zaan.", "legends"],
  ["Rahmat", "", "", "None", "A young villager who admired Zaan.", "legends"],
  [
    "Arashi’s wife",
    "",
    "",
    "None",
    "Assaulted by Lust and threatened into silence by the brothers; mother of Yoshiko and Kazumi.",
    "kara",
  ],
  [
    "The former Wind Guardian",
    "",
    "",
    "Guardian",
    "An arrogant Wind Guardian whom Ethan defeated at Yasnaya, the place Ethan was meant to rule.",
    "legends",
  ],
  [
    "The Water Guardian",
    "",
    "",
    "Guardian",
    "The guardian destined to mentor Nilanjona.",
    "legends",
  ],
  [
    "The Sky Guardian",
    "",
    "",
    "Guardian",
    "Destroyed in Season 5 by the integrated Ethan and Elizah.",
    "villains",
  ],
  [
    "Lucen Vale",
    "",
    "The Godspeed Anomaly",
    "None",
    "Product of DEW’s Velocity Genome Program, tied to Alt Weston’s cloning.",
    "villains",
  ],
  ["Riven Creed", "", "Silent Node", "None", "Wears DEW’s Silent Node exosuit.", "villains"],
  [
    "Midory",
    "",
    "",
    "None",
    "A later member of the Redline team. Little else is recorded.",
    "redline",
  ],
  [
    "The HWKS vice captain",
    "",
    "",
    "None",
    "Sean’s closest friend, bought by the network. Arranged Sean’s murder; executed by Maverick #2.",
    "others",
  ],
  [
    "Adrian’s father",
    "",
    "The chairperson",
    "None",
    "A corrupt chairperson behind HWKS who sacrificed his favorite son.",
    "villains",
  ],
  [
    "The third leader",
    "",
    "",
    "The seven families",
    "The seven families leader Corvani spared because of the child in his car, who later killed him.",
    "villains",
  ],
  [
    "Corvani’s wife",
    "",
    "",
    "None",
    "Secretly guarded by Redline and Valeria after his death.",
    "redline",
  ],
  [
    "Corvani’s son",
    "",
    "",
    "None",
    "A primary-school boy, secretly guarded by Redline and Valeria after his father’s death.",
    "redline",
  ],
  [
    "Kaelor Ashvane",
    "",
    "The Oath-Warden",
    "Cobra Houses (Indian Cobra)",
    "Neurotoxic venom that paralyzes rather than destroys. He telegraphs every strike with a glowing hood-pulse around his arm: the warning means negotiation is over. The last ambassador to the Dragon Court.",
    "beasts",
  ],
  [
    "Velmora Ishtaan",
    "",
    "The Veiled Regent",
    "Cobra Houses (Monocled Cobra)",
    "Dual neurotoxic and cytotoxic venom, but she almost never fights. Her intelligence network, the Watching Eye, dismantles threats before they arrive. The Beast Realm’s de facto highest civil authority.",
    "beasts",
  ],
  [
    "Ophirion Drakhar",
    "",
    "The Hollow Crown",
    "King Cobra (belongs to no house)",
    "A towering apex snake-eater with a venom payload that could kill an elephant, who fights at full height. Offered the crown because the houses couldn’t safely oppose him.",
    "beasts",
  ],
  [
    "Sethan Vael",
    "",
    "The Banded Judge",
    "Krait Blood (Banded Krait)",
    "Passive until he switches, then controlled neurotoxic sequences that disable motor functions in order. A Dragon Order-trained judge whose own law was exploited to destroy Hollowreed.",
    "beasts",
  ],
  [
    "Viresh Kothar",
    "",
    "The Silent Bite",
    "Krait Blood (Wall’s Krait)",
    "Venom no one can predict a treatment for, and preparation so thorough the fight is the last step. The first to document the Viper Covenant, now working outside the system.",
    "beasts",
  ],
  [
    "Sulhan Nightveil",
    "",
    "The Painless Death",
    "Krait Blood (Common Krait)",
    "A painless, progressively paralyzing venom. A former healer of the krait medical order who could make dying feel like release.",
    "beasts",
  ],
  [
    "Ravek Stillfang",
    "",
    "The Patient Blade",
    "Viper Covenant (Russell’s Viper)",
    "Hemotoxic venom that turns the victim’s own blood against them, a figure-eight striking stance, and a viper’s heat sense that reads what every being desires.",
    "beasts",
  ],
];

export const SCU_CAST: readonly CastMember[] = ROWS.map(
  ([name, realName, title, bloodline, abilities, group], order) => ({
    name,
    realName,
    title,
    bloodline,
    abilities,
    group,
    order,
  }),
);

const byCanonical = new Map<string, CastMember>();
for (const member of SCU_CAST) {
  const key = canonicalEntityName(member.name, "character");
  if (!byCanonical.has(key)) byCanonical.set(key, member);
}

/** The cast entry for an archive character, matched by exact name or known alias. */
export function castMemberFor(name: string | null | undefined): CastMember | undefined {
  if (!name) return undefined;
  return byCanonical.get(canonicalEntityName(name, "character"));
}

export function castGroupMeta(group: CastGroup | undefined): CastGroupMeta | undefined {
  return CAST_GROUPS.find((g) => g.id === group);
}

/** Story order: cast-chart position first, then everyone else alphabetically. */
export function sortByStoryOrder<T extends { name: string }>(list: readonly T[]): T[] {
  const rank = (e: T) => castMemberFor(e.name)?.order ?? Number.MAX_SAFE_INTEGER;
  return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** Filters to one cast group ("all" keeps everyone, including uncharted cards). */
export function filterByCastGroup<T extends { name: string }>(
  list: readonly T[],
  group: CastGroup | "all",
): T[] {
  if (group === "all") return [...list];
  return list.filter((e) => castMemberFor(e.name)?.group === group);
}

const NOT_RECORDED = /^not recorded/i;

/**
 * Rows for the admin "Sync SCU Cast" action (shape of syncLoreExport entities).
 * The title goes to alias; real names stay presentation-only. Legends default to
 * the Legend status; everyone else keeps the archive default until staff edit.
 */
export function castSyncEntities() {
  return SCU_CAST.map((m) => ({
    kind: "character" as const,
    name: m.name,
    alias: m.title || null,
    role: castGroupMeta(m.group)?.label ?? null,
    status: m.group === "legends" ? "Legend" : null,
    category: null,
    description: NOT_RECORDED.test(m.abilities) ? "" : m.abilities,
    quote: "",
    sources: ["SCU Cast chart"],
  }));
}
