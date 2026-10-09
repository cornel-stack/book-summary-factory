/**
 * Brand layer (Phase 13) — the ONLY place brand identity lives.
 *
 * The production system is SHARED across brands: the cast, wardrobe,
 * SCENE_PALETTE, stages, the drawing hand, fonts, layout. This file controls
 * only the brand-identity surface: paper tint, accent inks, highlight/marker,
 * caption treatment, chips, end-card chrome, and the CTA copy.
 *
 * `flame` in the shared system (remotion/src/theme.ts) is substituted by each
 * brand's `accent` wherever it appears. ReadLark's Dawn Coral is a near-match
 * to the legacy flame, so existing long-form scenes read essentially unchanged.
 *
 * Flipping `prelaunch` here changes every CTA across every output in one place.
 */

export type BrandId = "readlark" | "percuriam";

export interface CaptionTreatment {
  /** Wash color painted behind the current spoken word in burned-in captions. */
  wash: string;
  /** Wash opacity (0–1). */
  washOpacity: number;
  /** Tick drawn at the caption line's left edge (the app's sentence-sync motif). */
  tick: string;
}

export interface Chip {
  bg: string;
  text: string;
}

export interface Brand {
  id: BrandId;
  name: string;
  wordmark: string;
  domain: string;
  prelaunch: boolean;

  /** Long-form runtime policy (per-brand; read by the build_manifest guard). */
  min_minutes: number;
  default_target_minutes: number;

  // --- palette (substitutes into the shared system) ---
  /** Scene background tint (replaces the shared paper for this brand). */
  paper: string;
  /** On-paper accent: titles' emphasis, underlines, circles, number badges, chart focal. */
  accent: string;
  /** Accent ON characters (ink bodies). Where a deep accent would vanish on ink. */
  accentOnInk: string;
  /** Accent carrying WHITE text (e.g. an end-card CTA chip) — dark enough for contrast. */
  accentInk: string;
  /** Marker swipes / chart accent highlight. */
  highlight: string;
  /** Ground lines / card rules in this brand's scenes (optional; defaults to shared ink-soft). */
  divider?: string;

  // --- burned-in caption treatment (shorts) ---
  caption: CaptionTreatment;

  // --- chrome / end-card ---
  chrome: {
    bg: string;
    text: string;
    /** CTA chip on the end-card. */
    chip: Chip;
  };
  /** Takeaway / disclaimer chip style used in scenes (PerCuriam leans on this). */
  chip: Chip;
  /** The ONLY gradient allowed anywhere (ReadLark Dawn, end-card hero only). */
  gradient?: { from: string; to: string; angleDeg: number };

  // --- CTA copy (prelaunch flag selects which is live) ---
  cta_prelaunch: string;
  cta_live: string;
  /** Mandatory legal/ethical line (PerCuriam). Shown on end-cards + in every description. */
  disclaimer?: string;
}

export const BRANDS: Record<BrandId, Brand> = {
  readlark: {
    id: "readlark",
    name: "ReadLark",
    wordmark: "ReadLark",
    domain: "readlark.app",
    prelaunch: true,
    min_minutes: 30,
    default_target_minutes: 32,

    paper: "#FAF5EB", // ReadLark Paper (Daybreak) — near-identical to legacy #FAF6EE
    accent: "#F4603E", // Dawn Coral — replaces flame in ReadLark content
    accentOnInk: "#F4603E", // Dawn Coral reads fine on ink bodies (cast accent items)
    accentInk: "#CE3B1A", // Dawn Coral Ink — coral carrying WHITE text
    highlight: "#FFAE3D", // Dawn Amber — marker swipes, chart accents (replaces #FFD95C)

    caption: {
      wash: "#FFD98F", // amber wash behind the current word
      washOpacity: 0.38,
      tick: "#F4603E", // 2px coral tick at the caption line's left edge
    },

    chrome: {
      bg: "#232041", // Indigo Deep
      text: "#FAF5EB",
      chip: { bg: "#CE3B1A", text: "#FFFFFF" }, // coral-ink chip, white text
    },
    chip: { bg: "#FFE7C2", text: "#8A4A1A" },
    gradient: { from: "#F4603E", to: "#FFAE3D", angleDeg: 35 }, // Dawn coral→amber

    cta_prelaunch: "Launching soon — follow for updates",
    cta_live: "Download ReadLark",
  },

  percuriam: {
    id: "percuriam",
    name: "PerCuriam",
    wordmark: "PerCuriam",
    domain: "percuriam.app",
    prelaunch: true,
    min_minutes: 13,
    default_target_minutes: 15,

    paper: "#FAF7F2", // surface.reading
    accent: "#1A2B4A", // brand navy — on-paper emphasis, underlines, badges, chart focal
    accentOnInk: "#A9BBD8", // dark-theme navy — accent items ON characters (deep navy would vanish)
    accentInk: "#1A2B4A", // navy is dark enough to carry white text directly
    highlight: "#F2E3B3", // amber — washes / marker swipes
    divider: "#E7E2DA", // ground lines / card rules in PerCuriam scenes

    caption: {
      wash: "#F2E3B3", // amber wash
      washOpacity: 0.5,
      tick: "#1A2B4A", // navy tick
    },

    chrome: {
      bg: "#1A2B4A",
      text: "#E8E4DE",
      chip: { bg: "#2A2210", text: "#E0B45C" }, // CTA chip
    },
    chip: { bg: "#FDF3DC", text: "#8A5A00" }, // takeaway + disclaimer chip

    cta_prelaunch: "Launching soon — follow for updates",
    cta_live: "Get PerCuriam",
    disclaimer: "Educational content — not legal advice.",
  },
};

export const DEFAULT_BRAND: BrandId = "readlark";

export function getBrand(id: BrandId | undefined | null): Brand {
  return BRANDS[id ?? DEFAULT_BRAND] ?? BRANDS[DEFAULT_BRAND];
}

/** The CTA that is live right now, given the brand's prelaunch flag. */
export function activeCta(brand: Brand): string {
  return brand.prelaunch ? brand.cta_prelaunch : brand.cta_live;
}

/** Long-form runtime floor for a brand (minutes). */
export function brandMinMinutes(id: BrandId | undefined | null): number {
  return getBrand(id).min_minutes;
}
