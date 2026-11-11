// Arsenal artwork: re-rendered from the user's reference designs on custom backgrounds.
import r_aetherInfused from "@/assets/arsenal-r/aether-infused.jpg";
import r_aetherPure from "@/assets/arsenal-r/aether-pure.jpg";
import r_aetherShotgun from "@/assets/arsenal-r/aether-shotgun.jpg";
import r_bookCelestial from "@/assets/arsenal-r/book-celestial.jpg";
import r_bookClover from "@/assets/arsenal-r/book-clover.jpg";
import r_bookDark from "@/assets/arsenal-r/book-dark.jpg";
import r_combatChip from "@/assets/arsenal-r/combat-chip.jpg";
import r_corvani from "@/assets/arsenal-r/corvani.jpg";
import r_cube from "@/assets/arsenal-r/cube.jpg";
import r_daggerDavid from "@/assets/arsenal-r/dagger-david.jpg";
import r_daggerWolf from "@/assets/arsenal-r/dagger-wolf.jpg";
import r_dragonEggs from "@/assets/arsenal-r/dragon-eggs.jpg";
import r_drone from "@/assets/arsenal-r/drone.jpg";
import r_elizah from "@/assets/arsenal-r/elizah.jpg";
import r_firstSuit from "@/assets/arsenal-r/first-suit.jpg";
import r_gauntlet from "@/assets/arsenal-r/gauntlet.jpg";
import r_ichor from "@/assets/arsenal-r/ichor.jpg";
import r_karaCrimson from "@/assets/arsenal-r/kara-crimson.jpg";
import r_karaValeria from "@/assets/arsenal-r/kara-valeria.jpg";
import r_khalidBlade from "@/assets/arsenal-r/khalid-blade.jpg";
import r_lightBow from "@/assets/arsenal-r/light-bow.jpg";
import r_mask from "@/assets/arsenal-r/mask.jpg";
import r_nanoSuit from "@/assets/arsenal-r/nano-suit.jpg";
import r_pistols from "@/assets/arsenal-r/pistols.jpg";
import r_probes from "@/assets/arsenal-r/probes.jpg";
import r_revolver from "@/assets/arsenal-r/revolver.jpg";
import r_rowanChain from "@/assets/arsenal-r/rowan-chain.jpg";
import r_rowanGreatsword from "@/assets/arsenal-r/rowan-greatsword.jpg";
import r_samuelTie from "@/assets/arsenal-r/samuel-tie.jpg";
import r_sayaRifle from "@/assets/arsenal-r/saya-rifle.jpg";
import r_shadowKunai from "@/assets/arsenal-r/shadow-kunai.jpg";
import r_valeriaKatana from "@/assets/arsenal-r/valeria-katana.jpg";
import r_wolf from "@/assets/arsenal-r/wolf.jpg";
import r_yoshikoArsenal from "@/assets/arsenal-r/yoshiko-arsenal.jpg";
import r_zaynSword from "@/assets/arsenal-r/zayn-sword.jpg";
import daggerAltdavid from "@/assets/arsenal/dagger-altdavid.jpg.asset.json";

export const ART = {
  "aether-infused": r_aetherInfused,
  "aether-pure": r_aetherPure,
  "aether-shotgun": r_aetherShotgun,
  "book-celestial": r_bookCelestial,
  "book-clover": r_bookClover,
  "book-dark": r_bookDark,
  "combat-chip": r_combatChip,
  "corvani": r_corvani,
  "cube": r_cube,
  "dagger-david": r_daggerDavid,
  "dagger-wolf": r_daggerWolf,
  "dragon-eggs": r_dragonEggs,
  "drone": r_drone,
  "elizah": r_elizah,
  "first-suit": r_firstSuit,
  "gauntlet": r_gauntlet,
  "ichor": r_ichor,
  "kara-crimson": r_karaCrimson,
  "kara-valeria": r_karaValeria,
  "khalid-blade": r_khalidBlade,
  "light-bow": r_lightBow,
  "mask": r_mask,
  "nano-suit": r_nanoSuit,
  "pistols": r_pistols,
  "probes": r_probes,
  "revolver": r_revolver,
  "rowan-chain": r_rowanChain,
  "rowan-greatsword": r_rowanGreatsword,
  "samuel-tie": r_samuelTie,
  "saya-rifle": r_sayaRifle,
  "shadow-kunai": r_shadowKunai,
  "valeria-katana": r_valeriaKatana,
  "wolf": r_wolf,
  "yoshiko-arsenal": r_yoshikoArsenal,
  "zayn-sword": r_zaynSword,
  "dagger-altdavid": daggerAltdavid.url,
} as const;
export type ArtKey = keyof typeof ART;
