/**
 * Manual port chart seeder for Nauticam Sony E-mount (N100 / N120) housings.
 *
 * Data sourced visually from Nauticam's "N100 Port System for Sony E-Mount
 * Camera System" port chart PDF (Nauticam document, last updated 2026-03-27).
 *
 * Scope:
 *  - Covers Sony FE / G / GM, Sigma, Tamron, and Zeiss Batis lenses listed
 *    in the N100 Full Frame section of the chart.
 *  - Wet lenses (WACP, FCP, WWL, MWL, CMC, SMC, EMWL) are intentionally
 *    excluded; only traditional dome / flat / fisheye ports are included.
 *  - Extension rings and port adaptors are recorded as ordered
 *    PortChartEntryStep records (housing-side → port-side).
 *
 * Missing entities created by this script (if not already present):
 *  - Camera mount:  "Sony E-mount"
 *  - Camera mount:  "Canon EF"  (for Sigma 14mm f/1.8 DG HSM Art)
 *  - Lens manufacturers: Sony, Sigma, Tamron, Zeiss
 *  - Nauticam port adaptor: "N100 to N120 35.5mm Port Adaptor II" (#37305)
 *    (not captured by the Shopify scraper)
 *  - Nauticam port: "N120 250mm Optical Glass Wide Angle Port" (#18815)
 *    (not captured by the Shopify scraper)
 *  - All lenses referenced in the port chart (upserted by name + mount)
 *
 * Usage:
 *   npx tsx automations/seed_nauticam_port_chart.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

// ─── Slug constants (sourced from nauticam_scraped.json) ───────────────────────

/**
 * N100 to N120 35.5mm Port Adaptor II (Nauticam #37305).
 * This adaptor is used in virtually all N120-system configurations on A7-series housings.
 * It is NOT present in the scraped JSON; the seeder creates it automatically.
 */
const ADAPTOR_35_5_SLUG = "n100-to-n120-355mm-port-adaptor-ii";

const RING_N120: Record<string, string> = {
    "10-ii": "n120-extension-ring-10-ii",
    "20-ii": "n120-extension-ring-20-ii",
    "25-ii": "n120-extension-ring-25-ii",
    "30-ii": "n120-extension-ring-30-ii",
    "35-ii": "n120-extension-ring-35-ii",
    "40-ii": "n120-extension-ring-40-ii",
    "50-ii": "n120-extension-ring-50-ii",
    "55-ii": "n120-extension-ring-55-ii",
    "60-ii": "n120-extension-ring-60-ii",
    "70-ii": "n120-extension-ring-70-ii",
    "80-ii": "n120-extension-ring-80-ii",
    "90-ii": "n120-extension-ring-90-ii",
};

const RING_N100: Record<string, string> = {
    "30": "n100-extension-ring-30",
    "40": "n100-extension-ring-40",
    "50": "n100-extension-ring-50",
    "30-ii": "n100-extension-ring-30-ii",
    "35-ii": "n100-extension-ring-35-ii",
    "40-ii": "n100-extension-ring-40-ii",
    "50-ii": "n100-extension-ring-50-ii",
};

/** Port slugs as they appear in the database after running seed_nauticam.ts. */
const PORT = {
    N120_180MM: "180mm-optical-glass-wide-angle-port",
    N120_230MM: "230mm-optical-glass-fisheye-dome-port-ii",
    N120_250MM: "n120-250mm-optical-glass-wide-angle-port", // not in scraper – created below
    N120_8_5_ACRYLIC: "8-5-acrylic-dome-port-with-shade-and-neoprene-cover",
    N120_140MM_FISHEYE: "n120-140mm-optical-glass-fisheye-port-with-removable-shade",
    N100_180MM: "n100-180mm-optical-glass-wide-angle-port",
    N100_MACRO_55: "n100-macro-port-55",
    N100_MACRO_105: "n100-macro-port-105-for-sony-fe-90mm-f2-8-macro-g-oss-for-na-a7ii-a9",
    N100_MACRO_110: "n100-macro-port-110-for-sony-fe-90mm-f2-8-macro-g-oss-for-a7-r-s",
    N100_MACRO_125: "n100-macro-port-125-for-sony-fe-100mm-f2-8",
    N100_FLAT_32: "n100-flat-port-32-for-sony-fe-28mm-f2-to-use-with-83201-wwl-1-for-na-a7ii-a9",
    N120_MACRO_60: "macro-port-60",
} as const;

// ─── Step types ───────────────────────────────────────────────────────────────

type Step =
    | { kind: "adaptor"; slug: string }
    | { kind: "ring"; slug: string };

const adaptor = (slug: string): Step => ({ kind: "adaptor", slug });
const ring = (slug: string): Step => ({ kind: "ring", slug });

/** Shorthand for the N100→N120 35.5mm Port Adaptor II used in most entries. */
const A = adaptor(ADAPTOR_35_5_SLUG);

// ─── Lens definitions ─────────────────────────────────────────────────────────

interface LensDef {
    name: string;
    /** Manufacturer name, e.g. "Sony", "Sigma". */
    manufacturer: string;
    /** Camera-mount name, e.g. "Sony E-mount". */
    cameraMount: string;
    focalLengthTele: number;
    focalLengthWide?: number;
    isZoomLens: boolean;
}

// ─── Port chart rows ──────────────────────────────────────────────────────────

interface ChartRow {
    lens: LensDef;
    /** Ordered steps from the housing face to the port. May be empty. */
    steps: Step[];
    portSlug: string;
    notes?: string;
}

// Frequently reused lens definitions
const SEL2470GM: LensDef = { name: "Sony FE 24-70mm f/2.8 GM", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 24, focalLengthTele: 70, isZoomLens: true };
const SEL2470GM2: LensDef = { name: "Sony FE 24-70mm f/2.8 GM II", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 24, focalLengthTele: 70, isZoomLens: true };
const SEL2860: LensDef = { name: "Sony FE 28-60mm F4-5.6", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 28, focalLengthTele: 60, isZoomLens: true };
const SEL2870GM: LensDef = { name: "Sony FE 28-70mm f/2 GM", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 28, focalLengthTele: 70, isZoomLens: true };
const SEL50M18: LensDef = { name: "Sony FE 50mm f/1.8", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 50, isZoomLens: false };
const SEL50M28: LensDef = { name: "Sony FE 50mm f/2.8 Macro", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 50, isZoomLens: false };
const SEL55F18Z: LensDef = { name: "Sony Sonnar T* FE 55mm f/1.8 ZA", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 55, isZoomLens: false };
const SEL90M28G: LensDef = { name: "Sony FE 90mm f/2.8 Macro G OSS", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 90, isZoomLens: false };
const FE100MACRO: LensDef = { name: "Sony FE 100mm f/2.8 Macro GM", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 100, isZoomLens: false };
const S105MACRO: LensDef = { name: "Sigma 105mm f/2.8 DG DN Macro Art", manufacturer: "Sigma", cameraMount: "Sony E-mount", focalLengthTele: 105, isZoomLens: false };
const FE2070: LensDef = { name: "Sony FE 20-70mm f/4 G", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 20, focalLengthTele: 70, isZoomLens: true };
const S2470ART: LensDef = { name: "Sigma 24-70mm f/2.8 DG DN Art", manufacturer: "Sigma", cameraMount: "Sony E-mount", focalLengthWide: 24, focalLengthTele: 70, isZoomLens: true };
const TAM2875: LensDef = { name: "Tamron 28-75mm f/2.8 Di III RXD", manufacturer: "Tamron", cameraMount: "Sony E-mount", focalLengthWide: 28, focalLengthTele: 75, isZoomLens: true };
const FE2450G: LensDef = { name: "Sony FE 24-50mm f/2.8 G", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 24, focalLengthTele: 50, isZoomLens: true };
const SEL1224GM: LensDef = { name: "Sony FE 12-24mm f/2.8 GM", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 12, focalLengthTele: 24, isZoomLens: true };
const SEL1224G: LensDef = { name: "Sony FE 12-24mm f/4 G", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 12, focalLengthTele: 24, isZoomLens: true };
const FE14GM: LensDef = { name: "Sony FE 14mm f/1.8 GM", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 14, isZoomLens: false };
const SEL1635GM: LensDef = { name: "Sony FE 16-35mm f/2.8 GM", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 16, focalLengthTele: 35, isZoomLens: true };
const SEL1635GM2: LensDef = { name: "Sony FE 16-35mm f/2.8 GM II", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 16, focalLengthTele: 35, isZoomLens: true };
const SEL1635Z: LensDef = { name: "Sony Vario-Tessar T* FE 16-35mm f/4 ZA OSS", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 16, focalLengthTele: 35, isZoomLens: true };
const FEPZ1635: LensDef = { name: "Sony FE PZ 16-35mm f/4 G", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 16, focalLengthTele: 35, isZoomLens: true };
const FE24GM: LensDef = { name: "Sony FE 24mm f/1.4 GM", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 24, isZoomLens: false };
const FEPZ28135: LensDef = { name: "Sony FE PZ 28-135mm f/4 G OSS", manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthWide: 28, focalLengthTele: 135, isZoomLens: true };
const S14F14DN: LensDef = { name: "Sigma 14mm f/1.4 DG DN Art", manufacturer: "Sigma", cameraMount: "Sony E-mount", focalLengthTele: 14, isZoomLens: false };
const S14F18HSM: LensDef = { name: "Sigma 14mm f/1.8 DG HSM Art", manufacturer: "Sigma", cameraMount: "Canon EF", focalLengthTele: 14, isZoomLens: false };
const S15FISH: LensDef = { name: "Sigma 15mm f/1.4 Fisheye DG DN Art", manufacturer: "Sigma", cameraMount: "Sony E-mount", focalLengthTele: 15, isZoomLens: false };
const S1424: LensDef = { name: "Sigma 14-24mm f/2.8 DG DN", manufacturer: "Sigma", cameraMount: "Sony E-mount", focalLengthWide: 14, focalLengthTele: 24, isZoomLens: true };
const S24F35: LensDef = { name: "Sigma 24mm f/3.5 DG DN", manufacturer: "Sigma", cameraMount: "Sony E-mount", focalLengthTele: 24, isZoomLens: false };
const BATIS18: LensDef = { name: "Zeiss Batis 18mm f/2.8", manufacturer: "Zeiss", cameraMount: "Sony E-mount", focalLengthTele: 18, isZoomLens: false };
// Sony FE 28mm f/2 + conversion lenses are listed as separate entries in the chart
const FE28_21UWC: LensDef = {
    name: "Sony FE 28mm f/2 with 21mm Ultra-Wide Conversion Lens",
    manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 21, isZoomLens: false
};
const FE28_16FISH: LensDef = {
    name: "Sony FE 28mm f/2 with 16mm Fisheye Conversion Lens",
    manufacturer: "Sony", cameraMount: "Sony E-mount", focalLengthTele: 16, isZoomLens: false
};

/**
 * All port chart rows extracted from Nauticam's Sony E-mount N100 port chart
 * PDF (2026-03-27 revision).
 *
 * Steps are ordered housing-side first (adaptor → extension ring → port).
 * Wet-lens configurations (WACP-1/1B/2/C, FCP-1, WWL, MWL, CMC, SMC, EMWL)
 * are excluded per project policy.
 */
const PORT_CHART: ChartRow[] = [

    // ══════════════════════════════════════════════════════════════
    // Sony FE 24-70mm f/2.8 GM  (#SEL2470GM)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL2470GM, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_180MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 24-70mm f/2.8 GM II  (#SEL2470GM2)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL2470GM2, steps: [A, ring(RING_N120["50-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },
    { lens: SEL2470GM2, steps: [A, ring(RING_N120["55-ii"])], portSlug: PORT.N120_180MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 28-60mm F4-5.6  (#SEL2860)
    // ══════════════════════════════════════════════════════════════
    // N100-only path: two N100 Extension Ring 30 II stacked
    {
        lens: SEL2860, steps: [ring(RING_N100["30-ii"]), ring(RING_N100["30-ii"])],
        portSlug: PORT.N100_180MM, notes: "Two N100 Extension Ring 30 II stacked (Nauticam #37430 × 2)"
    },
    // N120 path via port adaptor
    { lens: SEL2860, steps: [A, ring(RING_N120["30-ii"])], portSlug: PORT.N120_180MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 28-70mm f/2 GM  (#SEL2870GM)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL2870GM, steps: [A, ring(RING_N120["80-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 50mm f/1.8  (#SEL50M18)
    // Direct fit – no extension ring required
    // ══════════════════════════════════════════════════════════════
    { lens: SEL50M18, steps: [], portSlug: PORT.N100_MACRO_55 },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 50mm f/2.8 Macro  (#SEL50M28)
    // Chart shows both N100 Extension Ring 40 (#37402) and 40 II (#37432)
    // ══════════════════════════════════════════════════════════════
    {
        lens: SEL50M28, steps: [ring(RING_N100["40"])], portSlug: PORT.N100_FLAT_32,
        notes: "Using N100 Extension Ring 40 (Nauticam #37402)"
    },
    {
        lens: SEL50M28, steps: [ring(RING_N100["40-ii"])], portSlug: PORT.N100_FLAT_32,
        notes: "Using N100 Extension Ring 40 II (Nauticam #37432)"
    },

    // ══════════════════════════════════════════════════════════════
    // Sony Sonnar T* FE 55mm f/1.8 ZA  (#SEL55F18Z)
    // Same port as SEL50M18 – direct fit
    // ══════════════════════════════════════════════════════════════
    { lens: SEL55F18Z, steps: [], portSlug: PORT.N100_MACRO_55 },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 90mm f/2.8 Macro G OSS  (#SEL90M28G)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL90M28G, steps: [], portSlug: PORT.N100_MACRO_105 },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 100mm f/2.8 Macro GM
    // ══════════════════════════════════════════════════════════════
    { lens: FE100MACRO, steps: [], portSlug: PORT.N100_MACRO_125 },
    {
        lens: FE100MACRO, steps: [ring(RING_N100["30-ii"])], portSlug: PORT.N100_MACRO_125,
        notes: "With Sony FE 1.4× Teleconverter"
    },
    {
        lens: FE100MACRO, steps: [ring(RING_N100["30-ii"])], portSlug: PORT.N100_MACRO_125,
        notes: "With Sony FE 2.0× Teleconverter"
    },

    // ══════════════════════════════════════════════════════════════
    // Sigma 105mm f/2.8 DG DN Macro Art
    // ══════════════════════════════════════════════════════════════
    { lens: S105MACRO, steps: [], portSlug: PORT.N100_MACRO_110 },
    {
        lens: S105MACRO, steps: [A, ring(RING_N120["20-ii"])], portSlug: PORT.N120_MACRO_60,
        notes: "N120 path via N100→N120 35.5mm Port Adaptor II"
    },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 20-70mm f/4 G
    // ══════════════════════════════════════════════════════════════
    { lens: FE2070, steps: [A, ring(RING_N120["35-ii"])], portSlug: PORT.N120_180MM },
    { lens: FE2070, steps: [A, ring(RING_N120["40-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sigma 24-70mm f/2.8 DG DN Art
    // ══════════════════════════════════════════════════════════════
    { lens: S2470ART, steps: [A, ring(RING_N120["55-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Tamron 28-75mm f/2.8 Di III RXD
    // ══════════════════════════════════════════════════════════════
    { lens: TAM2875, steps: [A, ring(RING_N120["50-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 24-50mm f/2.8 G
    // ══════════════════════════════════════════════════════════════
    { lens: FE2450G, steps: [A, ring(RING_N120["50-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },
    {
        lens: FE2450G, steps: [ring(RING_N100["50-ii"]), ring(RING_N100["35-ii"])], portSlug: PORT.N100_180MM,
        notes: "N100-only path: N100 Extension Ring 50 II + N100 Extension Ring 35 II (#37433 + #37431)"
    },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 12-24mm f/2.8 GM  (#SEL1224GM)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL1224GM, steps: [A, ring(RING_N120["55-ii"])], portSlug: PORT.N120_230MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 12-24mm f/4 G  (#SEL1224G)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL1224G, steps: [A, ring(RING_N120["40-ii"])], portSlug: PORT.N120_230MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 14mm f/1.8 GM
    // ══════════════════════════════════════════════════════════════
    { lens: FE14GM, steps: [A, ring(RING_N120["20-ii"])], portSlug: PORT.N120_180MM },
    { lens: FE14GM, steps: [A, ring(RING_N120["30-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 16-35mm f/2.8 GM  (#SEL1635GM)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL1635GM, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_180MM },
    { lens: SEL1635GM, steps: [A, ring(RING_N120["70-ii"])], portSlug: PORT.N120_230MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 16-35mm f/2.8 GM II  (#SEL1635GM2)
    // ══════════════════════════════════════════════════════════════
    { lens: SEL1635GM2, steps: [A, ring(RING_N120["50-ii"])], portSlug: PORT.N120_180MM },
    { lens: SEL1635GM2, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sony Vario-Tessar T* FE 16-35mm f/4 ZA OSS  (#SEL1635Z)
    // ══════════════════════════════════════════════════════════════
    // N100-only path: two different rings stacked
    {
        lens: SEL1635Z, steps: [ring(RING_N100["30-ii"]), ring(RING_N100["50-ii"])],
        portSlug: PORT.N100_180MM,
        notes: "N100-only path: N100 Extension Ring 30 II + N100 Extension Ring 50 II (#37430 + #37433)"
    },
    // N120 paths
    { lens: SEL1635Z, steps: [A, ring(RING_N120["50-ii"])], portSlug: PORT.N120_180MM },
    { lens: SEL1635Z, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_230MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE PZ 16-35mm f/4 G
    // ══════════════════════════════════════════════════════════════
    {
        lens: FEPZ1635, steps: [ring(RING_N100["50-ii"])], portSlug: PORT.N100_180MM,
        notes: "Only compatible with N100 180mm port SN:A525549 onwards (#37129)"
    },
    { lens: FEPZ1635, steps: [A, ring(RING_N120["25-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },
    { lens: FEPZ1635, steps: [A, ring(RING_N120["20-ii"])], portSlug: PORT.N120_180MM },
    {
        lens: FEPZ1635, steps: [A, ring(RING_N120["35-ii"])], portSlug: PORT.N120_250MM,
        notes: "250mm Optical Glass Wide Angle Port (Nauticam #18815)"
    },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 24mm f/1.4 GM
    // ══════════════════════════════════════════════════════════════
    { lens: FE24GM, steps: [A, ring(RING_N120["40-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sony FE PZ 28-135mm f/4 G OSS
    // ══════════════════════════════════════════════════════════════
    { lens: FEPZ28135, steps: [A, ring(RING_N120["90-ii"])], portSlug: PORT.N120_230MM },

    // ══════════════════════════════════════════════════════════════
    // Sigma 14mm f/1.4 DG DN Art  (native Sony E-mount)
    // ══════════════════════════════════════════════════════════════
    { lens: S14F14DN, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_180MM },
    { lens: S14F14DN, steps: [A, ring(RING_N120["70-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sigma 14mm f/1.8 DG HSM Art  (Canon EF mount, used via Metabones/MC-11)
    // ══════════════════════════════════════════════════════════════
    {
        lens: S14F18HSM, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_180MM,
        notes: "Requires Sigma MC-11 or Metabones Smart Adaptor for Sony E-mount"
    },
    {
        lens: S14F18HSM, steps: [A, ring(RING_N120["70-ii"])], portSlug: PORT.N120_8_5_ACRYLIC,
        notes: "Requires Sigma MC-11 or Metabones Smart Adaptor for Sony E-mount"
    },

    // ══════════════════════════════════════════════════════════════
    // Sigma 15mm f/1.4 Fisheye DG DN Art  (native Sony E-mount)
    // ══════════════════════════════════════════════════════════════
    {
        lens: S15FISH, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_8_5_ACRYLIC,
        notes: "AF-C focus mode recommended to avoid focus shift"
    },

    // ══════════════════════════════════════════════════════════════
    // Sigma 14-24mm f/2.8 DG DN  (native Sony E-mount)
    // ══════════════════════════════════════════════════════════════
    { lens: S1424, steps: [A, ring(RING_N120["40-ii"])], portSlug: PORT.N120_180MM },
    {
        lens: S1424, steps: [A, ring(RING_N120["50-ii"])], portSlug: PORT.N120_250MM,
        notes: "250mm Optical Glass Wide Angle Port (Nauticam #18815)"
    },
    { lens: S1424, steps: [A, ring(RING_N120["60-ii"])], portSlug: PORT.N120_8_5_ACRYLIC },

    // ══════════════════════════════════════════════════════════════
    // Sigma 24mm f/3.5 DG DN  (native Sony E-mount)
    // ══════════════════════════════════════════════════════════════
    {
        lens: S24F35, steps: [ring(RING_N100["50-ii"])], portSlug: PORT.N100_180MM,
        notes: "N100-only path (#37433)"
    },
    { lens: S24F35, steps: [A, ring(RING_N120["20-ii"])], portSlug: PORT.N120_180MM },

    // ══════════════════════════════════════════════════════════════
    // Zeiss Batis 18mm f/2.8  (native Sony E-mount)
    // ══════════════════════════════════════════════════════════════
    { lens: BATIS18, steps: [A, ring(RING_N120["20-ii"])], portSlug: PORT.N120_180MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 28mm f/2 + Sony 21mm Ultra-Wide Conversion Lens
    // ══════════════════════════════════════════════════════════════
    { lens: FE28_21UWC, steps: [A, ring(RING_N120["30-ii"])], portSlug: PORT.N120_180MM },

    // ══════════════════════════════════════════════════════════════
    // Sony FE 28mm f/2 + Sony 16mm Fisheye Conversion Lens
    // ══════════════════════════════════════════════════════════════
    { lens: FE28_16FISH, steps: [A, ring(RING_N120["30-ii"])], portSlug: PORT.N120_140MM_FISHEYE },

];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log("=== Nauticam port chart seeder (Sony E-mount, N100/N120) ===");
    console.log(`Rows to process: ${PORT_CHART.length}`);
    console.log();

    // ── 1. Nauticam manufacturer ──────────────────────────────────────────────
    const nauticam = await prisma.manufacturer.upsert({
        where: { slug: "nauticam" },
        update: {},
        create: {
            name: "Nauticam",
            slug: "nauticam",
            description: "Premium underwater housings and accessories for professional photography",
        },
    });
    console.log(`✅ Manufacturer: ${nauticam.name} (id=${nauticam.id})`);

    // ── 2. Camera mounts ──────────────────────────────────────────────────────
    const eMountDef = { name: "Sony E-mount", slug: "sony-e-mount" };
    const canonEFDef = { name: "Canon EF", slug: "canon-ef" };

    const eMount = await prisma.cameraMount.upsert({ where: { slug: eMountDef.slug }, update: {}, create: eMountDef });
    const canonEF = await prisma.cameraMount.upsert({ where: { slug: canonEFDef.slug }, update: {}, create: canonEFDef });

    const mountMap = new Map<string, number>([
        ["Sony E-mount", eMount.id],
        ["Canon EF", canonEF.id],
    ]);
    console.log(`✅ Camera mounts: ${eMount.name} (id=${eMount.id}), ${canonEF.name} (id=${canonEF.id})`);

    // ── 3. Lens manufacturers ─────────────────────────────────────────────────
    const lensManufacturerNames = ["Sony", "Sigma", "Tamron", "Zeiss"];
    const lensManufacturers = new Map<string, number>();

    for (const mfrName of lensManufacturerNames) {
        const slug = toSlug(mfrName);
        const mfr = await prisma.manufacturer.upsert({
            where: { slug },
            update: {},
            create: { name: mfrName, slug },
        });
        lensManufacturers.set(mfrName, mfr.id);
    }
    console.log(`✅ Lens manufacturers: ${lensManufacturerNames.join(", ")}`);

    // ── 4. Nauticam housing mounts (must already exist after seed_nauticam.ts) ─
    const n100Mount = await prisma.housingMount.findUnique({ where: { slug: "n100" } });
    const n120Mount = await prisma.housingMount.findUnique({ where: { slug: "n120" } });

    if (!n100Mount || !n120Mount) {
        console.error("❌ N100 / N120 housing mounts not found. Run seed_nauticam.ts first.");
        process.exit(1);
    }
    console.log(`✅ Housing mounts: N100 (id=${n100Mount.id}), N120 (id=${n120Mount.id})`);

    // ── 5. Supplemental port adaptor: N100→N120 35.5mm Port Adaptor II ────────
    const adaptor355 = await prisma.portAdapter.upsert({
        where: { slug: ADAPTOR_35_5_SLUG },
        update: {},
        create: {
            name: "N100 to N120 35.5mm Port Adaptor II",
            slug: ADAPTOR_35_5_SLUG,
            description: "Nauticam #37305 — standard port adaptor for N100-mount Sony A7-series housings to N120 port system",
            manufacturerId: nauticam.id,
            inputHousingMountId: n100Mount.id,
            outputHousingMountId: n120Mount.id,
        },
    });
    console.log(`✅ Port adaptor: ${adaptor355.name} (id=${adaptor355.id})`);

    // ── 6. Supplemental port: N120 250mm Optical Glass Wide Angle Port ─────────
    const port250mm = await prisma.port.upsert({
        where: { slug: PORT.N120_250MM },
        update: {},
        create: {
            name: "N120 250mm Optical Glass Wide Angle Port",
            slug: PORT.N120_250MM,
            description: "Nauticam #18815 — large 250mm optical glass wide-angle dome port for N120 port system",
            manufacturerId: nauticam.id,
            housingMountId: n120Mount.id,
            isFlatPort: false,
            hemisphereWidth: 250,
        },
    });
    console.log(`✅ Supplemental port: ${port250mm.name} (id=${port250mm.id})`);

    // ── 7. Build lookup maps for rings and ports ───────────────────────────────
    const allRings = await prisma.extensionRing.findMany({ select: { id: true, slug: true } });
    const ringMap = new Map(allRings.map((r) => [r.slug, r.id]));

    const allPorts = await prisma.port.findMany({ select: { id: true, slug: true } });
    const portMap = new Map(allPorts.map((p) => [p.slug, p.id]));

    // Include the adaptor we just created/found
    const allAdaptors = await prisma.portAdapter.findMany({ select: { id: true, slug: true } });
    const adaptorMap = new Map(allAdaptors.map((a) => [a.slug, a.id]));

    // ── 8. Process port chart rows ────────────────────────────────────────────
    let created = 0;
    let skippedDupe = 0;
    let skippedMissing = 0;

    for (const row of PORT_CHART) {
        // 8a. Upsert the lens
        const mountId = mountMap.get(row.lens.cameraMount);
        const mfrId = lensManufacturers.get(row.lens.manufacturer);
        if (!mountId || !mfrId) {
            console.warn(`  ⚠ Unknown camera mount or manufacturer for "${row.lens.name}" — skipped`);
            skippedMissing++;
            continue;
        }

        const lensSlug = toSlug(row.lens.name);
        const lens = await prisma.lens.upsert({
            where: { slug: lensSlug },
            update: {},
            create: {
                name: row.lens.name,
                slug: lensSlug,
                manufacturerId: mfrId,
                cameraMountId: mountId,
                focalLengthTele: row.lens.focalLengthTele,
                focalLengthWide: row.lens.focalLengthWide ?? null,
                isZoomLens: row.lens.isZoomLens,
            },
        });

        // 8b. Resolve the terminal port
        const portId = portMap.get(row.portSlug);
        if (!portId) {
            console.warn(`  ⚠ Port slug not found: "${row.portSlug}" for lens "${row.lens.name}" — skipped`);
            skippedMissing++;
            continue;
        }

        // 8c. Resolve all steps and verify they exist in the DB
        let stepsFailed = false;
        const resolvedSteps: Array<{ extensionRingId?: number; portAdapterId?: number; order: number }> = [];

        for (let i = 0; i < row.steps.length; i++) {
            const step = row.steps[i];

            if (step.kind === "adaptor") {
                const adaptorId = adaptorMap.get(step.slug);
                if (!adaptorId) {
                    console.warn(`  ⚠ Port adaptor slug not found: "${step.slug}" for lens "${row.lens.name}" — skipped`);
                    stepsFailed = true;
                    break;
                }
                resolvedSteps.push({ portAdapterId: adaptorId, order: i });

            } else {
                const ringId = ringMap.get(step.slug);
                if (!ringId) {
                    console.warn(`  ⚠ Extension ring slug not found: "${step.slug}" for lens "${row.lens.name}" — skipped`);
                    stepsFailed = true;
                    break;
                }
                resolvedSteps.push({ extensionRingId: ringId, order: i });
            }
        }

        if (stepsFailed) {
            skippedMissing++;
            continue;
        }

        // 8d. Idempotency check: look for an existing entry with the same
        //     manufacturer + lens + port + identical step fingerprint.
        //     We use a simple ordered-slug fingerprint for the steps.
        const stepFingerprint = row.steps
            .map((s) => `${s.kind}:${s.slug}`)
            .join("|");

        const existing = await prisma.portChartEntry.findFirst({
            where: { manufacturerId: nauticam.id, lensId: lens.id, portId },
            include: { steps: { orderBy: { order: "asc" } } },
        });

        if (existing) {
            const existingFingerprint = existing.steps.map((s) => {
                if (s.portAdapterId) {
                    const a = allAdaptors.find((x) => x.id === s.portAdapterId);
                    return `adaptor:${a?.slug ?? s.portAdapterId}`;
                }
                const r = allRings.find((x) => x.id === s.extensionRingId);
                return `ring:${r?.slug ?? s.extensionRingId}`;
            }).join("|");

            if (existingFingerprint === stepFingerprint) {
                skippedDupe++;
                continue;
            }
            // Same lens+port but different steps → create an additional entry
        }

        // 8e. Create the PortChartEntry with its steps
        await prisma.portChartEntry.create({
            data: {
                manufacturerId: nauticam.id,
                lensId: lens.id,
                portId,
                notes: row.notes ?? null,
                steps: {
                    create: resolvedSteps,
                },
            },
        });
        created++;
    }

    console.log();
    console.log("=== Port chart seeding complete ===");
    console.log(`  ✅ Created:          ${created}`);
    console.log(`  ⏭  Skipped (dupe):   ${skippedDupe}`);
    console.log(`  ⚠  Skipped (missing): ${skippedMissing}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
