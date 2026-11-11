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

/** Browser-safe atlas data for the Nexus full-screen maps. Coordinates are % of the map image. */
export type AtlasFx = "snow" | "fireflies" | "mist" | "embers" | "wind" | "spores";
export type AtlasLandmark = { id: string; name: string; x: number; y: number; note: string };
export type AtlasEra = { id: string; label: string; image: string; summary: string; fx: AtlasFx[]; landmarks: AtlasLandmark[] };
export type AtlasTop = { image: string; era: string; landmarks: AtlasLandmark[] };
/** transition: how the frame-by-frame simulation moves between eras. */
export type AtlasLocation = { id: string; name: string; epithet: string; worldX: number; worldY: number; transition: "quake" | "war" | "growth" | "calm"; top: AtlasTop; eras: AtlasEra[] };

export const WORLD_MAP = world;
export const WORLD_TOP = worldTop;

export const ATLAS: AtlasLocation[] = [
  { id: "nilanjona", name: "Nilanjona's Realm", epithet: "The water kingdom called a village", worldX: 52, worldY: 10, transition: "quake",
    top: { image: topNila, era: "Present", landmarks: [
      { id: "palace", name: "Crystal Ice Palace", x: 74, y: 7, note: "Palace of the Water element folk." },
      { id: "castles", name: "Long Frost Castles", x: 30, y: 13, note: "Castle walls across the ice ridges." },
      { id: "glacier", name: "Great Glacier", x: 60, y: 27, note: "Feeds the rivers and lakes below." },
      { id: "falls", name: "Great Cascade Basin", x: 22, y: 52, note: "Where ice gives way to warm valleys." },
      { id: "fort", name: "Hill Fortress", x: 80, y: 58, note: "Watches over the green lands." },
      { id: "warm-village", name: "Warm Villages", x: 18, y: 70, note: "Fields, forests and animals." },
      { id: "sunken", name: "Sunken Temple", x: 74, y: 72, note: "Ruins visible under the lake. Above ground before the Asetra earthquake." },
    ] },
    eras: [
    { id: "pre-asetra", label: "Before Asetra", image: nilaPre, fx: ["mist"],
      summary: "Before the Asetra incident and the great earthquake. No giant ice mountains yet — the temples, aqueducts and homes now under the lake stood on dry land, and the water folk lived both on land and in the water.",
      landmarks: [
        { id: "capital", name: "Old Domed Capital", x: 63, y: 20, note: "Later sank and became the Sunken Temple." },
        { id: "well", name: "Great Water Amphitheater", x: 61, y: 44, note: "Later became the Abyssal Sunken Well Nila found." },
        { id: "aqueduct", name: "Grand Aqueduct", x: 62, y: 57, note: "Partly destroyed by the quake shock." },
        { id: "gardens", name: "Terrace Gardens", x: 28, y: 32, note: "Later became the Sunken Garden Terraces." },
        { id: "harbor", name: "River Harbor", x: 88, y: 80, note: "Water folk docks." },
        { id: "hills", name: "Gentle Northern Hills", x: 70, y: 5, note: "Before the earthquake raised the ice mountains." },
      ] },
    { id: "present", label: "Present", image: nilanjona, fx: ["snow", "mist"],
      summary: "Almost as big as a small country. Three-fifths is ice — needle mountains, the crystal palace and long frozen castles — and two-fifths is warm green land, rivers and forests. Villages sit in both and blend into each other.",
      landmarks: [
        { id: "palace", name: "Crystal Ice Palace", x: 75, y: 9, note: "Palace of the Water element folk on the highest peak." },
        { id: "wall", name: "Great Glacial Wall Falls", x: 30, y: 7, note: "Melting snow feeds every river, lake and sunken basin below." },
        { id: "city", name: "Ice Capital", x: 72, y: 29, note: "Lantern-lit city on the frozen fjord." },
        { id: "castles", name: "Long Frost Castles", x: 86, y: 23, note: "Castle walls stretching across the ice ridges." },
        { id: "caves", name: "Crystal Ice Caves", x: 9, y: 19, note: "Glowing ice-crystal caverns under the mountains." },
        { id: "frost-village", name: "Snow Villages", x: 25, y: 37, note: "Icy villages far from the city, with reindeer herds." },
        { id: "falls", name: "Great Cascade", x: 52, y: 53, note: "Where the ice gives way to warm green valleys." },
        { id: "chasm", name: "Lantern Chasm Stairway", x: 84, y: 61, note: "Lantern-lit stairs linking upper and lower lands." },
        { id: "warm-village", name: "Warm Villages", x: 12, y: 70, note: "Green fields, forests and plenty of animals." },
        { id: "sunken", name: "Sunken Temple", x: 50, y: 85, note: "Was on land before the Asetra incident. The great earthquake sank it and raised the mountains. The water folk once lived underwater here; Nila later rediscovered it." },
      ] },
  ] },
  { id: "aethmos", name: "Aethmos", epithet: "Hidden sanctuary of Nytheries", worldX: 22, worldY: 40, transition: "calm",
    top: { image: topAeth, era: "Hidden sanctuary", landmarks: [
      { id: "elder", name: "Elder Tree Council", x: 62, y: 15, note: "Stone circle beneath the eldest tree." },
      { id: "crater", name: "Crater Lake", x: 25, y: 12, note: "Highland lake in a sunken meadow." },
      { id: "sinkhole", name: "Sinkhole", x: 19, y: 28, note: "Light falls into the deep." },
      { id: "chasm", name: "Vine Chasm", x: 80, y: 36, note: "A green abyss." },
      { id: "wetland", name: "Mangrove Waters", x: 58, y: 44, note: "Wooden walkways through the wetland." },
      { id: "falls", name: "Sanctuary Falls", x: 54, y: 58, note: "Plateau edge falling into mist." },
      { id: "bridge", name: "Root Bridge", x: 52, y: 71, note: "Way down to the lower forest." },
      { id: "village", name: "Lower Forest Village", x: 36, y: 83, note: "Ordinary forest below." },
      { id: "samuel", name: "Samuel's Cottage", x: 82, y: 80, note: "Samuel's thatched home." },
    ] },
    eras: [
    { id: "present", label: "Hidden sanctuary", image: aethmos, fx: ["fireflies", "mist", "spores"],
      summary: "Vast sacred sanctuary near the Elf Realm, guarded by the Nature Guardian Nytheries. Xinea lives here safely among the animals after Valeria staged her death.",
      landmarks: [
        { id: "elder", name: "Elder Tree Council", x: 48, y: 6, note: "Stone circle beneath the eldest tree." },
        { id: "mushroom", name: "Glowing Fungal Grove", x: 14, y: 8, note: "Bioluminescent mushroom forest." },
        { id: "crater", name: "Crater Lake Meadow", x: 84, y: 12, note: "Highland lake in a sunken meadow." },
        { id: "ruins", name: "Waterfall Ruins", x: 15, y: 30, note: "Ancient arches pouring water into mist." },
        { id: "sinkhole", name: "Sinkhole Spring", x: 50, y: 25, note: "Light falls into a glowing pool." },
        { id: "chasm", name: "Vine Chasm", x: 82, y: 27, note: "Root bridges over a green abyss." },
        { id: "lagoon", name: "Cave Lagoon", x: 84, y: 46, note: "Xinea's hidden refuge." },
        { id: "wetland", name: "Mangrove Causeways", x: 22, y: 50, note: "Wooden walkways through the wetland." },
        { id: "gorge", name: "Sunlit Gorge Bridge", x: 62, y: 61, note: "Edge of the sanctuary." },
        { id: "village", name: "Lower Forest Village", x: 27, y: 79, note: "Ordinary forest below the sanctuary." },
        { id: "samuel", name: "Samuel's Cottage", x: 80, y: 86, note: "Samuel's thatched home in the lower woods." },
      ] },
  ] },
  { id: "yasnaya", name: "Yasnaya", epithet: "Contoured coast of the Wind Guardian", worldX: 82, worldY: 33, transition: "growth",
    top: { image: topYas, era: "Present", landmarks: [
      { id: "white-palace", name: "White Palace", x: 50, y: 8, note: "Where Ethan fought the Wind Guardian." },
      { id: "terrace", name: "Terraced Hill Castle", x: 15, y: 17, note: "Castle above the terraces." },
      { id: "rotunda", name: "Lake Rotunda", x: 52, y: 26, note: "Domed rotunda on an island." },
      { id: "cliff-city", name: "White Cliff City", x: 14, y: 36, note: "City on the sea cliffs." },
      { id: "scar", name: "Redline vs Obsidian Scar", x: 85, y: 31, note: "Battleground of the confrontation." },
      { id: "towers", name: "New Lower City", x: 62, y: 62, note: "Modern city with parks." },
      { id: "harbor", name: "Harbor", x: 45, y: 76, note: "Ports and piers." },
      { id: "fort", name: "Island Fortress", x: 52, y: 88, note: "Fort guarding the coast." },
    ] },
    eras: [
    { id: "ancient", label: "1,000 years ago", image: yAncient, fx: ["wind", "mist"],
      summary: "Wild forest, simple shelters and horses. The Wind Guardian lived in nature. No palace yet.",
      landmarks: [
        { id: "arch", name: "Mirror Lake Arch", x: 45, y: 17, note: "Natural stone arch over still water." },
        { id: "camp", name: "Nomad Shelters", x: 75, y: 34, note: "Hide shelters and campfires." },
        { id: "horses", name: "Wild Horse Pastures", x: 50, y: 35, note: "Open grassland." },
        { id: "falls", name: "Cliff Falls", x: 14, y: 40, note: "Water spilling off the highlands." },
        { id: "sea-arch", name: "Sea Arch", x: 82, y: 74, note: "Rock arch on the wild coast." },
      ] },
    { id: "palace", label: "White Palace era", image: yPalace, fx: ["wind"],
      summary: "White Palace, green fields, lakes and fountains, and rich settlements. After Ethan defeated the Wind Guardian he gave the palace to the people.",
      landmarks: [
        { id: "white-palace", name: "White Palace", x: 42, y: 7, note: "Where Ethan fought the Wind Guardian and became the one." },
        { id: "fountain", name: "Fountain Courtyards", x: 42, y: 16, note: "Tiered basins above the cascades." },
        { id: "sky", name: "Sky Isles & Windmills", x: 82, y: 9, note: "Floating islands with the great tree." },
        { id: "viaduct", name: "Spiral Viaducts", x: 58, y: 25, note: "Arched roads down the cliffs." },
        { id: "cliff-city", name: "White Cliff City", x: 84, y: 40, note: "Waterways and bridges on the cliffs." },
        { id: "rotunda", name: "Lake Rotunda", x: 34, y: 45, note: "Domed gazebo on a lake island." },
        { id: "bastion", name: "Island Bastion", x: 54, y: 65, note: "Fort in the turquoise lagoon." },
        { id: "sea-gate", name: "Sea Gate", x: 52, y: 83, note: "Ceremonial arch on the ocean." },
      ] },
    { id: "present", label: "Present", image: yPresent, fx: ["embers", "wind"],
      summary: "The lower city grows high-rises with green spaces while old castles remain on the cliffs. The Redline vs Obsidian face-off scarred the east district.",
      landmarks: [
        { id: "white-palace", name: "Old White Palace", x: 28, y: 8, note: "Still standing on the high cliff." },
        { id: "towers", name: "New High-rise City", x: 45, y: 33, note: "Modern lower city with parks." },
        { id: "scar", name: "Redline vs Obsidian Scar", x: 85, y: 47, note: "Battleground of the confrontation." },
        { id: "harbor", name: "Harbor", x: 50, y: 66, note: "Ports and piers." },
        { id: "fort", name: "Coastal Fortress", x: 86, y: 76, note: "Bastion on the sea cliffs." },
      ] },
  ] },
  { id: "ruincity", name: "Ruin City", epithet: "Fallen city by the Demon Realm", worldX: 58, worldY: 72, transition: "war",
    top: { image: topRuin, era: "Present ruin", landmarks: [
      { id: "temple", name: "Stepped Temple", x: 46, y: 5, note: "North end of the causeway." },
      { id: "demon", name: "Demon Realm Border", x: 88, y: 4, note: "Where the demons broke in." },
      { id: "amph", name: "Flooded Amphitheater", x: 18, y: 17, note: "Stagnant water fills the seats." },
      { id: "crater", name: "Crater Outpost", x: 85, y: 21, note: "Blasted ring of stone." },
      { id: "cathedral", name: "Gothic Cathedral Ruin", x: 75, y: 34, note: "Broken spires." },
      { id: "plaza", name: "Drowned Plaza", x: 46, y: 41, note: "Old city centre." },
      { id: "portal", name: "Purple Portal", x: 8, y: 44, note: "Rune-lit ruin." },
      { id: "bridge", name: "Guardian Bridge", x: 40, y: 59, note: "Statues over the ravine." },
      { id: "harbor", name: "Ruined Harbor", x: 35, y: 82, note: "Sunken boats and broken piers." },
      { id: "cove", name: "Hidden Cove", x: 82, y: 80, note: "Quiet beach." },
    ] },
    eras: [
    { id: "war", label: "Diablo War 2nd", image: ruinWar, fx: ["embers"],
      summary: "A rich, lively city. Demons first broke in from the nearby Demon Realm. Silas, Eldrich, Agnus and Aeric fought them.",
      landmarks: [
        { id: "rift", name: "Demon Rift", x: 85, y: 10, note: "Where the demons came through." },
        { id: "temple", name: "Great Temple", x: 25, y: 9, note: "Stepped temple above the city." },
        { id: "cathedral", name: "Cathedral", x: 48, y: 27, note: "Heart of the old city." },
        { id: "market", name: "Grand Market", x: 40, y: 45, note: "Busy plazas and fountains." },
        { id: "gate", name: "Fortified Gate", x: 38, y: 60, note: "Main city gate." },
        { id: "harbor", name: "Harbor", x: 40, y: 80, note: "Trade port." },
      ] },
    { id: "present", label: "Present ruin", image: ruinPresent, fx: ["mist", "spores"],
      summary: "Abandoned and destroyed. Dark jungle, sickly green-yellow foliage, dead trees, stagnant water and roaming animals. No humans.",
      landmarks: [
        { id: "temple", name: "Stepped Temple", x: 50, y: 5, note: "Overgrown temple and causeway." },
        { id: "cathedral", name: "Gothic Cathedral Ruin", x: 82, y: 12, note: "Broken spires in the jungle." },
        { id: "crater", name: "Crater Outpost", x: 18, y: 8, note: "Blasted ring of stone." },
        { id: "amph", name: "Flooded Amphitheater", x: 18, y: 30, note: "Stagnant water fills the seats." },
        { id: "stairs", name: "Monumental Stairs", x: 50, y: 36, note: "Guarded by stone sentinels." },
        { id: "portal", name: "Purple Portal Arch", x: 15, y: 50, note: "Rune-lit archway." },
        { id: "bridge", name: "Guardian Bridge", x: 58, y: 58, note: "Statues over the ravine." },
        { id: "coast", name: "Coastal Ruins", x: 45, y: 78, note: "Tower and cove." },
      ] },
  ] },
];
