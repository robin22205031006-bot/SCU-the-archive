import ruinPresent from "@/assets/maps/ruincity-present.jpg";
import ruinWar from "@/assets/maps/ruincity-war.jpg";
import aethmos from "@/assets/maps/aethmos.jpg";
import nilanjona from "@/assets/maps/nilanjona.jpg";
import yAncient from "@/assets/maps/yasnaya-ancient.jpg";
import yPalace from "@/assets/maps/yasnaya-palace.jpg";
import yPresent from "@/assets/maps/yasnaya-present.jpg";
import world from "@/assets/maps/world.jpg";
import worldTop from "@/assets/maps/world-top.jpg";
import nilaPre from "@/assets/maps/nilanjona-pre-asetra.jpg";
import topNila from "@/assets/maps/top-nilanjona.jpg";
import topAeth from "@/assets/maps/top-aethmos.jpg";
import topYas from "@/assets/maps/top-yasnaya.jpg";
import topRuin from "@/assets/maps/top-ruincity.jpg";
import pocket from "@/assets/maps/pocket-dimension.jpg";
import topPocket from "@/assets/maps/top-pocket-dimension.jpg";
import istanbul from "@/assets/maps/istanbul-1417.jpg";
import topIstanbul from "@/assets/maps/top-istanbul-1417.jpg";
import istanbulPresent from "@/assets/images/istanbul_present_map_1794611237650.jpg";
import rome15th from "@/assets/images/rome_15th_map_1794611238477.jpg";
import romePresent from "@/assets/images/rome_present_map_1794611240079.jpg";
import romeTop from "@/assets/images/rome_top_map_1794611240961.jpg";
import romania15th from "@/assets/images/romania_15th_map_1794611241740.jpg";
import romaniaTop from "@/assets/images/romania_top_map_1794611241385.jpg";

/** Browser-safe atlas data for the Nexus full-screen maps. Coordinates are % of the map image. */
export type AtlasFx =
  "snow" | "fireflies" | "mist" | "embers" | "wind" | "spores" | "rift" | "lanterns" | "ash";

export type AtlasLandmark = {
  id: string;
  name: string;
  x: number;
  y: number;
  note: string;
  characters?: string[];
  faction?: string;
};

export type AtlasEra = {
  id: string;
  label: string;
  image: string;
  width: number;
  height: number;
  summary: string;
  fx: AtlasFx[];
  landmarks: AtlasLandmark[];
  routes?: [string, string][];
};

export type AtlasTop = {
  image: string;
  width: number;
  height: number;
  era: string;
  landmarks: AtlasLandmark[];
  routes?: [string, string][];
};

/** transition: how the frame-by-frame simulation moves between eras. */
export type AtlasLocation = {
  id: string;
  name: string;
  epithet: string;
  worldX: number;
  worldY: number;
  transition: "quake" | "war" | "growth" | "calm";
  top: AtlasTop;
  eras: AtlasEra[];
};

export type AtlasWorldRoute = {
  from: string;
  to: string;
  label: string;
};

export const WORLD_MAP = world;
export const WORLD_TOP = worldTop;
export const WORLD_IMAGE_WIDTH = 1024;
export const WORLD_IMAGE_HEIGHT = 1792;

/** Fits any portrait or landscape map inside the available viewport without cropping edges. */
export function computeFitDimensions(
  containerW: number,
  containerH: number,
  mediaW: number,
  mediaH: number,
): { width: number; height: number } {
  if (containerW <= 0 || containerH <= 0 || mediaW <= 0 || mediaH <= 0) {
    return { width: Math.max(1, mediaW), height: Math.max(1, mediaH) };
  }
  const scale = Math.min(containerW / mediaW, containerH / mediaH);
  return {
    width: Math.max(1, Math.round(mediaW * scale)),
    height: Math.max(1, Math.round(mediaH * scale)),
  };
}

export const ATLAS_WORLD_ROUTES: AtlasWorldRoute[] = [
  { from: "istanbul-1417", to: "rome", label: "The 15th-Century Flight to Rome" },
  {
    from: "istanbul-1417",
    to: "romania-15th",
    label: "Carpathian Frontier & Forgotten Ones Trail",
  },
  { from: "romania-15th", to: "rome", label: "Order & Bloodline Courier Corridor" },
  { from: "aethmos", to: "yasnaya", label: "Guardian Sanctuary Passage" },
  { from: "yasnaya", to: "ruincity", label: "Eastern Rift & Border Road" },
  { from: "ruincity", to: "pocket-dimension", label: "Space-Time Fracture Echo" },
];

export const ATLAS: AtlasLocation[] = [
  {
    id: "nilanjona",
    name: "Nilanjona's Realm",
    epithet: "The water kingdom called a village",
    worldX: 52,
    worldY: 12,
    transition: "quake",
    top: {
      image: topNila,
      width: 1024,
      height: 1792,
      era: "Present",
      landmarks: [],
      routes: [
        ["palace", "city"],
        ["city", "chasm"],
        ["chasm", "sunken"],
        ["falls", "warm-village"],
      ],
    },
    eras: [
      {
        id: "pre-asetra",
        label: "Before Asetra",
        image: nilaPre,
        width: 1024,
        height: 1792,
        fx: ["mist"],
        summary:
          "Before the Asetra incident and the great earthquake. No giant ice mountains yet — the temples, aqueducts and homes now under the lake stood on dry land, and the water folk lived both on land and in the water.",
        routes: [
          ["palace", "falls"],
          ["falls", "capital"],
          ["warm-village", "capital"],
        ],
        landmarks: [
          {
            id: "palace",
            name: "Hilltop Palace",
            x: 75,
            y: 9,
            note: "Same hill as today's Crystal Ice Palace, before the ice.",
            faction: "Water Folk",
          },
          {
            id: "wall",
            name: "Northern Cliffs",
            x: 30,
            y: 7,
            note: "Lower cliffs; the earthquake later raised them into glacial mountains.",
          },
          {
            id: "caves",
            name: "Cliff Halls",
            x: 9,
            y: 19,
            note: "Later became the Crystal Ice Caves.",
          },
          { id: "falls", name: "Great Cascade", x: 52, y: 53, note: "Same falls as today." },
          {
            id: "warm-village",
            name: "Valley Villages",
            x: 12,
            y: 70,
            note: "Same green valley as today.",
          },
          {
            id: "capital",
            name: "Old Domed Capital",
            x: 50,
            y: 85,
            note: "On dry land. The Asetra earthquake sank it; today it is the Sunken Temple.",
            characters: ["Nilanjona"],
          },
        ],
      },
      {
        id: "present",
        label: "Present",
        image: nilanjona,
        width: 1024,
        height: 1792,
        fx: ["snow", "mist"],
        summary:
          "Almost as big as a small country. Three-fifths is ice — needle mountains, the crystal palace and long frozen castles — and two-fifths is warm green land, rivers and forests. Villages sit in both and blend into each other.",
        routes: [
          ["palace", "city"],
          ["city", "falls"],
          ["falls", "sunken"],
          ["frost-village", "warm-village"],
        ],
        landmarks: [
          {
            id: "palace",
            name: "Crystal Ice Palace",
            x: 75,
            y: 9,
            note: "Palace of the Water element folk on the highest peak.",
            characters: ["Nilanjona"],
            faction: "Water Guardians",
          },
          {
            id: "wall",
            name: "Great Glacial Wall Falls",
            x: 30,
            y: 7,
            note: "Melting snow feeds every river, lake and sunken basin below.",
          },
          {
            id: "city",
            name: "Ice Capital",
            x: 72,
            y: 29,
            note: "Lantern-lit city on the frozen fjord.",
          },
          {
            id: "castles",
            name: "Long Frost Castles",
            x: 86,
            y: 23,
            note: "Castle walls stretching across the ice ridges.",
          },
          {
            id: "caves",
            name: "Crystal Ice Caves",
            x: 9,
            y: 19,
            note: "Glowing ice-crystal caverns under the mountains.",
          },
          {
            id: "frost-village",
            name: "Snow Villages",
            x: 25,
            y: 37,
            note: "Icy villages far from the city, with reindeer herds.",
          },
          {
            id: "falls",
            name: "Great Cascade",
            x: 52,
            y: 53,
            note: "Where the ice gives way to warm green valleys.",
          },
          {
            id: "chasm",
            name: "Lantern Chasm Stairway",
            x: 84,
            y: 61,
            note: "Lantern-lit stairs linking upper and lower lands.",
          },
          {
            id: "warm-village",
            name: "Warm Villages",
            x: 12,
            y: 70,
            note: "Green fields, forests and plenty of animals.",
          },
          {
            id: "sunken",
            name: "Sunken Temple",
            x: 50,
            y: 85,
            note: "Was on land before the Asetra incident. The great earthquake sank it and raised the mountains. The water folk once lived underwater here; Nila later rediscovered it.",
            characters: ["Nilanjona"],
          },
        ],
      },
    ],
  },
  {
    id: "aethmos",
    name: "Aethmos",
    epithet: "Hidden sanctuary of Nytheries",
    worldX: 20,
    worldY: 42,
    transition: "calm",
    top: {
      image: topAeth,
      width: 1024,
      height: 1792,
      era: "Hidden sanctuary",
      landmarks: [],
      routes: [
        ["elder", "sinkhole"],
        ["sinkhole", "wetland"],
        ["lagoon", "samuel"],
        ["wetland", "village"],
      ],
    },
    eras: [
      {
        id: "present",
        label: "Hidden sanctuary",
        image: aethmos,
        width: 1024,
        height: 1792,
        fx: ["fireflies", "mist", "spores"],
        summary:
          "Vast sacred sanctuary near the Elf Realm, guarded by the Nature Guardian Nytheries. Xinea lives here safely among the animals after Valeria staged her death.",
        routes: [
          ["elder", "sinkhole"],
          ["sinkhole", "lagoon"],
          ["wetland", "gorge"],
          ["gorge", "samuel"],
        ],
        landmarks: [
          {
            id: "elder",
            name: "Elder Tree Council",
            x: 48,
            y: 6,
            note: "Stone circle beneath the eldest tree.",
            characters: ["Nytheries (Madhobi)"],
            faction: "Nature Sanctuary",
          },
          {
            id: "mushroom",
            name: "Glowing Fungal Grove",
            x: 14,
            y: 8,
            note: "Bioluminescent mushroom forest.",
          },
          {
            id: "crater",
            name: "Crater Lake Meadow",
            x: 84,
            y: 12,
            note: "Highland lake in a sunken meadow.",
          },
          {
            id: "ruins",
            name: "Waterfall Ruins",
            x: 15,
            y: 30,
            note: "Ancient arches pouring water into mist.",
          },
          {
            id: "sinkhole",
            name: "Sinkhole Spring",
            x: 50,
            y: 25,
            note: "Light falls into a glowing pool.",
          },
          {
            id: "chasm",
            name: "Vine Chasm",
            x: 82,
            y: 27,
            note: "Root bridges over a green abyss.",
          },
          {
            id: "lagoon",
            name: "Cave Lagoon",
            x: 84,
            y: 46,
            note: "Xinea's hidden refuge guarded behind the barrier.",
            characters: ["Xinea", "Valeria"],
          },
          {
            id: "wetland",
            name: "Mangrove Causeways",
            x: 22,
            y: 50,
            note: "Wooden walkways through the wetland.",
          },
          {
            id: "gorge",
            name: "Sunlit Gorge Bridge",
            x: 62,
            y: 61,
            note: "Edge of the cloaked sanctuary.",
          },
          {
            id: "village",
            name: "Lower Forest Village",
            x: 27,
            y: 79,
            note: "Ordinary forest below the sanctuary.",
          },
          {
            id: "samuel",
            name: "Samuel's Cottage",
            x: 80,
            y: 86,
            note: "Samuel's thatched home in the lower woods.",
            characters: ["Samuel"],
          },
        ],
      },
    ],
  },
  {
    id: "yasnaya",
    name: "Yasnaya",
    epithet: "Contoured coast of the Wind Guardian",
    worldX: 80,
    worldY: 34,
    transition: "growth",
    top: {
      image: topYas,
      width: 1024,
      height: 1792,
      era: "Present",
      landmarks: [],
      routes: [
        ["white-palace", "towers"],
        ["towers", "scar"],
        ["towers", "harbor"],
        ["harbor", "fort"],
      ],
    },
    eras: [
      {
        id: "ancient",
        label: "1,000 years ago",
        image: yAncient,
        width: 1024,
        height: 1792,
        fx: ["wind", "mist"],
        summary:
          "Wild forest, simple shelters and horses. The Wind Guardian lived in nature. No palace yet.",
        routes: [
          ["plateau", "river"],
          ["camp", "horses"],
          ["river", "bay"],
        ],
        landmarks: [
          {
            id: "plateau",
            name: "Wild High Plateau",
            x: 28,
            y: 9,
            note: "The cliff where the White Palace will later stand.",
          },
          {
            id: "camp",
            name: "Nomad Shelters",
            x: 10,
            y: 44,
            note: "Hide shelters and campfires.",
          },
          { id: "horses", name: "Wild Horse Pastures", x: 20, y: 58, note: "Open grassland." },
          {
            id: "river",
            name: "Wind River",
            x: 55,
            y: 45,
            note: "Same river that later runs through the city.",
          },
          {
            id: "east",
            name: "East Forest",
            x: 85,
            y: 47,
            note: "Untouched forest. Much later the Redline vs Obsidian battleground.",
          },
          { id: "bay", name: "Wild Bay", x: 50, y: 66, note: "Future harbor." },
          { id: "isle", name: "Rock Isle", x: 86, y: 76, note: "Future coastal fortress." },
        ],
      },
      {
        id: "palace",
        label: "White Palace era",
        image: yPalace,
        width: 1024,
        height: 1792,
        fx: ["wind"],
        summary:
          "White Palace, green fields, lakes and fountains, and rich settlements. After Ethan defeated the Wind Guardian he gave the palace to the people.",
        routes: [
          ["white-palace", "city"],
          ["city", "east"],
          ["city", "harbor"],
        ],
        landmarks: [
          {
            id: "white-palace",
            name: "White Palace",
            x: 28,
            y: 8,
            note: "Where Ethan fought the Wind Guardian; he later gave it to the people.",
            characters: ["Ethan Thorne", "Wind Guardian"],
          },
          {
            id: "cliff-castle",
            name: "Cliff Castle",
            x: 83,
            y: 24,
            note: "Castle above the falls.",
          },
          { id: "city", name: "Old City", x: 45, y: 33, note: "Stone and marble districts." },
          {
            id: "fountain",
            name: "Fountain Courtyards",
            x: 45,
            y: 40,
            note: "Gardens and fountains.",
          },
          {
            id: "east",
            name: "East District",
            x: 85,
            y: 47,
            note: "Later scarred by the Redline vs Obsidian face-off.",
          },
          { id: "harbor", name: "Harbor", x: 50, y: 66, note: "Sailing ships and piers." },
          {
            id: "fort",
            name: "Coastal Fortress",
            x: 86,
            y: 76,
            note: "Bastion on the sea cliffs.",
          },
        ],
      },
      {
        id: "present",
        label: "Present",
        image: yPresent,
        width: 1024,
        height: 1792,
        fx: ["embers", "wind"],
        summary:
          "The lower city grows high-rises with green spaces while old castles remain on the cliffs. The Redline vs Obsidian face-off scarred the east district.",
        routes: [
          ["white-palace", "towers"],
          ["towers", "scar"],
          ["towers", "harbor"],
          ["harbor", "fort"],
        ],
        landmarks: [
          {
            id: "white-palace",
            name: "Old White Palace",
            x: 28,
            y: 8,
            note: "Still standing on the high cliff.",
            characters: ["Ethan Thorne"],
          },
          {
            id: "towers",
            name: "New High-rise City",
            x: 45,
            y: 33,
            note: "Modern lower city with parks.",
          },
          {
            id: "scar",
            name: "Redline vs Obsidian Scar",
            x: 85,
            y: 47,
            note: "Battleground of the confrontation.",
            faction: "Redline / Obsidian",
          },
          { id: "harbor", name: "Harbor", x: 50, y: 66, note: "Ports and piers." },
          {
            id: "fort",
            name: "Coastal Fortress",
            x: 86,
            y: 76,
            note: "Bastion on the sea cliffs.",
          },
        ],
      },
    ],
  },
  {
    id: "ruincity",
    name: "Ruin City",
    epithet: "Fallen city by the Demon Realm",
    worldX: 64,
    worldY: 76,
    transition: "war",
    top: {
      image: topRuin,
      width: 1024,
      height: 1792,
      era: "Present ruin",
      landmarks: [
        { id: "temple", name: "Stepped Temple", x: 46, y: 5, note: "North end of the causeway." },
        {
          id: "demon",
          name: "Demon Realm Border",
          x: 88,
          y: 4,
          note: "Where the demons broke in.",
        },
        {
          id: "amph",
          name: "Flooded Amphitheater",
          x: 18,
          y: 17,
          note: "Stagnant water fills the seats.",
        },
        { id: "crater", name: "Crater Outpost", x: 85, y: 21, note: "Blasted ring of stone." },
        { id: "cathedral", name: "Gothic Cathedral Ruin", x: 75, y: 34, note: "Broken spires." },
        { id: "plaza", name: "Drowned Plaza", x: 46, y: 41, note: "Old city centre." },
        { id: "portal", name: "Purple Portal", x: 8, y: 44, note: "Rune-lit ruin." },
        { id: "bridge", name: "Guardian Bridge", x: 40, y: 59, note: "Statues over the ravine." },
        {
          id: "harbor",
          name: "Ruined Harbor",
          x: 35,
          y: 82,
          note: "Sunken boats and broken piers.",
        },
        { id: "cove", name: "Hidden Cove", x: 82, y: 80, note: "Quiet beach." },
      ],
      routes: [
        ["temple", "plaza"],
        ["demon", "cathedral"],
        ["plaza", "bridge"],
        ["bridge", "harbor"],
      ],
    },
    eras: [
      {
        id: "war",
        label: "Diablo War 2nd",
        image: ruinWar,
        width: 1024,
        height: 1792,
        fx: ["embers"],
        summary:
          "A rich, lively city. Demons first broke in from the nearby Demon Realm. Silas, Eldrich, Agnus and Aeric fought them.",
        routes: [
          ["rift", "cathedral"],
          ["temple", "market"],
          ["market", "gate"],
          ["gate", "harbor"],
        ],
        landmarks: [
          {
            id: "rift",
            name: "Demon Rift",
            x: 85,
            y: 10,
            note: "Where the demons came through.",
            characters: ["Silas", "Eldrich", "Agnus", "Aeric"],
          },
          {
            id: "temple",
            name: "Great Temple",
            x: 25,
            y: 9,
            note: "Stepped temple above the city.",
          },
          { id: "cathedral", name: "Cathedral", x: 48, y: 27, note: "Heart of the old city." },
          { id: "market", name: "Grand Market", x: 40, y: 45, note: "Busy plazas and fountains." },
          { id: "gate", name: "Fortified Gate", x: 38, y: 60, note: "Main city gate." },
          { id: "harbor", name: "Harbor", x: 40, y: 80, note: "Trade port." },
        ],
      },
      {
        id: "present",
        label: "Present ruin",
        image: ruinPresent,
        width: 1024,
        height: 1792,
        fx: ["mist", "spores"],
        summary:
          "Abandoned and destroyed. Dark jungle, sickly green-yellow foliage, dead trees, stagnant water and roaming animals. No humans.",
        routes: [
          ["rift", "cathedral"],
          ["temple", "market"],
          ["market", "gate"],
          ["gate", "harbor"],
        ],
        landmarks: [
          {
            id: "rift",
            name: "Demon Rift Scar",
            x: 85,
            y: 10,
            note: "Where the demons came through. Now cold and silent.",
          },
          {
            id: "temple",
            name: "Great Temple Ruin",
            x: 25,
            y: 9,
            note: "Same temple, overgrown and cracked.",
          },
          {
            id: "cathedral",
            name: "Cathedral Ruin",
            x: 48,
            y: 27,
            note: "Spires broken, roof fallen in.",
          },
          {
            id: "market",
            name: "Dead Market",
            x: 40,
            y: 45,
            note: "Plazas swallowed by weeds and stagnant water.",
          },
          { id: "gate", name: "Broken Gate", x: 38, y: 60, note: "Main gate, collapsed." },
          {
            id: "harbor",
            name: "Wrecked Harbor",
            x: 40,
            y: 80,
            note: "Sunken ships and rotting piers. Only animals now.",
          },
        ],
      },
    ],
  },
  {
    id: "pocket-dimension",
    name: "Pocket Dimension",
    epithet: "A fracture outside time",
    worldX: 84,
    worldY: 12,
    transition: "calm",
    top: {
      image: topPocket,
      width: 1024,
      height: 1536,
      era: "Timeless",
      landmarks: [
        {
          id: "gate",
          name: "Ring Gateway",
          x: 78,
          y: 20,
          note: "The cosmic rift portal used by Aeric Valenheart and Marcello Corvani to return in 2025.",
          characters: ["Aeric Valenheart", "Marcello Corvani"],
        },
        {
          id: "forge",
          name: "Aeric's Forge",
          x: 50,
          y: 43,
          note: "Obsidian crucible where Aeric Valenheart forged the cursed blade Kara Yazgi.",
          characters: ["Aeric Valenheart"],
        },
        {
          id: "monoliths",
          name: "Void Monoliths",
          x: 16,
          y: 52,
          note: "Suspended obsidian pillars vibrating along crimson rift veins.",
          characters: ["Alt David", "Marcello Corvani"],
        },
        {
          id: "shards",
          name: "Shattered Platforms",
          x: 25,
          y: 81,
          note: "Broken islands where Zaan confronted Khalid over Hisham's death.",
          characters: ["Zaan", "Khalid"],
        },
      ],
      routes: [
        ["gate", "forge"],
        ["forge", "monoliths"],
        ["forge", "shards"],
      ],
    },
    eras: [
      {
        id: "timeless",
        label: "Timeless",
        image: pocket,
        width: 1536,
        height: 1024,
        fx: ["rift", "embers", "mist"],
        summary:
          "A slow-time fracture outside ordinary space and time. Aeric Valenheart fell here in 1354 AD and forged Kara Yazgi; Marcello Corvani arrived in 2005, lost an eye to Alt David, and Zaan fought Khalid among its floating obsidian shards before Aeric and Corvani escaped in 2025.",
        routes: [
          ["vortex", "forge"],
          ["forge", "gate"],
          ["forge", "shards"],
          ["monoliths", "forge"],
        ],
        landmarks: [
          {
            id: "forge",
            name: "Aeric's Forge",
            x: 48,
            y: 45,
            note: "Where Aeric Valenheart forged Kara Yazgi and survived centuries using sigils and glimmer-sense.",
            characters: ["Aeric Valenheart"],
          },
          {
            id: "gate",
            name: "Gateway Arch",
            x: 69,
            y: 38,
            note: "Swirling rift portal between worlds; escaped by Corvani and Aeric in 2025.",
            characters: ["Aeric Valenheart", "Marcello Corvani"],
          },
          {
            id: "vortex",
            name: "Time-Slip Vortex",
            x: 34,
            y: 17,
            note: "Gravitational spiral where time runs far slower than Earth Prime.",
          },
          {
            id: "monoliths",
            name: "Void Monoliths",
            x: 14,
            y: 20,
            note: "Floating crimson-veined monoliths near where Alt David took Corvani's eye.",
            characters: ["Alt David", "Marcello Corvani"],
          },
          {
            id: "shards",
            name: "Shattered Platforms",
            x: 50,
            y: 74,
            note: "Cracked magma-and-aether obsidian bridge where Zaan fought Khalid.",
            characters: ["Zaan", "Khalid"],
          },
        ],
      },
    ],
  },
  {
    id: "istanbul-1417",
    name: "Istanbul",
    epithet: "Ottoman 1417 Architect hunt to modern Bosphorus",
    worldX: 54,
    worldY: 48,
    transition: "growth",
    top: {
      image: topIstanbul,
      width: 1024,
      height: 1536,
      era: "1417",
      landmarks: [
        { id: "mosque", name: "Great Domed Mosque", x: 68, y: 44, note: "Heart of the old city." },
        { id: "bazaar", name: "Grand Bazaar", x: 34, y: 50, note: "Covered market streets." },
        {
          id: "harbor",
          name: "Golden Horn Harbor",
          x: 48,
          y: 26,
          note: "Galleys and trade ships.",
        },
        {
          id: "walls",
          name: "Land Walls",
          x: 16,
          y: 58,
          note: "Great defensive walls; outside stood the Forgotten Ones outcast camp.",
          characters: ["Dirham", "Abbas", "Zaan"],
        },
        { id: "tower", name: "Harbor Tower", x: 82, y: 86, note: "Watches the strait." },
      ],
      routes: [
        ["walls", "bazaar"],
        ["bazaar", "mosque"],
        ["mosque", "harbor"],
        ["harbor", "tower"],
      ],
    },
    eras: [
      {
        id: "1417",
        label: "1417 (Ottoman)",
        image: istanbul,
        width: 1536,
        height: 1024,
        fx: ["lanterns", "mist"],
        summary:
          "Ottoman Istanbul in 1417, where Francisco (Nasab ibn Khalil) and Ramiz searched for the Architect Cube. Outside the walls lay the Forgotten Ones camp led by Dirham and Abbas—inspiring Zaan's Hidden Ones—and years later Khalid desecrated Issabela's grave here.",
        routes: [
          ["bazaar", "walls"],
          ["walls", "mosque"],
          ["walls", "harbor"],
          ["harbor", "ruins"],
        ],
        landmarks: [
          {
            id: "mosque",
            name: "Great Domed Mosque",
            x: 17,
            y: 18,
            note: "Domes and minarets overlooking the Golden Horn.",
          },
          {
            id: "walls",
            name: "Land & Sea Walls",
            x: 40,
            y: 42,
            note: "Stone fortifications; beyond them sheltered the Forgotten Ones outcast camp.",
            characters: ["Dirham", "Abbas", "Zaan"],
            faction: "Forgotten Ones",
          },
          {
            id: "harbor",
            name: "Golden Horn Harbor",
            x: 56,
            y: 55,
            note: "Ottoman galleys and the sea route Ayesha and Khalid later fled toward Rome.",
            characters: ["Ramiz", "Ayesha", "Khalid"],
          },
          {
            id: "bazaar",
            name: "Bazaar Quarter",
            x: 14,
            y: 74,
            note: "Where Francisco (Nasab) and Ramiz hunted fragments of the Architect Cube in 1417.",
            characters: ["Francisco (Nasab)", "Ramiz"],
            faction: "Nullborn",
          },
          {
            id: "ruins",
            name: "Old Columns & Graveyard",
            x: 88,
            y: 74,
            note: "Coastal ruins near where Khalid later found Issabela's grave and struck down Piedro.",
            characters: ["Issabela", "Piedro", "Khalid"],
          },
        ],
      },
      {
        id: "present",
        label: "Present",
        image: istanbulPresent,
        width: 1264,
        height: 848,
        fx: ["wind", "mist", "lanterns"],
        summary:
          "Present-day Istanbul spanning Europe and Asia across the Bosphorus. Historic domes and Ottoman seawalls stand below Levent's modern towers, while Hidden Ones vaults and Sentinel safehouses remain anchored beneath the old peninsula and alleyways where Norman once confronted Khalid.",
        routes: [
          ["peninsula", "suleymaniye"],
          ["suleymaniye", "levent"],
          ["peninsula", "seawalls"],
          ["bosphorus", "bridge"],
        ],
        landmarks: [
          {
            id: "peninsula",
            name: "Historic Peninsula & Cistern",
            x: 36,
            y: 66,
            note: "Hagia Sophia & Sultanahmet ridges concealing ancient Hidden Ones cistern relays.",
            faction: "Hidden Ones",
          },
          {
            id: "suleymaniye",
            name: "Golden Horn & Galata Ridge",
            x: 31,
            y: 36,
            note: "Modern ferries passing the medieval tower and dark back-alleys where Norman fought Khalid.",
            characters: ["Norman", "Khalid"],
          },
          {
            id: "levent",
            name: "Levent Modern Skyline",
            x: 31,
            y: 14,
            note: "High-rise financial corridor monitored by modern Sentinel & Redline intel.",
            faction: "Redline / ECAP",
          },
          {
            id: "bridge",
            name: "Bosphorus Bridge",
            x: 68,
            y: 24,
            note: "Strait crossing linking Europe and Asia above historic naval waters.",
          },
          {
            id: "seawalls",
            name: "Preserved Sea Walls",
            x: 61,
            y: 76,
            note: "Restored 15th-century bastions above the Marmara coast.",
          },
          {
            id: "bosphorus",
            name: "Bosphorus Strait Shipping",
            x: 74,
            y: 50,
            note: "Busy present-day maritime corridor.",
          },
        ],
      },
    ],
  },
  {
    id: "rome",
    name: "Rome",
    epithet: "15th-century Nullborn catacombs to the Eternal City",
    worldX: 28,
    worldY: 60,
    transition: "growth",
    top: {
      image: romeTop,
      width: 1264,
      height: 848,
      era: "Catacombs & City",
      landmarks: [
        {
          id: "vatican",
          name: "Vatican Citadel & Basilica",
          x: 19,
          y: 27,
          note: "Walled hill overlooking the Tiber bends; focal point of Borgia intrigue.",
          faction: "Borgia / Vatican",
        },
        {
          id: "angelo",
          name: "Castel Sant'Angelo",
          x: 39,
          y: 27,
          note: "Circular fortress guarding the stone bridge crossing.",
        },
        {
          id: "tiber",
          name: "Tiber River Corridor",
          x: 38,
          y: 55,
          note: "Waterway linking arriving refugees from Istanbul to Rome's lower quarters.",
          characters: ["Ayesha", "Khalid"],
        },
        {
          id: "colosseum",
          name: "Colosseum Arena",
          x: 87,
          y: 58,
          note: "Ancient amphitheater marking the eastern Sentinel & relic perimeter.",
        },
        {
          id: "catacombs",
          name: "Subterranean Nullborn Catacombs",
          x: 56,
          y: 76,
          note: "Secret underground labyrinth where Nullborn trained Khalid before the Borgia raid.",
          characters: ["Issabela", "Marco", "Mehnaz", "Abdul"],
          faction: "Nullborn",
        },
      ],
      routes: [
        ["vatican", "angelo"],
        ["angelo", "tiber"],
        ["tiber", "catacombs"],
        ["catacombs", "colosseum"],
      ],
    },
    eras: [
      {
        id: "15th-century",
        label: "15th Century",
        image: rome15th,
        width: 1264,
        height: 848,
        fx: ["embers", "mist", "lanterns"],
        summary:
          "15th-century Papal Rome. After escaping Istanbul and losing Ramij on the shore, Ayesha and Khalid reached the secret Nullborn compound beneath Rome's catacombs—training beside Issabela, Marco, Mehnaz, and Abdul until Cesare Borgia's forces shattered the cell and Madhobi guided survivors to the Hidden Ones.",
        routes: [
          ["tiber", "angelo"],
          ["angelo", "vatican"],
          ["tiber", "catacombs"],
          ["catacombs", "colosseum"],
        ],
        landmarks: [
          {
            id: "vatican",
            name: "Papal Citadel",
            x: 24,
            y: 22,
            note: "Fortified Vatican walls twisted by Cesare Borgia's infiltration of the Nullborn.",
            faction: "Borgia",
          },
          {
            id: "angelo",
            name: "Castel Sant'Angelo",
            x: 13,
            y: 36,
            note: "River bastion guarding the main stone bridge.",
          },
          {
            id: "tiber",
            name: "Tiber Crossing",
            x: 31,
            y: 47,
            note: "Bridge entry taken after the Mediterranean flight from Ottoman lands.",
            characters: ["Ramij", "Khalid", "Ayesha"],
          },
          {
            id: "colosseum",
            name: "Colosseum Ruins",
            x: 78,
            y: 43,
            note: "Ancient stone amphitheater shading cathedral seal passages.",
            characters: ["Anna la Sarta"],
          },
          {
            id: "catacombs",
            name: "Nullborn Catacomb Compound",
            x: 56,
            y: 82,
            note: "Lantern-lit subterranean vaults where Khalid awakened in chains and trained with Issabela and Anthony.",
            characters: ["Issabela", "Anthony", "Marco", "Mehnaz"],
            faction: "Nullborn",
          },
        ],
      },
      {
        id: "present",
        label: "Present",
        image: romePresent,
        width: 1264,
        height: 848,
        fx: ["mist", "wind"],
        summary:
          "Modern Rome in the present era. Sunlit avenues, tramways, and historic piazzas surround St. Peter's dome and the Colosseum, while the ancient Nullborn seal chambers far below remain locked under modern Sentinel and archivist watch.",
        routes: [
          ["st-peters", "angelo-present"],
          ["angelo-present", "tiber-boulevard"],
          ["tiber-boulevard", "colosseum-present"],
          ["piazza-metro", "tiber-boulevard"],
        ],
        landmarks: [
          {
            id: "st-peters",
            name: "St. Peter's & Sealed Archives",
            x: 36,
            y: 20,
            note: "Historic dome and deep archival vaults containing 15th-century Nullborn records.",
            faction: "Archivists",
          },
          {
            id: "angelo-present",
            name: "Castel Sant'Angelo Monument",
            x: 22,
            y: 37,
            note: "Restored fortress monument standing over sealed medieval tunnels.",
          },
          {
            id: "tiber-boulevard",
            name: "Modern Tiber Embankment",
            x: 42,
            y: 58,
            note: "Present-day avenues and river piers above the old smuggling landings.",
          },
          {
            id: "colosseum-present",
            name: "Illuminated Colosseum",
            x: 74,
            y: 44,
            note: "Modern Roman landmark anchoring underground Sentinel sensors.",
            faction: "Sentinels",
          },
          {
            id: "piazza-metro",
            name: "Piazza Trams & Deep Vaults",
            x: 26,
            y: 78,
            note: "Modern tram square directly above the sealed 15th-century Nullborn catacomb shafts.",
            faction: "Nullborn",
          },
        ],
      },
    ],
  },
  {
    id: "romania-15th",
    name: "Romania",
    epithet: "15th-century Carpathian frontier & citadels",
    worldX: 34,
    worldY: 28,
    transition: "calm",
    top: {
      image: romaniaTop,
      width: 1264,
      height: 848,
      era: "15th Century",
      landmarks: [
        {
          id: "citadel",
          name: "Carpathian Cliff Citadel",
          x: 28,
          y: 24,
          note: "Stone cliff fortress commanding the northern mountain pass above the river gorge.",
          faction: "Carpathian Keep",
        },
        {
          id: "pass",
          name: "High Carpathian Pass",
          x: 44,
          y: 18,
          note: "Snow-dusted ridge route linking Transylvania and Wallachia.",
        },
        {
          id: "town",
          name: "Walled Valley Town",
          x: 58,
          y: 56,
          note: "Fortified Wallachian river town with guild halls and bell towers.",
        },
        {
          id: "abbey",
          name: "Misty Forest Monastery",
          x: 82,
          y: 34,
          note: "Remote woodland sanctuary preserving ancient bloodline and Hidden Ones scrolls.",
          faction: "Hidden Ones",
        },
        {
          id: "danube",
          name: "Danube Frontier Watchtowers",
          x: 75,
          y: 84,
          note: "Southern river outposts watching routes toward 15th-century Ottoman Istanbul.",
        },
      ],
      routes: [
        ["pass", "citadel"],
        ["citadel", "town"],
        ["town", "abbey"],
        ["town", "danube"],
      ],
    },
    eras: [
      {
        id: "15th-century",
        label: "15th Century",
        image: romania15th,
        width: 1264,
        height: 848,
        fx: ["ash", "mist", "embers"],
        summary:
          "15th-century Romania across Wallachia and Transylvania. Beneath crimson Carpathian twilight, torch-lit mountain passes, cliffside stone citadels, fortified valley towns, and forest abbeys stand as the shadowed European frontier linked to Ottoman Istanbul and ancient bloodline lore.",
        routes: [
          ["citadel", "town"],
          ["town", "pass"],
          ["pass", "abbey"],
          ["citadel", "peaks"],
        ],
        landmarks: [
          {
            id: "citadel",
            name: "Carpathian Cliff Citadel",
            x: 20,
            y: 29,
            note: "Fortified crag castle watching the dark pine valley below.",
            faction: "Frontier Garrison",
          },
          {
            id: "peaks",
            name: "Jagged Carpathian Peaks",
            x: 49,
            y: 26,
            note: "High storm-lit peaks concealing secret border trails.",
          },
          {
            id: "pass",
            name: "Torch-Lit Mountain Pass",
            x: 72,
            y: 50,
            note: "Midnight convoy route connecting Carpathian keeps toward Danube crossings.",
          },
          {
            id: "town",
            name: "Fortified Valley Town",
            x: 54,
            y: 69,
            note: "Walled Wallachian settlement with steep spires and river bridge gates.",
          },
          {
            id: "abbey",
            name: "Woodland Monastery",
            x: 82,
            y: 59,
            note: "Quiet stone abbey sheltering pilgrims, bloodline records, and night couriers.",
            faction: "Hidden Ones",
          },
        ],
      },
    ],
  },
];

// Top views for these realms are drawn straight down from their latest painted era, so pins share its positions.
for (const loc of ATLAS)
  if (loc.top && ["nilanjona", "aethmos", "yasnaya"].includes(loc.id))
    loc.top.landmarks = loc.eras[loc.eras.length - 1]!.landmarks;
